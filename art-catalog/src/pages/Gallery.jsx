import { useState, useEffect } from 'react';
import { galleryAPI, getImageURL } from '../utils/api';
import './Gallery.css';

function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const data = await galleryAPI.getAll();
      setImages(data);
    } catch (error) {
      console.error('Error loading images:', error);
      alert('Failed to load images. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      alert('Please select at least one image');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    try {
      const result = await galleryAPI.uploadBatch(selectedFiles);

      alert(`Successfully uploaded ${result.images.length} images!`);
      setSelectedFiles([]);
      await loadImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(`Failed to upload images: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function handleDelete(imageId) {
    if (!confirm('Are you sure you want to delete this image? This will remove it from all artworks using it.')) {
      return;
    }

    try {
      await galleryAPI.delete(imageId);
      await loadImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading gallery...</div>;
  }

  return (
    <div className="gallery-page">
      <div className="page-header">
        <h1>Image Gallery</h1>
        <p>Upload and manage images for your artworks</p>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <h2>Batch Upload Images</h2>
        <div className="upload-controls">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ marginBottom: '12px' }}
          />

          {selectedFiles.length > 0 && (
            <div className="selected-files-info">
              <p>{selectedFiles.length} file(s) selected</p>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
              </button>
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              <p>Uploading images...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="gallery-section">
        <h2>All Images ({images.length})</h2>

        {images.length === 0 ? (
          <div className="empty-state">
            <p>No images uploaded yet. Upload some images to get started!</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {images.map(image => (
              <div key={image.id} className="gallery-item">
                <div className="gallery-item-image">
                  <img
                    src={getImageURL(image.file_path)}
                    alt={image.original_name}
                    loading="lazy"
                  />
                </div>
                <div className="gallery-item-info">
                  <p className="image-name" title={image.original_name}>
                    {image.original_name}
                  </p>
                  <p className="image-meta">
                    {(image.file_size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(image.id)}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Gallery;
