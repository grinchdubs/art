import React, { useState, useEffect } from 'react';
import { migrateData, exportIndexedDBData, migrationStatus } from '../utils/migration';
import './MigrationPanel.css';

function MigrationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({
    images: { total: 0, migrated: 0 },
    artworks: { total: 0, migrated: 0 },
    digitalWorks: { total: 0, migrated: 0 },
    exhibitions: { total: 0, migrated: 0 },
  });

  // Poll migration status while migrating
  useEffect(() => {
    if (!migrating) return;

    const interval = setInterval(() => {
      setStats({
        images: { ...migrationStatus.progress.images },
        artworks: { ...migrationStatus.progress.artworks },
        digitalWorks: { ...migrationStatus.progress.digitalWorks },
        exhibitions: { ...migrationStatus.progress.exhibitions },
      });
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [migrating]);

  const handleMigrate = async () => {
    if (!confirm('This will migrate all your data from browser storage to the PostgreSQL database. Make sure the backend server is running. Continue?')) {
      return;
    }

    setMigrating(true);
    setProgress('Starting migration...');
    setResult(null);

    try {
      const migrationResult = await migrateData((message) => {
        setProgress(message);
      });

      setResult(migrationResult);
      setMigrating(false);

      if (migrationResult.success) {
        alert('Migration completed successfully! You can now safely use the application with PostgreSQL backend.');
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
      setMigrating(false);
      alert(`Migration failed: ${error.message}`);
    }
  };

  const handleExportBackup = () => {
    exportIndexedDBData();
  };

  if (!isOpen) {
    return (
      <button
        className="migration-toggle-btn"
        onClick={() => setIsOpen(true)}
        title="Data Migration"
      >
        🔄 Migrate to PostgreSQL
      </button>
    );
  }

  return (
    <div className="migration-panel-overlay">
      <div className="migration-panel">
        <div className="migration-header">
          <h2>Data Migration</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="migration-content">
          <div className="migration-info">
            <h3>Migrate to PostgreSQL Backend</h3>
            <p>
              Currently, all your data is stored in your browser's IndexedDB (local storage).
              This migration will transfer all your artworks, digital works, exhibitions, and images
              to a PostgreSQL database running in Docker.
            </p>

            <div className="migration-benefits">
              <h4>Benefits:</h4>
              <ul>
                <li>✓ Data persists even if you clear browser cache</li>
                <li>✓ Accessible from multiple devices</li>
                <li>✓ Better performance and reliability</li>
                <li>✓ Automatic backups with Docker volumes</li>
              </ul>
            </div>

            <div className="migration-warning">
              <strong>Important:</strong> Make sure the backend server is running before migrating.
              You can start it with: <code>docker-compose up</code>
            </div>
          </div>

          <div className="migration-actions">
            <button
              className="btn-primary"
              onClick={handleMigrate}
              disabled={migrating}
            >
              {migrating ? 'Migrating...' : 'Start Migration'}
            </button>

            <button
              className="btn-secondary"
              onClick={handleExportBackup}
              disabled={migrating}
            >
              Export Backup (JSON)
            </button>
          </div>

          {progress && (
            <div className="migration-progress">
              <p>{progress}</p>
              {migrating && (
                <div className="progress-stats">
                  <div>Images: {stats.images.migrated}/{stats.images.total}</div>
                  <div>Artworks: {stats.artworks.migrated}/{stats.artworks.total}</div>
                  <div>Digital Works: {stats.digitalWorks.migrated}/{stats.digitalWorks.total}</div>
                  <div>Exhibitions: {stats.exhibitions.migrated}/{stats.exhibitions.total}</div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className={`migration-result ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <>
                  <h4>✓ Migration Completed Successfully!</h4>
                  <div className="migration-summary">
                    <p>Migrated:</p>
                    <ul>
                      <li>Artworks: {result.summary.artworks}</li>
                      <li>Digital Works: {result.summary.digitalWorks}</li>
                      <li>Exhibitions: {result.summary.exhibitions}</li>
                      <li>Images: {result.summary.images}</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <h4>✗ Migration Failed</h4>
                  <p>{result.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MigrationPanel;
