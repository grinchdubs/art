import { useState, useEffect } from 'react';
import { publicationsAPI } from '../utils/api';
import './PublicationForm.css';

function PublicationForm({ workId, workType, onClose, onPublicationAdded, existingPublication }) {
  const [formData, setFormData] = useState({
    publication_type: 'magazine',
    publication_name: '',
    publication_date: '',
    url: '',
    page_number: '',
    author: '',
    article_title: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingPublication) {
      setFormData({
        publication_type: existingPublication.publication_type || 'magazine',
        publication_name: existingPublication.publication_name || '',
        publication_date: existingPublication.publication_date ? existingPublication.publication_date.split('T')[0] : '',
        url: existingPublication.url || '',
        page_number: existingPublication.page_number || '',
        author: existingPublication.author || '',
        article_title: existingPublication.article_title || '',
        notes: existingPublication.notes || ''
      });
    }
  }, [existingPublication]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const publicationData = {
        ...formData,
        [workType === 'artwork' ? 'artwork_id' : 'digital_work_id']: workId
      };

      if (existingPublication) {
        await publicationsAPI.update(existingPublication.id, publicationData);
      } else {
        await publicationsAPI.create(publicationData);
      }

      onPublicationAdded();
      onClose();
    } catch (error) {
      console.error('Error saving publication:', error);
      alert('Failed to save publication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="publication-form-overlay" onClick={onClose}>
      <div className="publication-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="publication-form-header">
          <h2>{existingPublication ? 'Edit Publication' : 'Add Publication'}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="publication-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="publication_type">Type *</label>
              <select
                id="publication_type"
                name="publication_type"
                value={formData.publication_type}
                onChange={handleChange}
                required
                className="form-control"
              >
                <option value="magazine">Magazine</option>
                <option value="blog">Blog</option>
                <option value="social_media">Social Media</option>
                <option value="catalog">Catalog</option>
                <option value="book">Book</option>
                <option value="website">Website</option>
                <option value="press">Press/News</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="publication_date">Date</label>
              <input
                type="date"
                id="publication_date"
                name="publication_date"
                value={formData.publication_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="publication_name">Publication Name *</label>
            <input
              type="text"
              id="publication_name"
              name="publication_name"
              value={formData.publication_name}
              onChange={handleChange}
              required
              placeholder="e.g., Art Magazine, TechCrunch, Instagram"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="article_title">Article/Post Title</label>
            <input
              type="text"
              id="article_title"
              name="article_title"
              value={formData.article_title}
              onChange={handleChange}
              placeholder="Title of the article or post"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="author">Author/Journalist</label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Who wrote about this work?"
              className="form-control"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="url">URL</label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="page_number">Page Number</label>
              <input
                type="text"
                id="page_number"
                name="page_number"
                value={formData.page_number}
                onChange={handleChange}
                placeholder="e.g., 42, pp. 25-30"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Additional details about this publication..."
              className="form-control"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : existingPublication ? 'Update' : 'Add Publication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PublicationForm;
