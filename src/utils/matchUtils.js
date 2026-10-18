// Filename → work matching for bulk photo import.

// Normalize a filename or title into comparable tokens.
export function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .replace(/\.[^.]+$/, '') // strip extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // non-alphanumeric runs → single space
    .trim()
    .replace(/\s+/g, ' ');
}

function compact(s) {
  return s.replace(/\s+/g, '');
}

// Generate candidate base names from a filename by peeling trailing photo
// indices ("Sunset-01" → "Sunset", "INV-003-2" → "INV-003" → "INV" is NOT
// peeled further because we test each candidate against known keys instead of
// blindly stripping).
function candidateBases(name) {
  const out = [name];
  let b = name.replace(/[-_ ]\d{1,4}$/, '').trim();
  if (b && b !== name) out.push(b);
  b = name.replace(/\s*\(\d+\)$/, '').trim();
  if (b && b !== name) out.push(b);
  return [...new Set(out)];
}

function makeWork(type, w) {
  const title = normalizeName(w.title);
  const inv = normalizeName(w.inventory_number);
  return {
    id: w.id,
    type, // 'artwork' | 'digital'
    title: w.title,
    inventoryNumber: w.inventory_number,
    titleKey: title,
    invKey: inv,
    titleCompact: compact(title),
    invCompact: compact(inv),
    hasImages: Array.isArray(w.images) && w.images.length > 0,
  };
}

// Build a flat, searchable index from physical + digital works.
export function buildWorkIndex(artworks, digitalWorks) {
  const works = [];
  for (const a of artworks || []) works.push(makeWork('artwork', a));
  for (const d of digitalWorks || []) works.push(makeWork('digital', d));
  return works;
}

// Match a single filename against the work index.
// Returns { status: 'matched'|'ambiguous'|'unmatched', match?, candidates }
export function matchPhoto(filename, works) {
  const name = normalizeName(filename);
  if (!name) return { status: 'unmatched', candidates: [] };

  const scored = [];
  for (const w of works) {
    let score = 0;
    for (const base of candidateBases(name)) {
      const bc = compact(base);
      if (w.invKey && base === w.invKey) score = Math.max(score, 100);
      else if (w.titleKey && base === w.titleKey) score = Math.max(score, 90);
      else if (w.invCompact && bc === w.invCompact) score = Math.max(score, 80);
      else if (w.titleCompact && bc === w.titleCompact) score = Math.max(score, 70);
    }

    // Fallbacks: containment / prefix, only when no structural match above.
    if (score === 0) {
      for (const key of [w.invKey, w.titleKey]) {
        if (!key || key.length < 3) continue;
        if (name.includes(key) || key.includes(name)) score = Math.max(score, 55);
        else if (name.startsWith(key)) score = Math.max(score, 50);
      }
    }

    if (score >= 50) scored.push({ work: w, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return { status: 'unmatched', candidates: [] };
  if (top.score >= 90) return { status: 'matched', match: top, candidates: scored };
  if (scored.length > 1 && scored[1].score === top.score) {
    return { status: 'ambiguous', match: null, candidates: scored.slice(0, 5) };
  }
  if (top.score >= 55) return { status: 'matched', match: top, candidates: scored };
  return { status: 'unmatched', match: null, candidates: scored.slice(0, 5) };
}
