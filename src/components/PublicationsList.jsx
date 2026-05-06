import { useState } from 'react';
import './PublicationsList.css';

function PublicationsList({ publications, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!publications || publications.length === 0) {
    return (
      <div className="empty-publications">
        <p>No publications recorded yet</p>
      </div>
    );
  }

  const getPublicationIcon = (type) => {
    const icons = {
      magazine: '📰',
      blog: '✍️',
      social_media: '📱',
      catalog: '📚',
      book: '📖',
      website: '🌐',
      press: '📢'
    };
    return icons[type] || '📄';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="publications-list">
      {publications.map((pub) => (
        <div key={pub.id} className="publication-card">
          <div className="publication-header" onClick={() => setExpandedId(expandedId === pub.id ? null : pub.id)}>
            <div className="publication-main">
              <span className="publication-icon" title={pub.publication_type}>
                {getPublicationIcon(pub.publication_type)}
              </span>
              <div className="publication-title-section">
                <div className="publication-name">{pub.publication_name}</div>
                {pub.article_title && (
                  <div className="article-title">{pub.article_title}</div>
                )}
              </div>
            </div>
            <div className="publication-date">{formatDate(pub.publication_date)}</div>
            <button
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(expandedId === pub.id ? null : pub.id);
              }}
            >
              {expandedId === pub.id ? '▼' : '▶'}
            </button>
          </div>

          {expandedId === pub.id && (
            <div className="publication-details">
              <div className="publication-meta">
                <div className="publication-type-badge">{pub.publication_type.replace('_', ' ')}</div>
                {pub.author && <div className="publication-author">By: {pub.author}</div>}
                {pub.page_number && <div className="publication-page">Page: {pub.page_number}</div>}
              </div>

              {pub.url && (
                <div className="publication-link">
                  <a href={pub.url} target="_blank" rel="noopener noreferrer">
                    View Publication ↗
                  </a>
                </div>
              )}

              {pub.notes && (
                <div className="publication-notes">
                  <strong>Notes:</strong>
                  <p>{pub.notes}</p>
                </div>
              )}

              <div className="publication-actions">
                <button onClick={() => onEdit(pub)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => onDelete(pub.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PublicationsList;
