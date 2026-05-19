import { useEffect, useState, useCallback } from 'react';
import { editionAPI, salesAPI } from '../utils/api';
import './EditionGrid.css';

const VARIANT_LABEL = { regular: '', AP: 'AP', PP: 'PP', HC: 'HC' };

function copyLabel(copy, editionTotal) {
  if (copy.edition_type === 'regular') {
    return editionTotal ? `${copy.copy_number}/${editionTotal}` : `${copy.copy_number}`;
  }
  return `${copy.edition_type} ${copy.copy_number}`;
}

export default function EditionGrid({ workType, workId, work, readOnly = false, onChange }) {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCopy, setSelectedCopy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetcher = workType === 'artwork' ? editionAPI.getByArtwork : editionAPI.getByDigitalWork;
      const data = await fetcher(workId);
      setCopies(data);
    } catch (err) {
      console.error('Failed to load editions:', err);
      setCopies([]);
    } finally {
      setLoading(false);
    }
  }, [workType, workId]);

  useEffect(() => {
    load();
  }, [load]);

  // If the work has an edition_total but no copies are tracked yet (e.g. legacy
  // record predating this feature), kick off a one-shot generate.
  useEffect(() => {
    if (readOnly || loading) return;
    if (!work?.edition_total) return;
    if (copies.some((c) => c.edition_type === 'regular')) return;
    const ensure = workType === 'artwork' ? editionAPI.ensureArtwork : editionAPI.ensureDigitalWork;
    ensure(workId).then(load).catch((err) => console.error('ensure copies failed:', err));
  }, [copies, work, workType, workId, readOnly, loading, load]);

  function handleTileClick(copy) {
    if (readOnly) return;
    setSelectedCopy(copy);
  }

  function handleAddVariant(type) {
    const adder = workType === 'artwork' ? editionAPI.addArtworkCopy : editionAPI.addDigitalWorkCopy;
    adder(workId, { edition_type: type }).then(() => {
      load();
      onChange?.();
    }).catch((err) => {
      console.error('Failed to add variant:', err);
      alert('Failed to add copy: ' + err.message);
    });
  }

  async function handleCopyUpdate(updated) {
    try {
      await editionAPI.update(selectedCopy.id, updated);
      setSelectedCopy(null);
      await load();
      onChange?.();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  }

  async function handleRecordSale(saleData) {
    try {
      const workIdField = workType === 'artwork' ? 'artwork_id' : 'digital_work_id';
      await salesAPI.create({
        [workIdField]: workId,
        edition_id: selectedCopy.id,
        ...saleData,
      });
      setSelectedCopy(null);
      await load();
      onChange?.();
    } catch (err) {
      alert('Failed to record sale: ' + err.message);
    }
  }

  if (loading) {
    return <div className="edition-grid"><p className="no-history">Loading edition copies…</p></div>;
  }

  if (copies.length === 0) {
    if (!work?.edition_total) return null; // Not editioned
    return <div className="edition-grid"><p className="no-history">No copies tracked yet.</p></div>;
  }

  const total = copies.length;
  const sold = copies.filter((c) => c.status === 'sold').length;
  const available = copies.filter((c) => c.status === 'available').length;
  const reserved = copies.filter((c) => c.status === 'reserved').length;

  return (
    <div className="edition-grid">
      <div className="edition-grid-header">
        <div className="edition-grid-summary">
          <span><strong>{sold}</strong> sold</span>
          <span><strong>{available}</strong> available</span>
          {reserved > 0 && <span><strong>{reserved}</strong> reserved</span>}
          <span>of <strong>{total}</strong></span>
        </div>
        {!readOnly && (
          <div className="edition-grid-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => handleAddVariant('AP')}>+ AP</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAddVariant('PP')}>+ PP</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAddVariant('HC')}>+ HC</button>
          </div>
        )}
      </div>

      <div className="edition-grid-tiles">
        {copies.map((copy) => (
          <button
            key={copy.id}
            type="button"
            className={`edition-tile status-${copy.status}${readOnly ? ' read-only' : ''}`}
            onClick={() => handleTileClick(copy)}
            disabled={readOnly}
          >
            {copy.edition_type !== 'regular' && (
              <span className="edition-tile-type-badge">{VARIANT_LABEL[copy.edition_type]}</span>
            )}
            <span className="edition-tile-label">{copyLabel(copy, work?.edition_total)}</span>
            <span className="edition-tile-status">{copy.status}</span>
            {!readOnly && copy.owner_name && (
              <span className="edition-tile-owner">{copy.owner_name}</span>
            )}
          </button>
        ))}
      </div>

      {selectedCopy && (
        <CopyDetailModal
          copy={selectedCopy}
          editionTotal={work?.edition_total}
          onClose={() => setSelectedCopy(null)}
          onUpdate={handleCopyUpdate}
          onRecordSale={handleRecordSale}
        />
      )}
    </div>
  );
}

function CopyDetailModal({ copy, editionTotal, onClose, onUpdate, onRecordSale }) {
  const [mode, setMode] = useState('view'); // 'view' | 'sale'
  const [status, setStatus] = useState(copy.status);
  const [ownerName, setOwnerName] = useState(copy.owner_name || '');
  const [notes, setNotes] = useState(copy.notes || '');
  const [price, setPrice] = useState(copy.price || '');

  // Sale form fields
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [salePrice, setSalePrice] = useState(copy.price || '');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [platform, setPlatform] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  function submitDetails(e) {
    e.preventDefault();
    onUpdate({
      status,
      owner_name: ownerName || null,
      notes: notes || null,
      price: price ? parseFloat(price) : null,
    });
  }

  function submitSale(e) {
    e.preventDefault();
    if (!saleDate) {
      alert('Sale date is required');
      return;
    }
    onRecordSale({
      sale_date: saleDate,
      sale_price: salePrice || null,
      buyer_name: buyerName || null,
      buyer_email: buyerEmail || null,
      platform: platform || null,
      notes: saleNotes || null,
    });
  }

  const label = copy.edition_type === 'regular'
    ? `Copy ${copy.copy_number}${editionTotal ? ` of ${editionTotal}` : ''}`
    : `${copy.edition_type} ${copy.copy_number}`;

  return (
    <div className="edition-modal-overlay" onClick={onClose}>
      <div className="edition-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{label}</h3>

        {copy.sale_id && mode === 'view' && (
          <div className="edition-modal-sale-info">
            <div>Sold on <strong>{copy.sale_date?.split?.('T')?.[0] || copy.sale_date}</strong></div>
            {copy.buyer_name && <div>Buyer: <strong>{copy.buyer_name}</strong></div>}
            {copy.sale_price && <div>Price: <strong>${copy.sale_price}</strong></div>}
          </div>
        )}

        {mode === 'view' && (
          <form onSubmit={submitDetails}>
            <div className="form-row">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="destroyed">Destroyed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-row">
              <label>Owner / Holder</label>
              <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="(none)" />
            </div>
            <div className="form-row">
              <label>Price (this copy)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="(uses work default)" />
            </div>
            <div className="form-row">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="edition-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              {copy.status !== 'sold' && (
                <button type="button" className="btn btn-primary" onClick={() => setMode('sale')}>
                  Record Sale…
                </button>
              )}
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        )}

        {mode === 'sale' && (
          <form onSubmit={submitSale}>
            <div className="form-row">
              <label>Sale date *</label>
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Sale price</label>
              <input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Buyer name</label>
              <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Buyer email</label>
              <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Platform</label>
              <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Etsy, Direct, Gallery…" />
            </div>
            <div className="form-row">
              <label>Notes</label>
              <textarea value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
            </div>

            <div className="edition-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMode('view')}>Back</button>
              <button type="submit" className="btn btn-primary">Record Sale</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
