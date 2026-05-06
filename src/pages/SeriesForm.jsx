import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { seriesAPI } from '../utils/api';

function SeriesForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadSeries();
    }
  }, [id]);

  async function loadSeries() {
    try {
      setLoading(true);
      const data = await seriesAPI.getById(id);
      setSeries({
        name: data.name || '',
        description: data.description || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
      });
    } catch (error) {
      console.error('Error loading series:', error);
      alert('Error loading series');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!series.name.trim()) {
      alert('Series name is required');
      return;
    }

    try {
      setLoading(true);
      if (id && id !== 'new') {
        await seriesAPI.update(id, series);
      } else {
        await seriesAPI.create(series);
      }
      navigate('/series');
    } catch (error) {
      console.error('Error saving series:', error);
      if (error.message && error.message.includes('already exists')) {
        alert('A series with this name already exists. Please choose a different name.');
      } else {
        alert('Error saving series. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setSeries(prev => ({ ...prev, [field]: value }));
  }

  if (loading && id && id !== 'new') {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>{id && id !== 'new' ? 'Edit Series' : 'Create New Series'}</h2>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Series Name *</label>
            <input
              id="name"
              type="text"
              className="form-control"
              value={series.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="e.g., Sleeping Androids, Genuary 2025"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-control"
              value={series.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="4"
              placeholder="Describe the theme, concept, or context of this series..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input
                id="start_date"
                type="date"
                className="form-control"
                value={series.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input
                id="end_date"
                type="date"
                className="form-control"
                value={series.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (id && id !== 'new' ? 'Update Series' : 'Create Series')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/series')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SeriesForm;
