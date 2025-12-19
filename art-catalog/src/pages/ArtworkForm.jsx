import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artworkOperations, fileOperations } from '../db';

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
    series_name: '',
    sale_status: 'available',
    location: '',
    price: '',
    notes: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  useEffect(() => {
    if (isEdit) {
      loadArtwork();
    }
  }, [id]);

  // Auto-generate inventory number when relevant fields change
  useEffect(() => {
    if (!isEdit && (formData.creation_date || formData.medium || formData.title)) {
      generateInventoryNumber();
    }
  }, [formData.creation_date, formData.medium, formData.title, formData.series_name]);

  async function generateInventoryNumber() {
    try {
      // Extract year from creation_date or use current year
      const year = formData.creation_date
        ? new Date(formData.creation_date).getFullYear()
        : new Date().getFullYear();

      // Generate NAME part from medium or title
      let namePart = '';
      if (formData.medium) {
        // Use medium (e.g., "Pen plot" -> "PENPLOT")
        namePart = formData.medium.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      } else if (formData.title) {
        // Fallback to title
        namePart = formData.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
      }

      if (!namePart) {
        return; // Don't generate if we don't have enough info
      }

      // Get all existing artworks to find the next series number
      const allArtworks = await artworkOperations.getAll();

      // Filter artworks with similar inventory pattern
      const prefix = `GRNCH-${year}-${namePart}-`;
      const similarArtworks = allArtworks.filter(a =>
        a.inventory_number && a.inventory_number.startsWith(prefix)
      );

      // Extract series numbers and find the max
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

      // Generate new series number (pad to 3 digits)
      const newSeriesNumber = String(maxSeriesNumber + 1).padStart(3, '0');
      const inventoryNumber = `${prefix}${newSeriesNumber}`;

      setFormData(prev => ({ ...prev, inventory_number: inventoryNumber }));
    } catch (error) {
      console.error('Error generating inventory number:', error);
    }
  }

  async function loadArtwork() {
    try {
      const artwork = await artworkOperations.getById(id);
      setFormData(artwork);

      // Load existing files
      const files = await fileOperations.getFilesForArtwork(id);
      setExistingFiles(files);
    } catch (error) {
      console.error('Error loading artwork:', error);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            type: file.type,
            data: event.target.result,
            preview: event.target.result
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const loadedFiles = await Promise.all(filePromises);
    setUploadedFiles(prev => [...prev, ...loadedFiles]);
  }

  function removeUploadedFile(index) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function removeExistingFile(fileId) {
    if (window.confirm('Remove this file?')) {
      await fileOperations.deleteFile(fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      let artworkId = id;

      if (isEdit) {
        await artworkOperations.update(id, formData);
      } else {
        const result = await artworkOperations.create(formData);
        artworkId = result.id;
        console.log('Created artwork with ID:', artworkId);
      }

      // Save uploaded files
      console.log('Uploading', uploadedFiles.length, 'files for artwork', artworkId);
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        console.log('Uploading file', i + 1, ':', file.name, file.type);
        const fileId = await fileOperations.addFile(
          artworkId,
          file.data,
          file.type,
          i === 0 && existingFiles.length === 0 // First file is primary if no existing files
        );
        console.log('File uploaded with ID:', fileId);
      }

      navigate('/artworks');
    } catch (error) {
      console.error('Error saving work:', error);
      alert('Error saving work. Please try again.');
    }
  }

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
              <label htmlFor="series_name">Series/Collection</label>
              <input
                type="text"
                id="series_name"
                name="series_name"
                className="form-control"
                value={formData.series_name}
                onChange={handleChange}
                placeholder="Series or collection name"
              />
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

          <div className="form-group">
            <label>Images & Videos</label>
            <input
              type="file"
              className="form-control"
              onChange={handleFileChange}
              accept="image/*,video/*"
              multiple
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px', display: 'block', marginTop: '8px' }}>
              Upload images or videos of your work. Multiple files supported.
            </small>

            {/* Show existing files */}
            {existingFiles.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px' }}>
                  Existing Files:
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {existingFiles.map((file) => (
                    <div key={file.id} style={{ position: 'relative' }}>
                      {file.file_type.startsWith('image/') ? (
                        <img
                          src={file.file_path}
                          alt="Work"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '120px', background: '#ecf0f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                          🎥
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingFile(file.id)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show newly uploaded files */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px' }}>
                  New Files to Upload:
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      {file.type.startsWith('image/') ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '120px', background: '#ecf0f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                          🎥
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeUploadedFile(index)}
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
    </div>
  );
}

export default ArtworkForm;
