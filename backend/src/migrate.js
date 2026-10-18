#!/usr/bin/env node
/**
 * Idempotent database migration runner for Art Catalog.
 *
 * Usage:
 *   node src/migrate.js             # apply any pending migrations, in order
 *   node src/migrate.js --baseline  # record the current manifest as applied
 *                                   #   WITHOUT running it (one-time adoption
 *                                   #   of an already-migrated database)
 *
 * Migrations are tracked in a `schema_migrations` table. Each migration file
 * is applied exactly once, inside a transaction, and recorded on success.
 * A failure aborts with a non-zero exit code (no silent skipping).
 *
 * The order in MIGRATIONS below is historical application order. Some files
 * predate the numbered convention and are not alphabetical — do NOT reorder
 * without re-baselining affected databases.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Historical application order (matches original deploy order).
const MIGRATIONS = [
  '001_add_sales.sql',
  '002_add_tags.sql',
  '003_add_provenance_tracking.sql',
  '004_add_publications.sql',
  'add-series-table.sql',
  'add-is-public-column.sql',
  '005_add_artist_statements.sql',
  '006_add_print_editions.sql',
  '007_drop_sales_edition_number.sql',
];

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

async function main() {
  const baseline = process.argv.includes('--baseline');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    fail('DATABASE_URL is not set. Run from the backend container or set it in your environment.');
  }

  // Sanity-check the manifest against the files on disk.
  const onDisk = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const missing = MIGRATIONS.filter((f) => !onDisk.includes(f));
  const unknown = onDisk.filter((f) => !MIGRATIONS.includes(f));
  if (missing.length) {
    fail(`Manifest references missing files: ${missing.join(', ')}`);
  }
  if (unknown.length) {
    fail(
      `Unregistered migration file(s) on disk: ${unknown.join(', ')}.\n` +
        'Add any new migration to the MIGRATIONS list in migrate.js before deploying.'
    );
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    if (baseline) {
      console.log('[baseline] Marking the following as already applied (SQL will NOT run):');
      for (const f of MIGRATIONS) {
        console.log(`  ${applied.has(f) ? '(already recorded)' : '●'} ${f}`);
      }
      for (const f of MIGRATIONS) {
        if (!applied.has(f)) {
          await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
        }
      }
      console.log(`\n✅ Baseline complete. ${MIGRATIONS.length} migration(s) recorded.`);
      return;
    }

    const pending = MIGRATIONS.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log(`✅ No pending migrations (${MIGRATIONS.length} recorded).`);
      return;
    }

    console.log(`Applying ${pending.length} pending migration(s)...`);
    for (const f of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log(`  ✅ ${f}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`  ❌ ${f}: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log('✅ Migrations complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});