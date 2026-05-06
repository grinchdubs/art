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
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
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
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No series yet</h3>
          <p>Group your works into series and collections</p>
          <button className="btn btn-primary" onClick={() => navigate('/series/new')}>
            Create Your First Series
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {series.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'var(--bg-surface)',
                padding: '20px 24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'border-color var(--transition)',
              }}
              onClick={() => navigate(`/series/${s.id}`)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '500' }}>
                    {s.name}
                  </h3>
                  {s.description && (
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.6', fontSize: '13px' }}>
                      {s.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '22px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                        {s.artwork_count || 0}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Physical Work{s.artwork_count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {s.digital_work_count || 0}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Digital Work{s.digital_work_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {(s.start_date || s.end_date) && (
                    <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.start_date && new Date(s.start_date).toLocaleDateString()}
                      {s.start_date && s.end_date && ' – '}
                      {s.end_date && new Date(s.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/series/${s.id}/edit`); }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name); }}
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
