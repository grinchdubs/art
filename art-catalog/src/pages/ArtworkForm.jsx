import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artworkAPI, galleryAPI, getImageURL, seriesAPI } from '../utils/api';
import TagSelector from '../components/TagSelector';

function ArtworkForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    inventory_number: '',
    creation_date: '',
    dimensions: '',
    medium: '',
    series_id: '',
    sale_status: 'available',
    location: '',
    price: '',
    notes: '',
  });

  const [allGalleryImages, setAllGalleryImages] = useState([]);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [primaryImageId, setPrimaryImageId] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [allSeries, setAllSeries] = useState([]);

  useEffect(() => {
    loadGalleryImages();
    loadSeries();
    if (isEdit) {
      loadArtwork();
    }
  }, [id]);

  // Auto-generate inventory number when relevant fields change
  useEffect(() => {
    if (!isEdit && (formData.creation_date || formData.medium || formData.title)) {
      generateInventoryNumber();
    }
  }, [formData.creation_date, formData.medium, formData.title, formData.series_id]);

  async function loadGalleryImages() {
    try {
      const images = await galleryAPI.getAll();
      setAllGalleryImages(images);
    } catch (error) {
      console.error('Error loading gallery images:', error);
    }
  }

  async function loadSeries() {
    try {
      const series = await seriesAPI.getAll();
      setAllSeries(series);
    } catch (error) {
      console.error('Error loading series:', error);
    }
  }

  async function generateInventoryNumber() {
    try {
      const year = formData.creation_date
        ? new Date(formData.creation_date).getFullYear()
        : new Date().getFullYear();

      let namePart = '';
      if (formData.medium) {
        namePart = formData.medium.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      } else if (formData.title) {
        namePart = formData.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
      }

      if (!namePart) {
        return;
      }

      const allArtworks = await artworkAPI.getAll();
      const prefix = `GRNCH-${year}-${namePart}-`;
      const similarArtworks = allArtworks.filter(a =>
        a.inventory_number && a.inventory_number.startsWith(prefix)
      );

      let maxSeriesNumber = 0;
      similarArtworks.forEach(artwork => {
        const match = artwork.inventory_number.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeriesNumber) {
            maxSeriesNumber = num;
          }
        }
      });

      const newSeriesNumber = String(maxSeriesNumber + 1).padStart(3, '0');
      const inventoryNumber = `${prefix}${newSeriesNumber}`;

      setFormData(prev => ({ ...prev, inventory_number: inventoryNumber }));
    } catch (error) {
      console.error('Error generating inventory number:', error);
    }
  }

  async function loadArtwork() {
    try {
      const artwork = await artworkAPI.getById(id);
      setFormData(artwork);

      // Load associated images
      if (artwork.images && artwork.images.length > 0 && artwork.images[0].id) {
        const imageIds = artwork.images.map(img => img.id);
        setSelectedImageIds(imageIds);

        const primary = artwork.images.find(img => img.is_primary);
        if (primary) {
          setPrimaryImageId(primary.id);
        }
      }

      // Load associated tags
      if (artwork.tags && artwork.tags.length > 0 && artwork.tags[0].id) {
        const tagIds = artwork.tags.map(tag => tag.id);
        setSelectedTagIds(tagIds);
      }
    } catch (error) {
      console.error('Error loading artwork:', error);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function toggleImageSelection(imageId) {
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        // Removing image
        if (primaryImageId === imageId) {
          setPrimaryImageId(null);
        }
        return prev.filter(id => id !== imageId);
      } else {
        // Adding image - if it's the first one, make it primary
        const newIds = [...prev, imageId];
        if (newIds.length === 1) {
          setPrimaryImageId(imageId);
        }
        return newIds;
      }
    });
  }

  function setPrimaryImage(imageId) {
    if (selectedImageIds.includes(imageId)) {
      setPrimaryImageId(imageId);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      // Build images array
      const images = selectedImageIds.map((imageId, index) => ({
        id: imageId,
        is_primary: imageId === primaryImageId,
        display_order: index
      }));

      const payload = {
        ...formData,
        images
      };

      let savedArtwork;
      if (isEdit) {
        savedArtwork = await artworkAPI.update(id, payload);
        // Update tags separately
        await artworkAPI.updateTags(id, selectedTagIds);
      } else {
        savedArtwork = await artworkAPI.create(payload);
        // Update tags separately
        await artworkAPI.updateTags(savedArtwork.id, selectedTagIds);
      }

      navigate('/artworks');
    } catch (error) {
      console.error('Error saving work:', error);
      alert('Error saving work. Please try again.');
    }
  }

  const selectedImages = allGalleryImages.filter(img => selectedImageIds.includes(img.id));

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? 'Edit Work' : 'Add New Work'}</h2>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="inventory_number">Inventory Number *</label>
            <input
              type="text"
              id="inventory_number"
              name="inventory_number"
              className="form-control"
              value={formData.inventory_number}
              readOnly={!isEdit}
              onChange={handleChange}
              required
              placeholder="Auto-generated from date and medium"
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
              {isEdit
                ? 'Format: GRNCH-YEAR-NAME-SERIES'
                : 'Auto-generated as: GRNCH-[Year from Creation Date]-[Medium]-[Series Number]'
              }
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter work title"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="creation_date">Creation Date</label>
              <input
                type="date"
                id="creation_date"
                name="creation_date"
                className="form-control"
                value={formData.creation_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medium">Medium</label>
              <input
                type="text"
                id="medium"
                name="medium"
                className="form-control"
                value={formData.medium}
                onChange={handleChange}
                placeholder="e.g., Pen plot, Print, Sculpture"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dimensions">Dimensions</label>
              <input
                type="text"
                id="dimensions"
                name="dimensions"
                className="form-control"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g., 24 x 36 inches"
              />
            </div>

            <div className="form-group">
              <label htmlFor="series_id">Series/Collection</label>
              <select
                id="series_id"
                name="series_id"
                className="form-control"
                value={formData.series_id || ''}
                onChange={handleChange}
              >
                <option value="">No Series</option>
                {allSeries.map(series => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#7f8c8d', marginTop: '4px', display: 'block' }}>
                Group this artwork into a series or collection. <a href="/series/new" target="_blank" style={{ color: '#3498db' }}>Create new series</a>
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sale_status">Sale Status</label>
              <select
                id="sale_status"
                name="sale_status"
                className="form-control"
                value={formData.sale_status}
                onChange={handleChange}
              >
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="on-loan">On Loan</option>
                <option value="not-for-sale">Not for Sale</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input
                type="text"
                id="price"
                name="price"
                className="form-control"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., $500, €1000, or negotiable"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Current Location</label>
              <input
                type="text"
                id="location"
                name="location"
                className="form-control"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Studio, Storage Unit 3"
              />
            </div>

            <div className="form-group">
              {/* Empty div for grid alignment */}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about the work"
            />
          </div>

          {/* Tags */}
          <TagSelector
            selectedTags={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          {/* Image Selection */}
          <div className="form-group">
            <label>Images</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowImagePicker(true)}
              style={{ display: 'block', marginBottom: '16px' }}
            >
              Select from Gallery ({selectedImageIds.length} selected)
            </button>

            {selectedImages.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px' }}>
                  Selected Images:
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                  {selectedImages.map((image) => (
                    <div key={image.id} style={{ position: 'relative', border: image.id === primaryImageId ? '3px solid #3498db' : '2px solid #ecf0f1', borderRadius: '8px', overflow: 'hidden' }}>
                      <img
                        src={getImageURL(image.file_path)}
                        alt={image.original_name}
                        style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                      />
                      <div style={{ padding: '8px', background: 'white' }}>
                        <p style={{ margin: 0, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {image.original_name}
                        </p>
                        {image.id === primaryImageId && (
                          <span style={{ fontSize: '10px', color: '#3498db', fontWeight: '600' }}>PRIMARY</span>
                        )}
                        {image.id !== primaryImageId && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(image.id)}
                            style={{ fontSize: '10px', background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: 0 }}
                          >
                            Set as primary
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleImageSelection(image.id)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Update Work' : 'Add Work'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/artworks')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Select Images from Gallery</h3>

            {allGalleryImages.length === 0 ? (
              <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px 0' }}>
                No images in gallery. Upload images in the <a href="/gallery" style={{ color: '#3498db' }}>Image Gallery</a> first.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {allGalleryImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => toggleImageSelection(image.id)}
                    style={{
                      position: 'relative',
                      border: selectedImageIds.includes(image.id) ? '3px solid #3498db' : '2px solid #ecf0f1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <img
                      src={getImageURL(image.file_path)}
                      alt={image.original_name}
                      style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '8px', background: 'white' }}>
                      <p style={{ margin: 0, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {image.original_name}
                      </p>
                    </div>
                    {selectedImageIds.includes(image.id) && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#3498db',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowImagePicker(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtworkForm;
