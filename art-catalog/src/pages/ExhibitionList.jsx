import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionOperations } from '../db';

function ExhibitionList() {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExhibitions();
  }, []);

  async function loadExhibitions() {
    try {
      const data = await exhibitionOperations.getAll();
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exhibitions.map((exhibition) => (
            <div
              key={exhibition.id}
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onClick={() => navigate(`/exhibitions/${exhibition.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>{exhibition.name}</h3>
                  <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '4px' }}>
                    📍 {exhibition.venue}
                  </div>
                  <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
                    📅 {new Date(exhibition.start_date).toLocaleDateString()}
                    {exhibition.end_date && ` - ${new Date(exhibition.end_date).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              {exhibition.description && (
                <p style={{ marginTop: '12px', color: '#555', fontSize: '14px' }}>
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
