import { useState, useEffect, useMemo } from 'react';
import { artworkAPI, statementAPI, generatePortfolioPDF, getImageURL } from '../utils/api';

function PortfolioBuilder() {
  const [artworks, setArtworks] = useState([]);
  const [statements, setStatements] = useState([]);
  const [artworkImages, setArtworkImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Config
  const [artistName, setArtistName] = useState('');
  const [portfolioTitle, setPortfolioTitle] = useState('Portfolio');
  const [statementId, setStatementId] = useState('');
  const [includePrice, setIncludePrice] = useState(false);
  const [includeStatus, setIncludeStatus] = useState(false);

  // Artwork selection
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [artworkData, statementData] = await Promise.all([
        artworkAPI.getAll(),
        statementAPI.getAll(),
      ]);
      setArtworks(artworkData);
      setStatements(statementData);

      // Default statement to first active one
      const active = statementData.find(s => s.is_active);
      if (active) setStatementId(String(active.id));

      // Load thumbnails
      const images = {};
      for (const a of artworkData) {
        if (a.images?.length > 0) {
          const primary = a.images.find(i => i.is_primary) || a.images[0];
          if (primary?.file_path) images[a.id] = getImageURL(primary.file_path);
        }
      }
      setArtworkImages(images);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => artworks.filter(a => {
    if (filterStatus && a.sale_status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.title?.toLowerCase().includes(s) || a.medium?.toLowerCase().includes(s);
    }
    return true;
  }), [artworks, search, filterStatus]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(filtered.map(a => a.id))); }
  function deselectAll() { setSelected(new Set()); }

  async function handleGenerate() {
    if (selected.size === 0) { setError('Select at least one artwork.'); return; }
    setError(null);
    setGenerating(true);
    try {
      await generatePortfolioPDF({
        artwork_ids: Array.from(selected),
        artist_name: artistName,
        portfolio_title: portfolioTitle,
        statement_id: statementId ? parseInt(statementId) : null,
        include_price: includePrice,
        include_status: includeStatus,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>;

  const selectedList = artworks.filter(a => selected.has(a.id));

  return (
    <div>
      <div className="page-header">
        <h2>Portfolio Builder</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {success && <span style={{ fontSize: '13px', color: 'var(--success)' }}>✓ PDF downloaded</span>}
          {error && <span style={{ fontSize: '13px', color: 'var(--danger)' }}>✕ {error}</span>}
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || selected.size === 0}
          >
            {generating ? 'Generating…' : `Generate PDF (${selected.size} work${selected.size !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left: Config panel */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>Details</div>

            <div className="form-group">
              <label>Portfolio Title</label>
              <input className="form-control" value={portfolioTitle} onChange={e => setPortfolioTitle(e.target.value)} placeholder="Portfolio" />
            </div>

            <div className="form-group">
              <label>Artist Name</label>
              <input className="form-control" value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Artist Statement</label>
              <select className="form-control" value={statementId} onChange={e => setStatementId(e.target.value)}>
                <option value="">— None —</option>
                {statements.map(s => (
                  <option key={s.id} value={s.id}>{s.version_name} ({s.word_count}w)</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>Include in PDF</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={includePrice} onChange={e => setIncludePrice(e.target.checked)} />
              Price
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={includeStatus} onChange={e => setIncludeStatus(e.target.checked)} />
              Sale Status
            </label>
          </div>

          {selected.size > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Selected ({selected.size})
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedList.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                      {artworkImages[a.id] && <img src={artworkImages[a.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title || 'Untitled'}
                    </span>
                    <button
                      onClick={() => toggle(a.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: '14px', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Artwork selection grid */}
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
            <input
              className="form-control"
              placeholder="Search artworks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
            <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: '160px' }}>
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="on-loan">On Loan</option>
              <option value="not-for-sale">Not for Sale</option>
            </select>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>
              {filtered.length} works
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
              {selected.size > 0 && <button className="btn btn-secondary btn-sm" onClick={deselectAll}>Deselect All</button>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {filtered.map(artwork => {
              const isSelected = selected.has(artwork.id);
              return (
                <div
                  key={artwork.id}
                  onClick={() => toggle(artwork.id)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.7,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--accent)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, zIndex: 1 }}>
                      ✓
                    </div>
                  )}
                  <div style={{ aspectRatio: '4/3', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    {artworkImages[artwork.id]
                      ? <img src={artworkImages[artwork.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.3 }}>🖼️</div>
                    }
                  </div>
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {artwork.title || 'Untitled'}
                    </div>
                    {artwork.creation_date && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(artwork.creation_date).getFullYear()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              No artworks match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioBuilder;
