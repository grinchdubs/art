import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { digitalWorkAPI, galleryAPI } from '../utils/api';

function DigitalWorkForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    inventory_number: '',
    creation_date: '',
    file_format: '',
    file_size: '',
    dimensions: '',
    sale_status: 'available',
    price: '',
    license_type: '',
    notes: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  useEffect(() => {
    if (isEdit) {
      loadWork();
    } else {
      generateInventoryNumber();
    }
  }, [isEdit, id]);

  async function loadWork() {
    try {
      const work = await digitalWorkAPI.getById(id);
      if (work) {
        setFormData(work);
        // Files are included in the work data from API
        if (work.images && work.images.length > 0 && work.images[0].id) {
          setExistingFiles(work.images);
        }
      }
    } catch (error) {
      console.error('Error loading digital work:', error);
      alert('Error loading digital work');
    }
  }

  async function generateInventoryNumber() {
    try {
      const allWorks = await digitalWorkAPI.getAll();
      const year = new Date().getFullYear();
      const prefix = `GRNCH-DIG-${year}-`;

      const similarWorks = allWorks.filter(w =>
        w.inventory_number && w.inventory_number.startsWith(prefix)
      );

      let maxSeriesNumber = 0;
      similarWorks.forEach(existing => {
        const match = existing.inventory_number.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeriesNumber) {
            maxSeriesNumber = num;
          }
        }
      });

      const newSeriesNumber = String(maxSeriesNumber + 1).padStart(3, '0');
      setFormData(prev => ({
        ...prev,
        inventory_number: `${prefix}${newSeriesNumber}`
      }));
    } catch (error) {
      console.error('Error generating inventory number:', error);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e) {
    setUploadedFiles(Array.from(e.target.files));
  }

  async function handleDeleteFile(fileId) {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await galleryAPI.delete(fileId);
        setExistingFiles(existingFiles.filter(f => f.id !== fileId));
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file');
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      let workId;
      let work;

      if (isEdit) {
        work = await digitalWorkAPI.update(id, formData);
        workId = id;
      } else {
        work = await digitalWorkAPI.create(formData);
        workId = work.id;
      }

      // Upload new files if any
      if (uploadedFiles.length > 0) {
        if (uploadedFiles.length === 1) {
          // Single file upload
          await galleryAPI.uploadSingle(uploadedFiles[0]);
        } else {
          // Batch upload
          await galleryAPI.uploadBatch(uploadedFiles);
        }
        // Note: The backend would need to be updated to link uploaded images to digital works
        // For now, images are uploaded to the gallery but not automatically linked
      }

      navigate('/digital-works');
    } catch (error) {
      console.error('Error saving digital work:', error);
      alert('Error saving digital work. Please try again.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? 'Edit Digital Work' : 'Add New Digital Work'}</h2>
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
              placeholder="Auto-generated"
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
              Format: GRNCH-DIG-YEAR-SERIES
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
              <label htmlFor="file_format">File Format</label>
              <input
                type="text"
                id="file_format"
                name="file_format"
                className="form-control"
                value={formData.file_format}
                onChange={handleChange}
                placeholder="e.g., PNG, MP4, GIF, SVG"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="file_size">File Size</label>
              <input
                type="text"
                id="file_size"
                name="file_size"
                className="form-control"
                value={formData.file_size}
                onChange={handleChange}
                placeholder="e.g., 5MB, 100KB"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dimensions">Dimensions</label>
              <input
                type="text"
                id="dimensions"
                name="dimensions"
                className="form-control"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g., 1920x1080, 4K"
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

          <div className="form-group">
            <label htmlFor="license_type">License Type</label>
            <input
              type="text"
              id="license_type"
              name="license_type"
              className="form-control"
              value={formData.license_type}
              onChange={handleChange}
              placeholder="e.g., CC BY-SA, NFT, Exclusive Rights"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about the digital work"
            />
          </div>

          <div className="form-group">
            <label>Files & Previews</label>
            <input
              type="file"
              className="form-control"
              onChange={handleFileChange}
              accept="image/*,video/*"
              multiple
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px', display: 'block', marginTop: '8px' }}>
              Upload preview images or videos. Multiple files supported.
            </small>

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
                          alt="Digital Work"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '120px', background: '#ecf0f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                          🎥
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(231, 76, 60, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                      {file.is_primary === 1 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: 'rgba(52, 152, 219, 0.9)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                        }}>
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Update Digital Work' : 'Add Digital Work'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/digital-works')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DigitalWorkForm;
