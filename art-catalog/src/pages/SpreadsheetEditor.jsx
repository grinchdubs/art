import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { artworkAPI } from '../utils/api';

const COLUMNS = [
  { key: 'title',         label: 'Title',        type: 'text',   width: 220 },
  { key: 'inventory_number', label: 'Inventory', type: 'text',   width: 160 },
  { key: 'creation_date', label: 'Date',         type: 'date',   width: 130 },
  { key: 'medium',        label: 'Medium',       type: 'text',   width: 160 },
  { key: 'dimensions',    label: 'Dimensions',   type: 'text',   width: 140 },
  { key: 'price',         label: 'Price',        type: 'text',   width: 100 },
  { key: 'sale_status',   label: 'Status',       type: 'select', width: 130,
    options: ['available', 'sold', 'on-loan', 'not-for-sale'] },
  { key: 'location',      label: 'Location',     type: 'text',   width: 160 },
];

function SpreadsheetEditor() {
  const [artworks, setArtworks] = useState([]);
  const [newRows, setNewRows] = useState([]);   // blank rows pending creation
  const [changes, setChanges] = useState({});   // { [id]: { field: value } }
  const [editingCell, setEditingCell] = useState(null); // { rowId, col }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { loadArtworks(); }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editingCell]);

  async function loadArtworks() {
    try {
      const data = await artworkAPI.getAll();
      setArtworks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function addNewRow() {
    const id = 'new-' + Date.now();
    setNewRows(prev => [...prev, { id, sale_status: 'available' }]);
    setEditingCell({ rowId: id, col: COLUMNS[0].key });
  }

  function getCellValue(row, col) {
    const changed = changes[row.id]?.[col];
    if (changed !== undefined) return changed;
    return row[col] ?? '';
  }

  function handleCellChange(rowId, col, value) {
    setChanges(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [col]: value },
    }));
  }

  function handleKeyDown(e, rowId, colIndex) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;
      const nextCol = COLUMNS[colIndex + direction];
      if (nextCol) {
        setEditingCell({ rowId, col: nextCol.key });
      } else {
        // move to next/prev row, first/last col
        const rowIds = filtered.map(a => a.id);
        const rowIdx = rowIds.indexOf(rowId);
        const nextRowId = rowIds[rowIdx + direction];
        if (nextRowId !== undefined) {
          const wrapCol = direction > 0 ? COLUMNS[0] : COLUMNS[COLUMNS.length - 1];
          setEditingCell({ rowId: nextRowId, col: wrapCol.key });
        } else {
          setEditingCell(null);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  async function saveChanges() {
    const ids = Object.keys(changes);
    if (ids.length === 0) return;
    setSaving(true);
    let count = 0;
    for (const id of ids) {
      try {
        if (id.startsWith('new-')) {
          await artworkAPI.create({ sale_status: 'available', ...changes[id] });
        } else {
          const artwork = artworks.find(a => a.id === parseInt(id));
          await artworkAPI.update(id, { ...artwork, ...changes[id] });
        }
        count++;
      } catch (err) {
        console.error(`Error saving artwork ${id}:`, err);
      }
    }
    await loadArtworks();
    setNewRows([]);
    setChanges({});
    setSaving(false);
    setSavedCount(count);
    setTimeout(() => setSavedCount(null), 2500);
  }

  function discardChanges() {
    setNewRows([]);
    setChanges({});
    setEditingCell(null);
  }

  const dirtyCount = Object.keys(changes).length;

  const filtered = [
    ...artworks.filter(a => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        a.title?.toLowerCase().includes(s) ||
        a.inventory_number?.toLowerCase().includes(s) ||
        a.medium?.toLowerCase().includes(s)
      );
    }),
    ...newRows,
  ];

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>Spreadsheet Editor</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {savedCount !== null && (
            <span style={{ fontSize: '13px', color: 'var(--success)' }}>
              ✓ Saved {savedCount} work{savedCount !== 1 ? 's' : ''}
            </span>
          )}
          {dirtyCount > 0 && (
            <>
              <span style={{ fontSize: '13px', color: 'var(--warning)' }}>
                {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={discardChanges}>
                Discard
              </button>
              <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                {saving ? 'Saving…' : `Save ${dirtyCount} Row${dirtyCount !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={addNewRow}>
            + Add Row
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/artworks')}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Filter by title, inventory, or medium…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 1 }}>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    width: col.width,
                    minWidth: col.width,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((artwork, rowIdx) => {
              const isNew = String(artwork.id).startsWith('new-');
              const isDirty = isNew || !!changes[artwork.id];
              return (
                <tr
                  key={artwork.id}
                  style={{
                    background: isNew
                      ? 'rgba(46, 204, 113, 0.05)'
                      : isDirty
                        ? 'rgba(201, 168, 108, 0.05)'
                        : (rowIdx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)'),
                    borderLeft: isNew
                      ? '2px solid var(--success)'
                      : isDirty
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                  }}
                >
                  {COLUMNS.map((col, colIdx) => {
                    const isEditing = editingCell?.rowId === artwork.id && editingCell?.col === col.key;
                    const value = getCellValue(artwork, col.key);
                    const isCellDirty = changes[artwork.id]?.[col.key] !== undefined;

                    return (
                      <td
                        key={col.key}
                        onClick={() => setEditingCell({ rowId: artwork.id, col: col.key })}
                        style={{
                          padding: 0,
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          position: 'relative',
                          background: isCellDirty ? 'rgba(201,168,108,0.08)' : 'transparent',
                        }}
                      >
                        {isEditing ? (
                          col.type === 'select' ? (
                            <select
                              ref={inputRef}
                              value={value}
                              onChange={e => handleCellChange(artwork.id, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={e => handleKeyDown(e, artwork.id, colIdx)}
                              style={{
                                width: '100%', height: '100%',
                                padding: '8px 12px',
                                background: 'var(--bg-elevated)',
                                border: '2px solid var(--accent)',
                                borderRadius: 0,
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontFamily: 'var(--font-ui)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            >
                              {col.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={inputRef}
                              type={col.type === 'date' ? 'date' : 'text'}
                              value={value}
                              onChange={e => handleCellChange(artwork.id, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={e => handleKeyDown(e, artwork.id, colIdx)}
                              style={{
                                width: '100%', height: '100%',
                                padding: '8px 12px',
                                background: 'var(--bg-elevated)',
                                border: '2px solid var(--accent)',
                                borderRadius: 0,
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontFamily: 'var(--font-ui)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          )
                        ) : (
                          <div
                            style={{
                              padding: '8px 12px',
                              minHeight: '36px',
                              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'text',
                              maxWidth: col.width,
                            }}
                          >
                            {value || '—'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No artworks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Click any cell to edit · Tab / Shift+Tab to move between cells · Enter to move down · Esc to cancel
      </div>
    </div>
  );
}

export default SpreadsheetEditor;
