import { useState } from 'react';
import './TransferForm.css';

export default function TransferForm({ workId, workType, onTransferRecorded, onClose }) {
  const [formData, setFormData] = useState({
    transfer_type: 'sale',
    transfer_date: new Date().toISOString().split('T')[0],
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    price_paid: '',
    payment_method: '',
    return_date: '',
    contract_url: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        [workType === 'artwork' ? 'artwork_id' : 'digital_work_id']: workId,
        price_paid: formData.price_paid ? parseFloat(formData.price_paid) : null,
        return_date: formData.return_date || null,
        contract_url: formData.contract_url || null,
        notes: formData.notes || null
      };

      const response = await fetch('/api/provenance/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record transfer');
      }

      const result = await response.json();
      onTransferRecorded(result);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="transfer-form-overlay" onClick={onClose}>
      <div className="transfer-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="transfer-form-header">
          <h2>Record Transfer</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="transfer-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="transfer_type">Transfer Type *</label>
              <select
                id="transfer_type"
                name="transfer_type"
                value={formData.transfer_type}
                onChange={handleChange}
                required
              >
                <option value="sale">Sale</option>
                <option value="gift">Gift</option>
                <option value="loan">Loan</option>
                <option value="consignment">Consignment</option>
                <option value="return">Return to Artist</option>
                <option value="artist_retained">Artist Retained</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer_date">Transfer Date *</label>
              <input
                type="date"
                id="transfer_date"
                name="transfer_date"
                value={formData.transfer_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="owner_name">Owner/Recipient Name</label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="John Smith, ABC Gallery, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="owner_email">Email</label>
              <input
                type="email"
                id="owner_email"
                name="owner_email"
                value={formData.owner_email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="owner_phone">Phone</label>
              <input
                type="tel"
                id="owner_phone"
                name="owner_phone"
                value={formData.owner_phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price_paid">Price Paid</label>
              <input
                type="number"
                id="price_paid"
                name="price_paid"
                value={formData.price_paid}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="payment_method">Payment Method</label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="wire">Wire Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="trade">Trade/Barter</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {(formData.transfer_type === 'loan' || formData.transfer_type === 'consignment') && (
            <div className="form-group">
              <label htmlFor="return_date">Expected Return Date</label>
              <input
                type="date"
                id="return_date"
                name="return_date"
                value={formData.return_date}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="contract_url">Contract/Agreement URL</label>
            <input
              type="url"
              id="contract_url"
              name="contract_url"
              value={formData.contract_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional information about this transfer..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Recording...' : 'Record Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
