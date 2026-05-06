import './ProvenanceTimeline.css';

export default function ProvenanceTimeline({ ownershipHistory = [] }) {
  if (!ownershipHistory || ownershipHistory.length === 0) {
    return (
      <div className="provenance-timeline">
        <p className="no-history">No ownership history recorded yet.</p>
      </div>
    );
  }

  const getTransferIcon = (type) => {
    const icons = {
      sale: '💰',
      gift: '🎁',
      loan: '🤝',
      consignment: '🏪',
      return: '↩️',
      artist_retained: '🎨'
    };
    return icons[type] || '📝';
  };

  const getTransferLabel = (type) => {
    const labels = {
      sale: 'Sold',
      gift: 'Gifted',
      loan: 'Loaned',
      consignment: 'Consignment',
      return: 'Returned',
      artist_retained: 'Retained by Artist'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="provenance-timeline">
      {ownershipHistory.map((transfer, index) => (
        <div key={transfer.id} className="timeline-item">
          <div className="timeline-marker">
            <span className="timeline-icon">{getTransferIcon(transfer.transfer_type)}</span>
            {index < ownershipHistory.length - 1 && <div className="timeline-line" />}
          </div>
          
          <div className="timeline-content">
            <div className="timeline-header">
              <span className="timeline-type">{getTransferLabel(transfer.transfer_type)}</span>
              <span className="timeline-date">{formatDate(transfer.transfer_date)}</span>
            </div>
            
            {transfer.owner_name && (
              <div className="timeline-owner">
                <strong>{transfer.owner_name}</strong>
              </div>
            )}
            
            <div className="timeline-details">
              {transfer.price_paid && (
                <div className="detail-item">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{formatCurrency(transfer.price_paid)}</span>
                </div>
              )}
              
              {transfer.payment_method && (
                <div className="detail-item">
                  <span className="detail-label">Payment:</span>
                  <span className="detail-value">{transfer.payment_method}</span>
                </div>
              )}
              
              {transfer.owner_email && (
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{transfer.owner_email}</span>
                </div>
              )}
              
              {transfer.owner_phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{transfer.owner_phone}</span>
                </div>
              )}
              
              {transfer.return_date && (
                <div className="detail-item">
                  <span className="detail-label">Expected Return:</span>
                  <span className="detail-value">{formatDate(transfer.return_date)}</span>
                </div>
              )}
              
              {transfer.contract_url && (
                <div className="detail-item">
                  <span className="detail-label">Contract:</span>
                  <a 
                    href={transfer.contract_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>
            
            {transfer.notes && (
              <div className="timeline-notes">
                <p>{transfer.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
