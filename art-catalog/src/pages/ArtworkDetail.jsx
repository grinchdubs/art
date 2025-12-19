import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artworkOperations, fileOperations, exhibitionOperations, locationOperations } from '../db';

function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [exhibitions, setExhibitions] = useState([]);
  const [locationHistory, setLocationHistory] = useState([]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtwork();
  }, [id]);

  async function loadArtwork() {
    try {
      const data = await artworkOperations.getById(id);
      setArtwork(data);

      // Load files
      const artworkFiles = await fileOperations.getFilesForArtwork(id);
      setFiles(artworkFiles);
      if (artworkFiles.length > 0) {
        const primary = artworkFiles.find(f => f.is_primary === 1) || artworkFiles[0];
        setSelectedImage(primary.file_path);
      }

      // Load exhibitions
      const artworkExhibitions = await exhibitionOperations.getExhibitionsForArtwork(id);
      setExhibitions(artworkExhibitions);

      // Load location history
      const history = await locationOperations.getHistory(id);
      setLocationHistory(history);
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
      // Add to location history
      await locationOperations.addHistory(id, newLocation, locationNotes);

      // Update artwork's current location
      await artworkOperations.update(id, { ...artwork, location: newLocation });

      // Reset form and close dialog
      setNewLocation('');
      setLocationNotes('');
      setShowLocationDialog(false);

      // Reload artwork data
      loadArtwork();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location. Please try again.');
    }
  }

  async function handleDelete() {
    if (window.confirm('Are you sure you want to delete this work? This cannot be undone.')) {
      try {
        await artworkOperations.delete(id);
        navigate('/artworks');
      } catch (error) {
        console.error('Error deleting work:', error);
        alert('Error deleting work. Please try again.');
      }
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
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/artworks/edit/${id}`)}
            >
              Edit
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        {files.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            {/* Main Image */}
            {selectedImage && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                {selectedImage.startsWith('data:video/') ? (
                  <video
                    controls
                    style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px' }}
                  >
                    <source src={selectedImage} />
                  </video>
                ) : (
                  <img
                    src={selectedImage}
                    alt={artwork.title}
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => window.open(selectedImage, '_blank')}
                  />
                )}
              </div>
            )}

            {/* Thumbnail Gallery */}
            {files.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedImage(file.file_path)}
                    style={{
                      width: '100px',
                      height: '100px',
                      cursor: 'pointer',
                      border: selectedImage === file.file_path ? '3px solid #3498db' : '2px solid #ecf0f1',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    {file.file_type.startsWith('image/') ? (
                      <img
                        src={file.file_path}
                        alt="Thumbnail"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#ecf0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                        🎥
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {/* Location History */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>Location History</h3>
          {locationHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d' }}>No location changes recorded yet</p>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: '#e0e0e0'
              }}></div>

              {locationHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    position: 'relative',
                    marginBottom: '20px',
                    paddingLeft: '20px'
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-8px',
                    top: '4px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: index === 0 ? '#3498db' : '#95a5a6',
                    border: '2px solid white',
                    boxShadow: '0 0 0 2px #e0e0e0'
                  }}></div>

                  <div style={{
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>{entry.location}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {new Date(entry.moved_date).toLocaleString()}
                    </div>
                    {entry.notes && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exhibition History */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>Exhibition History</h3>
          {exhibitions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d' }}>This work has not been exhibited yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exhibitions.map((exhibition) => (
                <div
                  key={exhibition.id}
                  style={{
                    background: 'white',
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
