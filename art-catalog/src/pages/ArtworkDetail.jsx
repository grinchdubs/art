import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artworkAPI, salesAPI, getImageURL } from '../utils/api';
import ImageLightbox from '../components/ImageLightbox';

function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allArtworkIds, setAllArtworkIds] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    loadArtwork();
    loadAllArtworkIds();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input or if there are open dialogs/prompts
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (lightboxOpen) {
            setLightboxOpen(false);
          } else if (showLocationDialog) {
            setShowLocationDialog(false);
          } else if (showShortcuts) {
            setShowShortcuts(false);
          }
          // Removed navigation on Escape to prevent conflicts with prompt dialogs
          break;
        case 'ArrowLeft':
          navigateToPrevious();
          break;
        case 'ArrowRight':
          navigateToNext();
          break;
        case '?':
          setShowShortcuts(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id, lightboxOpen, showLocationDialog, showShortcuts, allArtworkIds]);

  async function loadAllArtworkIds() {
    try {
      const artworks = await artworkAPI.getAll();
      setAllArtworkIds(artworks.map(a => a.id));
    } catch (error) {
      console.error('Error loading artwork IDs:', error);
    }
  }

  function navigateToPrevious() {
    const currentIndex = allArtworkIds.indexOf(parseInt(id));
    if (currentIndex > 0) {
      navigate(`/artworks/${allArtworkIds[currentIndex - 1]}`);
    }
  }

  function navigateToNext() {
    const currentIndex = allArtworkIds.indexOf(parseInt(id));
    if (currentIndex < allArtworkIds.length - 1) {
      navigate(`/artworks/${allArtworkIds[currentIndex + 1]}`);
    }
  }

  async function loadArtwork() {
    try {
      const data = await artworkAPI.getById(id);
      setArtwork(data);

      // Set primary image or first image
      if (data.images && data.images.length > 0 && data.images[0].id) {
        const primary = data.images.find(img => img.is_primary);
        const imageToShow = primary || data.images[0];
        setSelectedImage(imageToShow.file_path);
      }
    } catch (error) {
      console.error('Error loading artwork:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLocationChange() {
    if (!newLocation.trim()) {
      alert('Please enter a location');
      return;
    }

    try {
      await artworkAPI.addLocationHistory(id, { location: newLocation, notes: locationNotes });

      setNewLocation('');
      setLocationNotes('');
      setShowLocationDialog(false);

      loadArtwork();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location. Please try again.');
    }
  }

  async function handleDelete() {
    if (window.confirm('Are you sure you want to delete this work? This cannot be undone.')) {
      try {
        await artworkAPI.delete(id);
        navigate('/artworks');
      } catch (error) {
        console.error('Error deleting work:', error);
        alert('Error deleting work. Please try again.');
      }
    }
  }

  async function handleRecordSale(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('handleRecordSale called');
    const saleDate = prompt('Sale date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    console.log('saleDate:', saleDate);
    if (!saleDate) {
      console.log('Sale cancelled - no date provided');
      return;
    }

    const salePrice = prompt('Sale price (optional):');
    const buyerName = prompt('Buyer name (optional):');
    const buyerEmail = prompt('Buyer email (optional):');
    const platform = prompt('Platform (optional - e.g., Etsy, Direct, Gallery):');
    const notes = prompt('Notes (optional):');

    try {
      await salesAPI.create({
        artwork_id: id,
        sale_date: saleDate,
        sale_price: salePrice || null,
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        platform: platform || null,
        notes: notes || null,
      });
      alert('Sale recorded successfully!');
      loadArtwork(); // Reload to update status
    } catch (error) {
      console.error('Error recording sale:', error);
      alert('Failed to record sale. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="empty-state">
        <h3>Work not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/artworks')}>
          Back to Works
        </button>
      </div>
    );
  }

  const images = artwork.images && artwork.images.length > 0 && artwork.images[0].id ? artwork.images : [];
  const exhibitions = artwork.exhibitions && artwork.exhibitions.length > 0 && artwork.exhibitions[0].id ? artwork.exhibitions : [];

  return (
    <div>
      <div className="detail-view">
        <div className="detail-header">
          <div className="detail-title">
            <h1>{artwork.title}</h1>
            <div className="detail-inventory">{artwork.inventory_number}</div>
          </div>
          <div className="detail-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/artworks/edit/${id}`)}
            >
              Edit
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
            {artwork.sale_status !== 'sold' && (
              <button type="button" className="btn btn-success btn-sm" onClick={handleRecordSale}>
                Record Sale
              </button>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            {/* Main Image */}
            {selectedImage && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img
                  src={getImageURL(selectedImage)}
                  alt={artwork.title}
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px', cursor: 'zoom-in' }}
                  onClick={() => {
                    const index = images.findIndex(img => img.file_path === selectedImage);
                    setLightboxIndex(index >= 0 ? index : 0);
                    setLightboxOpen(true);
                  }}
                />
              </div>
            )}

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    onClick={() => setSelectedImage(image.file_path)}
                    style={{
                      width: '100px',
                      height: '100px',
                      cursor: 'pointer',
                      border: selectedImage === image.file_path ? '3px solid #3498db' : '2px solid #ecf0f1',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    <img
                      src={getImageURL(image.file_path)}
                      alt="Thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image Lightbox */}
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images.map(img => ({
              url: getImageURL(img.file_path),
              alt: artwork.title,
              name: img.original_name || img.filename
            }))}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}

        <div className="detail-content">
          <div>
            <div className="detail-section">
              <h3>Basic Information</h3>
              <div className="detail-field">
                <div className="detail-label">Creation Date</div>
                <div className="detail-value">
                  {artwork.creation_date
                    ? new Date(artwork.creation_date).toLocaleDateString()
                    : 'Not specified'}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Medium</div>
                <div className="detail-value">{artwork.medium || 'Not specified'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Dimensions</div>
                <div className="detail-value">{artwork.dimensions || 'Not specified'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Series/Collection</div>
                <div className="detail-value">{artwork.series_name || 'None'}</div>
              </div>
            </div>

            {artwork.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <div className="detail-value">{artwork.notes}</div>
              </div>
            )}

            {artwork.tags && artwork.tags.length > 0 && artwork.tags[0].id && (
              <div className="detail-section">
                <h3>Tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {artwork.tags.map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: tag.color
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="detail-section">
              <h3>Status & Location</h3>
              <div className="detail-field">
                <div className="detail-label">Sale Status</div>
                <div className="detail-value">
                  <span className={`status-badge status-${artwork.sale_status}`}>
                    {artwork.sale_status}
                  </span>
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Price</div>
                <div className="detail-value">{artwork.price || 'Not specified'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Current Location</div>
                <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>{artwork.location || 'Not specified'}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowLocationDialog(true)}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    Change Location
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Metadata</h3>
              <div className="detail-field">
                <div className="detail-label">Added to Catalog</div>
                <div className="detail-value">
                  {new Date(artwork.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Last Updated</div>
                <div className="detail-value">
                  {new Date(artwork.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exhibition History */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>Exhibition History</h3>
          {exhibitions.length === 0 ? (
            <div className="history-empty-state">
              <p>This work has not been exhibited yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exhibitions.map((exhibition) => (
                <div
                  key={exhibition.id}
                  className="exhibition-item"
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => navigate(`/exhibitions/${exhibition.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{exhibition.name}</div>
                  <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                    {exhibition.venue} • {new Date(exhibition.start_date).toLocaleDateString()}
                    {exhibition.end_date && ` - ${new Date(exhibition.end_date).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location Change Dialog */}
        {showLocationDialog && (
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
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Change Location</h3>

              <div className="form-group">
                <label>New Location *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Studio, Storage Unit A, Gallery..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  className="form-control"
                  placeholder="Additional details about this location change..."
                  value={locationNotes}
                  onChange={(e) => setLocationNotes(e.target.value)}
                  rows="3"
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLocationDialog(false);
                    setNewLocation('');
                    setLocationNotes('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleLocationChange}
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={() => setShowShortcuts(false)}
          >
            <div
              style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                maxWidth: '400px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Keyboard Shortcuts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>ESC</span>
                  <span style={{ color: '#7f8c8d' }}>Go back or close dialogs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>← →</span>
                  <span style={{ color: '#7f8c8d' }}>Navigate artworks</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>?</span>
                  <span style={{ color: '#7f8c8d' }}>Show this help</span>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowShortcuts(false)}
                style={{ marginTop: '20px', width: '100%' }}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/artworks')}>
            Back to All Works
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArtworkDetail;
