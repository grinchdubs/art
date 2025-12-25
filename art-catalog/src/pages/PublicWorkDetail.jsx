import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI, getImageURL } from '../utils/api';

function PublicWorkDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadWork();
  }, [type, id]);

  async function loadWork() {
    try {
      let data;
      if (type === 'artwork') {
        data = await publicAPI.getArtworkById(id);
      } else if (type === 'digital-work') {
        data = await publicAPI.getDigitalWorkById(id);
      }
      setWork(data);
    } catch (error) {
      console.error('Error loading work:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!work) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        color: '#7f8c8d'
      }}>
        <p style={{ fontSize: '18px', marginBottom: '16px' }}>Work not found</p>
        <button 
          onClick={() => navigate('/public')}
          style={{
            padding: '10px 20px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Gallery
        </button>
      </div>
    );
  }

  const images = work.images || [];
  const currentImage = images[selectedImageIndex];

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Back button */}
      <button 
        onClick={() => navigate('/public')}
        style={{
          padding: '8px 16px',
          background: '#ecf0f1',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#2c3e50'
        }}
      >
        ← Back to Gallery
      </button>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '48px',
        '@media (max-width: 768px)': {
          gridTemplateColumns: '1fr'
        }
      }}>
        {/* Image section */}
        <div>
          {images.length > 0 ? (
            <>
              <div style={{ 
                width: '100%', 
                paddingTop: '100%', 
                position: 'relative',
                background: '#f0f0f0',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                <img
                  src={getImageURL(currentImage.file_path)}
                  alt={work.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  overflowX: 'auto',
                  paddingBottom: '8px'
                }}>
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageIndex(index)}
                      style={{
                        width: '80px',
                        height: '80px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: index === selectedImageIndex ? '2px solid #3498db' : '2px solid transparent',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={getImageURL(img.file_path)}
                        alt={`View ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              background: '#f0f0f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '64px',
                color: '#bbb'
              }}>
                🖼️
              </div>
            </div>
          )}
        </div>

        {/* Info section */}
        <div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: '300', 
            marginBottom: '16px',
            color: '#2c3e50'
          }}>
            {work.title || 'Untitled'}
          </h1>

          {work.series_name && (
            <div style={{ 
              fontSize: '16px', 
              color: '#7f8c8d',
              fontStyle: 'italic',
              marginBottom: '24px'
            }}>
              Part of: {work.series_name}
            </div>
          )}

          <div style={{ 
            borderTop: '1px solid #e0e0e0',
            paddingTop: '24px',
            marginTop: '24px'
          }}>
            <InfoRow label="Type" value={type === 'artwork' ? 'Physical Artwork' : 'Digital Work'} />
            
            {work.creation_date && (
              <InfoRow 
                label="Created" 
                value={new Date(work.creation_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} 
              />
            )}

            {type === 'artwork' && (
              <>
                {work.medium && <InfoRow label="Medium" value={work.medium} />}
                {work.dimensions && <InfoRow label="Dimensions" value={work.dimensions} />}
              </>
            )}

            {type === 'digital-work' && (
              <>
                {work.file_format && <InfoRow label="Format" value={work.file_format} />}
                {work.dimensions && <InfoRow label="Dimensions" value={work.dimensions} />}
                {work.file_size && <InfoRow label="File Size" value={work.file_size} />}
                {work.license_type && <InfoRow label="License" value={work.license_type} />}
              </>
            )}

            {work.inventory_number && (
              <InfoRow label="Inventory" value={work.inventory_number} />
            )}

            {/* Tags */}
            {work.tags && work.tags.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#2c3e50',
                  marginBottom: '8px'
                }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {work.tags.map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        padding: '4px 12px',
                        background: tag.color || '#95a5a6',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {work.notes && (
              <div style={{ 
                marginTop: '32px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #3498db'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#2c3e50',
                  marginBottom: '8px'
                }}>
                  About
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#555',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {work.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ 
      display: 'flex', 
      marginBottom: '16px',
      fontSize: '15px'
    }}>
      <div style={{ 
        width: '140px', 
        fontWeight: '600', 
        color: '#2c3e50',
        flexShrink: 0
      }}>
        {label}:
      </div>
      <div style={{ color: '#555' }}>
        {value}
      </div>
    </div>
  );
}

export default PublicWorkDetail;
