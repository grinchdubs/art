import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exhibitionOperations } from '../db';

function ExhibitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    start_date: '',
    end_date: '',
    description: '',
    curator: '',
    website: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadExhibition();
    }
  }, [id]);

  async function loadExhibition() {
    try {
      const exhibition = await exhibitionOperations.getById(id);
      if (exhibition) {
        setFormData(exhibition);
      }
    } catch (error) {
      console.error('Error loading exhibition:', error);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (isEdit) {
        await exhibitionOperations.update(id, formData);
      } else {
        await exhibitionOperations.create(formData);
      }
      navigate('/exhibitions');
    } catch (error) {
      console.error('Error saving exhibition:', error);
      alert('Error saving exhibition. Please try again.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? 'Edit Exhibition' : 'Add New Exhibition'}</h2>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Exhibition Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter exhibition name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="venue">Venue *</label>
            <input
              type="text"
              id="venue"
              name="venue"
              className="form-control"
              value={formData.venue}
              onChange={handleChange}
              required
              placeholder="Gallery, museum, or venue name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                className="form-control"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                className="form-control"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="curator">Curator</label>
            <input
              type="text"
              id="curator"
              name="curator"
              className="form-control"
              value={formData.curator}
              onChange={handleChange}
              placeholder="Curator name (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              className="form-control"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Details about the exhibition"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Update Exhibition' : 'Add Exhibition'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/exhibitions')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExhibitionForm;
