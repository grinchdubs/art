import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionAPI } from '../utils/api';

function ExhibitionList() {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExhibitions();
  }, []);

  async function loadExhibitions() {
    try {
      const data = await exhibitionAPI.getAll();
      setExhibitions(data);
    } catch (error) {
      console.error('Error loading exhibitions:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Exhibitions</h2>
        <button className="btn btn-primary" onClick={() => navigate('/exhibitions/new')}>
          Add New Exhibition
        </button>
      </div>

      {exhibitions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎭</div>
          <h3>No exhibitions yet</h3>
          <p>Start tracking your artwork exhibitions and shows</p>
          <button className="btn btn-primary" onClick={() => navigate('/exhibitions/new')}>
            Add Your First Exhibition
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {exhibitions.map((exhibition) => (
            <div
              key={exhibition.id}
              className="exhibition-card"
              style={{
                padding: '20px 24px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/exhibitions/${exhibition.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="exhibition-name" style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '500' }}>
                    {exhibition.name}
                  </h3>
                  <div className="exhibition-meta" style={{ fontSize: '13px', marginBottom: '2px' }}>
                    📍 {exhibition.venue}
                  </div>
                  <div className="exhibition-meta" style={{ fontSize: '13px' }}>
                    📅 {new Date(exhibition.start_date).toLocaleDateString()}
                    {exhibition.end_date && ` – ${new Date(exhibition.end_date).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              {exhibition.description && (
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                  {exhibition.description.length > 150
                    ? `${exhibition.description.substring(0, 150)}...`
                    : exhibition.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExhibitionList;
