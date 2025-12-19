import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exhibitionOperations, artworkOperations, fileOperations, digitalExhibitionOperations, digitalWorkOperations, digitalFileOperations } from '../db';

function ExhibitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [digitalWorks, setDigitalWorks] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [allDigitalWorks, setAllDigitalWorks] = useState([]);
  const [artworkImages, setArtworkImages] = useState({});
  const [digitalWorkImages, setDigitalWorkImages] = useState({});
  const [showAddArtwork, setShowAddArtwork] = useState(false);
  const [showAddDigitalWork, setShowAddDigitalWork] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExhibition();
  }, [id]);

  async function loadExhibition() {
    try {
      const data = await exhibitionOperations.getById(id);
      setExhibition(data);

      // Get artworks in this exhibition
      const exhibitionArtworks = await exhibitionOperations.getArtworksForExhibition(id);
      setArtworks(exhibitionArtworks);

      // Load images for artworks
      const images = {};
      for (const artwork of exhibitionArtworks) {
        const files = await fileOperations.getFilesForArtwork(artwork.id);
        const primaryFile = files.find(f => f.is_primary === 1) || files[0];
        if (primaryFile) {
          images[artwork.id] = primaryFile.file_path;
        }
      }
      setArtworkImages(images);

      // Get digital works in this exhibition
      const exhibitionDigitalWorks = await digitalExhibitionOperations.getDigitalWorksForExhibition(id);
      setDigitalWorks(exhibitionDigitalWorks);

      // Load images for digital works
      const digitalImages = {};
      for (const work of exhibitionDigitalWorks) {
        const files = await digitalFileOperations.getFilesForDigitalWork(work.id);
        const primaryFile = files.find(f => f.is_primary === 1) || files[0];
        if (primaryFile) {
          digitalImages[work.id] = primaryFile.file_path;
        }
      }
      setDigitalWorkImages(digitalImages);

      // Load all artworks and digital works for the add dialogs
      const all = await artworkOperations.getAll();
      setAllArtworks(all);

      const allDigital = await digitalWorkOperations.getAll();
      setAllDigitalWorks(allDigital);
    } catch (error) {
      console.error('Error loading exhibition:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (window.confirm('Are you sure you want to delete this exhibition? This cannot be undone.')) {
      try {
        await exhibitionOperations.delete(id);
        navigate('/exhibitions');
      } catch (error) {
        console.error('Error deleting exhibition:', error);
        alert('Error deleting exhibition. Please try again.');
      }
    }
  }

  async function handleAddArtwork(artworkId) {
    try {
      await exhibitionOperations.addArtworkToExhibition(artworkId, id);
      setShowAddArtwork(false);
      loadExhibition(); // Reload to show the new artwork
    } catch (error) {
      console.error('Error adding artwork to exhibition:', error);
      alert('Error adding artwork. Please try again.');
    }
  }

  async function handleRemoveArtwork(artworkId) {
    if (window.confirm('Remove this artwork from the exhibition?')) {
      try {
        await exhibitionOperations.removeArtworkFromExhibition(artworkId, id);
        loadExhibition(); // Reload to update the list
      } catch (error) {
        console.error('Error removing artwork:', error);
        alert('Error removing artwork. Please try again.');
      }
    }
  }

  async function handleAddDigitalWork(digitalWorkId) {
    try {
      await digitalExhibitionOperations.addDigitalWorkToExhibition(digitalWorkId, id);
      setShowAddDigitalWork(false);
      loadExhibition();
    } catch (error) {
      console.error('Error adding digital work to exhibition:', error);
      alert('Error adding digital work. Please try again.');
    }
  }

  async function handleRemoveDigitalWork(digitalWorkId) {
    if (window.confirm('Remove this digital work from the exhibition?')) {
      try {
        await digitalExhibitionOperations.removeDigitalWorkFromExhibition(digitalWorkId, id);
        loadExhibition();
      } catch (error) {
        console.error('Error removing digital work:', error);
        alert('Error removing digital work. Please try again.');
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

  if (!exhibition) {
    return (
      <div className="empty-state">
        <h3>Exhibition not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/exhibitions')}>
          Back to Exhibitions
        </button>
      </div>
    );
  }

  // Filter out artworks already in the exhibition
  const availableArtworks = allArtworks.filter(
    (artwork) => !artworks.some((a) => a.id === artwork.id)
  );

  // Filter out digital works already in the exhibition
  const availableDigitalWorks = allDigitalWorks.filter(
    (work) => !digitalWorks.some((w) => w.id === work.id)
  );

  return (
    <div>
      <div className="detail-view">
        <div className="detail-header">
          <div className="detail-title">
            <h1>{exhibition.name}</h1>
            <div className="detail-inventory">{exhibition.venue}</div>
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/exhibitions/edit/${id}`)}
            >
              Edit
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        <div className="detail-content">
          <div>
            <div className="detail-section">
              <h3>Exhibition Details</h3>
              <div className="detail-field">
                <div className="detail-label">Start Date</div>
                <div className="detail-value">
                  {new Date(exhibition.start_date).toLocaleDateString()}
                </div>
              </div>
              {exhibition.end_date && (
                <div className="detail-field">
                  <div className="detail-label">End Date</div>
                  <div className="detail-value">
                    {new Date(exhibition.end_date).toLocaleDateString()}
                  </div>
                </div>
              )}
              {exhibition.curator && (
                <div className="detail-field">
                  <div className="detail-label">Curator</div>
                  <div className="detail-value">{exhibition.curator}</div>
                </div>
              )}
              {exhibition.website && (
                <div className="detail-field">
                  <div className="detail-label">Website</div>
                  <div className="detail-value">
                    <a href={exhibition.website} target="_blank" rel="noopener noreferrer">
                      {exhibition.website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {exhibition.description && (
              <div className="detail-section">
                <h3>Description</h3>
                <div className="detail-value">{exhibition.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Artworks in this exhibition */}
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Artworks ({artworks.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddArtwork(true)}>
              Add Artwork
            </button>
          </div>

          {artworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d' }}>No artworks in this exhibition yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddArtwork(true)}>
                Add First Artwork
              </button>
            </div>
          ) : (
            <div className="artwork-grid">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="artwork-card">
                  <div className="artwork-card-image" onClick={() => navigate(`/artworks/${artwork.id}`)}>
                    {artworkImages[artwork.id] ? (
                      <img src={artworkImages[artwork.id]} alt={artwork.title} />
                    ) : (
                      '🖼️'
                    )}
                  </div>
                  <div className="artwork-card-content">
                    <div className="artwork-card-title">{artwork.title}</div>
                    <div className="artwork-card-meta">{artwork.inventory_number}</div>
                    <div className="artwork-card-meta">{artwork.medium}</div>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => handleRemoveArtwork(artwork.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add artwork dialog */}
        {showAddArtwork && (
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
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}>
              <h3 style={{ marginBottom: '20px' }}>Add Artwork to Exhibition</h3>
              {availableArtworks.length === 0 ? (
                <p style={{ color: '#7f8c8d' }}>All artworks are already in this exhibition</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {availableArtworks.map((artwork) => (
                    <div
                      key={artwork.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{artwork.title}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {artwork.inventory_number}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddArtwork(artwork.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddArtwork(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Digital Works in this exhibition */}
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Digital Works ({digitalWorks.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddDigitalWork(true)}>
              Add Digital Work
            </button>
          </div>

          {digitalWorks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d' }}>No digital works in this exhibition yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddDigitalWork(true)}>
                Add First Digital Work
              </button>
            </div>
          ) : (
            <div className="artwork-grid">
              {digitalWorks.map((work) => (
                <div key={work.id} className="artwork-card">
                  <div className="artwork-card-image" onClick={() => navigate(`/digital-works/${work.id}`)}>
                    {digitalWorkImages[work.id] ? (
                      <img src={digitalWorkImages[work.id]} alt={work.title} />
                    ) : (
                      '💾'
                    )}
                  </div>
                  <div className="artwork-card-content">
                    <div className="artwork-card-title">{work.title}</div>
                    <div className="artwork-card-meta">{work.inventory_number}</div>
                    <div className="artwork-card-meta">{work.file_format}</div>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => handleRemoveDigitalWork(work.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add digital work dialog */}
        {showAddDigitalWork && (
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
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}>
              <h3 style={{ marginBottom: '20px' }}>Add Digital Work to Exhibition</h3>
              {availableDigitalWorks.length === 0 ? (
                <p style={{ color: '#7f8c8d' }}>All digital works are already in this exhibition</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {availableDigitalWorks.map((work) => (
                    <div
                      key={work.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{work.title}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {work.inventory_number} • {work.file_format}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddDigitalWork(work.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddDigitalWork(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/exhibitions')}>
            Back to All Exhibitions
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExhibitionDetail;
