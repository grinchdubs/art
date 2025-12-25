import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { seriesAPI } from '../utils/api';

function SeriesList() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    try {
      const data = await seriesAPI.getAll();
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(seriesId, seriesName) {
    if (!window.confirm(`Are you sure you want to delete the series "${seriesName}"? Works in this series will not be deleted, but will be unlinked from the series.`)) {
      return;
    }

    try {
      await seriesAPI.delete(seriesId);
      await loadSeries();
    } catch (error) {
      console.error('Error deleting series:', error);
      alert('Error deleting series. Please try again.');
    }
  }

  if (loading) {
    return <div>Loading series...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Series & Collections</h2>
        <button className="btn btn-primary" onClick={() => navigate('/series/new')}>
          Create New Series
        </button>
      </div>

      {series.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#7f8c8d', marginBottom: '16px' }}>No series created yet</p>
          <button className="btn btn-primary" onClick={() => navigate('/series/new')}>
            Create Your First Series
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {series.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #ecf0f1',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => navigate(`/series/${s.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3498db';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(52, 152, 219, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#ecf0f1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>{s.name}</h3>
                  {s.description && (
                    <p style={{ color: '#7f8c8d', margin: '0 0 12px 0', lineHeight: '1.6' }}>
                      {s.description}
                    </p>
                  )}
                  
                  <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                        {s.artwork_count || 0}
                      </span>
                      <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
                        Physical Work{s.artwork_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>
                        {s.digital_work_count || 0}
                      </span>
                      <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
                        Digital Work{s.digital_work_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {(s.start_date || s.end_date) && (
                    <div style={{ marginTop: '12px', color: '#95a5a6', fontSize: '14px' }}>
                      {s.start_date && new Date(s.start_date).toLocaleDateString()}
                      {s.start_date && s.end_date && ' - '}
                      {s.end_date && new Date(s.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/series/${s.id}/edit`);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id, s.name);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SeriesList;
