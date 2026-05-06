import { useState, useRef, useCallback } from 'react';
import { galleryAPI, artworkAPI } from '../utils/api';

function BatchUpload({ onComplete, onClose }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState([]);
  const [sharedMedium, setSharedMedium] = useState('');
  const [sharedStatus, setSharedStatus] = useState('available');
  const fileInputRef = useRef(null);

  const addFiles = useCallback((newFiles) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.file.name + f.file.size));
      const unique = imageFiles.filter(f => !existing.has(f.name + f.size));
      return [
        ...prev,
        ...unique.map(file => ({
          file,
          preview: URL.createObjectURL(file),
          title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          id: Math.random().toString(36).slice(2),
        })),
      ];
    });
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function updateTitle(id, title) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, title } : f));
  }

  function removeFile(id) {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(f => f.id !== id);
    });
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setErrors([]);
    setProgress({ done: 0, total: files.length });

    const errs = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      try {
        const uploaded = await galleryAPI.uploadSingle(item.file);
        await artworkAPI.create({
          title: item.title || item.file.name,
          medium: sharedMedium || undefined,
          sale_status: sharedStatus,
          images: [{ id: uploaded.id, is_primary: true }],
        });
      } catch (err) {
        errs.push(`"${item.title}": ${err.message}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    if (errs.length) {
      setErrors(errs);
    } else {
      files.forEach(f => URL.revokeObjectURL(f.preview));
      onComplete();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '800px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Batch Upload</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Drop zone */}
        {files.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-mid)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '60px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              transition: 'all var(--transition)',
            }}
          >
            <div style={{ fontSize: '40px', opacity: 0.4, marginBottom: '12px' }}>🖼️</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>
              Drop images here or click to select
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Supports JPG, PNG, GIF, WebP — multiple files at once
            </div>
          </div>
        )}

        {files.length > 0 && (
          <>
            {/* Add more button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {files.length} image{files.length !== 1 ? 's' : ''} ready
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add More
              </button>
            </div>

            {/* Shared fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Medium (all)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Oil on Canvas"
                  value={sharedMedium}
                  onChange={e => setSharedMedium(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Status (all)
                </label>
                <select
                  className="form-control"
                  value={sharedStatus}
                  onChange={e => setSharedStatus(e.target.value)}
                >
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="not-for-sale">Not for Sale</option>
                  <option value="on-loan">On Loan</option>
                </select>
              </div>
            </div>

            {/* Image grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
              {files.map(item => (
                <div key={item.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0a0a0a' }}>
                    <img
                      src={item.preview}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={() => removeFile(item.id)}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                        width: '22px', height: '22px', cursor: 'pointer',
                        color: '#fff', fontSize: '12px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <input
                      type="text"
                      value={item.title}
                      onChange={e => updateTitle(item.id, e.target.value)}
                      style={{
                        width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '5px 8px',
                        fontSize: '12px', color: 'var(--text-primary)', boxSizing: 'border-box',
                      }}
                      placeholder="Title"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />

        {/* Progress */}
        {uploading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Uploading...</span>
              <span>{progress.done} / {progress.total}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
              <div
                style={{
                  height: '100%', borderRadius: '2px', background: 'var(--accent)',
                  width: `${(progress.done / progress.total) * 100}%`,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(191,75,75,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)' }}>
            <strong>Some uploads failed:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} Work${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchUpload;
