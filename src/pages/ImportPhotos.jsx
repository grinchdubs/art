import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { artworkAPI, digitalWorkAPI, galleryAPI, importAPI } from '../utils/api';
import { buildWorkIndex, matchPhoto } from '../utils/matchUtils';
import ImmichBrowser from '../components/ImmichBrowser';

const STATUS_LABEL = {
  matched: 'Matched',
  ambiguous: 'Check match',
  unmatched: 'No match',
};

function ImportPhotos() {
  const [works, setWorks] = useState([]);
  const [worksLoading, setWorksLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [immichOpen, setImmichOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [artworks, digitalWorks] = await Promise.all([
          artworkAPI.getAll(),
          digitalWorkAPI.getAll(),
        ]);
        setWorks(buildWorkIndex(artworks, digitalWorks));
      } catch (e) {
        console.error('Failed to load works:', e);
        setError('Failed to load works for matching.');
      } finally {
        setWorksLoading(false);
      }
    })();
  }, []);

  const addFiles = useCallback((newFiles) => {
    const imageFiles = Array.from(newFiles).filter((f) => f.type && f.type.startsWith('image/'));
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.file.name + '|' + f.file.size));
      const additions = [];
      for (const file of imageFiles) {
        if (existing.has(file.name + '|' + file.size)) continue;
        const res = matchPhoto(file.name, works);
        const isMatched = res.status === 'matched' && res.match;
        additions.push({
          id: Math.random().toString(36).slice(2),
          file,
          preview: URL.createObjectURL(file),
          name: file.name,
          action: isMatched ? 'attach' : 'queue',
          work: isMatched ? { id: res.match.work.id, type: res.match.work.type } : null,
          status: res.status,
          candidates: res.candidates,
        });
      }
      return [...prev, ...additions];
    });
  }, [works]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(id) {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  }

  function setAction(id, action) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, action } : f)));
  }

  function setWork(id, workRef) {
    // workRef is "type:id" or ""
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (!workRef) return { ...f, action: 'queue', work: null };
        const [type, workId] = workRef.split(':');
        return { ...f, action: 'attach', work: { id: Number(workId), type } };
      })
    );
  }

  const workOptions = useMemo(() => {
    const physical = works.filter((w) => w.type === 'artwork').sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const digital = works.filter((w) => w.type === 'digital').sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return { physical, digital };
  }, [works]);

  function workLabel(w) {
    const inv = w.inventoryNumber ? ` · ${w.inventoryNumber}` : '';
    return `${w.title || '(untitled)'}${inv}`;
  }

  async function handleApply() {
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    setSummary(null);
    setProgress({ done: 0, total: files.length });

    try {
      // 1. Upload every photo into the gallery pool (chunked for large batches).
      const uploaded = [];
      const CHUNK = 100;
      for (let i = 0; i < files.length; i += CHUNK) {
        const chunk = files.slice(i, i + CHUNK).map((f) => f.file);
        const res = await galleryAPI.uploadBatch(chunk);
        uploaded.push(...res.images);
        setProgress({ done: Math.min(i + CHUNK, files.length), total: files.length });
      }

      // 2. Group "attach" files by target work, preserving order.
      const byWork = new Map();
      files.forEach((f, idx) => {
        if (f.action === 'attach' && f.work) {
          const key = `${f.work.type}:${f.work.id}`;
          if (!byWork.has(key)) byWork.set(key, { type: f.work.type, workId: f.work.id, imageIds: [] });
          byWork.get(key).imageIds.push(uploaded[idx].id);
        }
      });

      const attachments = Array.from(byWork.values());
      let attachResult = null;
      if (attachments.length > 0) {
        attachResult = await importAPI.attach(attachments);
      }

      const queuedCount = files.filter((f) => f.action !== 'attach').length;
      setSummary({
        attached: attachments.reduce((n, a) => n + a.imageIds.length, 0),
        works: attachments.length,
        queued: queuedCount,
        attachResult,
      });

      // Clear the batch but keep the summary visible.
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
    } catch (e) {
      console.error('Import failed:', e);
      setError(e.message || 'Import failed');
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0 });
    }
  }

  function renderWorkSelect(f) {
    const value = f.work ? `${f.work.type}:${f.work.id}` : '';
    return (
      <select
        value={value}
        onChange={(e) => setWork(f.id, e.target.value)}
        style={selectStyle}
      >
        <option value="">— Queue (unassigned) —</option>
        <optgroup label="Physical works">
          {workOptions.physical.map((w) => (
            <option key={`a:${w.id}`} value={`artwork:${w.id}`}>{workLabel(w)}</option>
          ))}
        </optgroup>
        <optgroup label="Digital works">
          {workOptions.digital.map((w) => (
            <option key={`d:${w.id}`} value={`digital:${w.id}`}>{workLabel(w)}</option>
          ))}
        </optgroup>
      </select>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '26px' }}>Import Photos</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          Add photos in bulk, auto-matched to your existing works by filename. Unmatched photos are
          uploaded to the gallery and queued as “unassigned” for later.
        </p>
      </div>

      {worksLoading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading works…</div>
      ) : (
        <>
          {files.length === 0 && !summary && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '60px 20px',
                textAlign: 'center',
                background: dragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                transition: 'all var(--transition)',
              }}
            >
              <div style={{ fontSize: '40px', opacity: 0.4, marginBottom: '12px' }}>🖼️</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>
                Drop a folder or files here
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                Filenames like <code>INV-003-1.jpg</code> or <code>Sunset-02.jpg</code> will auto-match to a work.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                  Choose files
                </button>
                <button className="btn btn-secondary" onClick={() => folderInputRef.current?.click()}>
                  Choose folder
                </button>
                <button className="btn btn-secondary" onClick={() => setImmichOpen(true)}>
                  📷 From Immich
                </button>
              </div>
            </div>
          )}

          {summary && (
            <div style={{
              padding: '16px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>✅ Import complete</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Attached {summary.attached} photo{summary.attached !== 1 ? 's' : ''} to {summary.works} work{summary.works !== 1 ? 's' : ''}
                {summary.queued > 0 && <> · {summary.queued} queued as unassigned</>}.
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => setSummary(null)}>
                  Import more
                </button>
                <Link className="btn btn-secondary" to="/gallery" style={{ textDecoration: 'none' }}>
                  Open Gallery
                </Link>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {files.length} photo{files.length !== 1 ? 's' : ''} ready
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>+ Files</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => folderInputRef.current?.click()}>+ Folder</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setImmichOpen(true)}>📷 Immich</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {files.map((f) => (
                  <div key={f.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0a0a0a' }}>
                      <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => removeFile(f.id)}
                        style={{
                          position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)',
                          border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer',
                          color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }} title={f.name}>
                        {f.name}
                      </div>
                      <div style={{
                        display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        marginBottom: '8px',
                        background: f.status === 'matched' ? 'rgba(46,160,67,0.15)' : f.status === 'ambiguous' ? 'rgba(230,180,30,0.2)' : 'rgba(191,75,75,0.15)',
                        color: f.status === 'matched' ? 'var(--success, #2ea043)' : f.status === 'ambiguous' ? '#d4a017' : 'var(--danger, #bf4b4b)',
                      }}>
                        {STATUS_LABEL[f.status]}
                      </div>
                      {f.action === 'attach' ? renderWorkSelect(f) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>Queued</span>
                          <button className="btn btn-sm" onClick={() => setAction(f.id, 'attach')}>Attach</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {busy && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>Uploading &amp; attaching…</span>
                    <span>{progress.done} / {progress.total}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(191,75,75,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => { files.forEach((f) => URL.revokeObjectURL(f.preview)); setFiles([]); }} disabled={busy}>
                  Clear
                </button>
                <button className="btn btn-primary" onClick={handleApply} disabled={files.length === 0 || busy}>
                  {busy ? 'Importing…' : `Import ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={folderInputRef} type="file" accept="image/*" webkitdirectory="" multiple style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      <ImmichBrowser isOpen={immichOpen} onClose={() => setImmichOpen(false)} onImport={(files) => { addFiles(files); setImmichOpen(false); }} />
    </div>
  );
}

const selectStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 8px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
};

export default ImportPhotos;
