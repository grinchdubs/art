import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { digitalWorkOperations, digitalFileOperations, digitalExhibitionOperations } from '../db';
import { getVideoEmbedUrl } from '../utils/videoImportUtils';

function DigitalWorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [files, setFiles] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWork();
  }, [id]);

  async function loadWork() {
    try {
      const workData = await digitalWorkOperations.getById(id);
      if (!workData) {
        alert('Digital work not found');
        navigate('/digital-works');
        return;
      }

      setWork(workData);

      const filesData = await digitalFileOperations.getFilesForDigitalWork(id);
      setFiles(filesData);

      const exhibitionsData = await digitalExhibitionOperations.getExhibitionsForDigitalWork(id);
      setExhibitions(exhibitionsData);
    } catch (error) {
      console.error('Error loading digital work:', error);
      alert('Error loading digital work');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (window.confirm(`Are you sure you want to delete "${work.title}"? This cannot be undone.`)) {
      try {
        await digitalWorkOperations.delete(id);
        navigate('/digital-works');
      } catch (error) {
        console.error('Error deleting digital work:', error);
        alert('Error deleting digital work');
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

  if (!work) {
    return <div>Digital work not found</div>;
  }

  const primaryFile = files.find(f => f.is_primary === 1) || files[0];

  return (
    <div>
      <div className="page-header">
        <h2>{work.title}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/digital-works/edit/${id}`)}
          >
            Edit
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-container">
        <div className="detail-grid">
          <div className="detail-main">
            {work.embed_url && (
              <div className="detail-image-section">
                <iframe
                  src={work.embed_url}
                  title={work.title}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {work.video_url && (
                  <div style={{ marginTop: '12px', fontSize: '14px' }}>
                    <a href={work.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>
                      Open on {work.platform} ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {!work.embed_url && primaryFile && (
              <div className="detail-image-section">
                {primaryFile.file_type.startsWith('image/') ? (
                  <img
                    src={primaryFile.file_path}
                    alt={work.title}
                    style={{
                      width: '100%',
                      maxHeight: '600px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <video
                    src={primaryFile.file_path}
                    controls
                    style={{
                      width: '100%',
                      maxHeight: '600px',
                      borderRadius: '8px',
                    }}
                  />
                )}
              </div>
            )}

            {files.length > 1 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>All Files</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {files.map((file) => (
                    <div key={file.id} style={{ position: 'relative' }}>
                      {file.file_type.startsWith('image/') ? (
                        <img
                          src={file.file_path}
                          alt="Digital Work"
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <div
                          className="file-placeholder"
                          style={{
                            width: '100%',
                            height: '150px',
                            background: '#ecf0f1',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                          }}
                        >
                          🎥
                        </div>
                      )}
                      {file.is_primary === 1 && (
                        <div
                          className="primary-badge"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(52, 152, 219, 0.9)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="detail-sidebar">
            <h3>Details</h3>

            <div className="detail-field">
              <div className="detail-label">Inventory Number</div>
              <div className="detail-value">{work.inventory_number || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">Creation Date</div>
              <div className="detail-value">{work.creation_date || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">File Format</div>
              <div className="detail-value">{work.file_format || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">File Size</div>
              <div className="detail-value">{work.file_size || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">Dimensions</div>
              <div className="detail-value">{work.dimensions || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">Sale Status</div>
              <div className="detail-value">
                <span className={`status-badge status-${work.sale_status}`}>
                  {work.sale_status}
                </span>
              </div>
            </div>

            <div className="detail-field">
              <div className="detail-label">Price</div>
              <div className="detail-value">{work.price || 'Not specified'}</div>
            </div>

            <div className="detail-field">
              <div className="detail-label">License Type</div>
              <div className="detail-value">{work.license_type || 'Not specified'}</div>
            </div>

            {/* NFT Information */}
            {(work.nft_token_id || work.nft_contract_address || work.nft_blockchain) && (
              <>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>NFT Information</h4>
                </div>

                {work.nft_blockchain && (
                  <div className="detail-field">
                    <div className="detail-label">Blockchain</div>
                    <div className="detail-value">{work.nft_blockchain}</div>
                  </div>
                )}

                {work.nft_token_id && (
                  <div className="detail-field">
                    <div className="detail-label">Token ID</div>
                    <div className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {work.nft_token_id}
                    </div>
                  </div>
                )}

                {work.nft_contract_address && (
                  <div className="detail-field">
                    <div className="detail-label">Contract Address</div>
                    <div className="detail-value" style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                      {work.nft_contract_address}
                    </div>
                  </div>
                )}

                {work.nft_token_id && work.nft_contract_address && (
                  <div className="detail-field">
                    <div className="detail-label">View on objkt.com</div>
                    <div className="detail-value">
                      <a
                        href={`https://objkt.com/asset/${work.nft_contract_address}/${work.nft_token_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3498db' }}
                      >
                        View NFT ↗
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {work.notes && (
              <div className="detail-field">
                <div className="detail-label">Notes</div>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                  {work.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exhibition History */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>Exhibition History</h3>
          {exhibitions.length === 0 ? (
            <div className="empty-exhibition-state" style={{ textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d' }}>This digital work has not been exhibited yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exhibitions.map((exhibition) => (
                <div
                  key={exhibition.id}
                  className="exhibition-card"
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
                  <div className="exhibition-name" style={{ fontWeight: '500', marginBottom: '4px' }}>{exhibition.name}</div>
                  <div className="exhibition-meta" style={{ fontSize: '14px', color: '#7f8c8d' }}>
                    {exhibition.venue} • {new Date(exhibition.start_date).toLocaleDateString()}
                    {exhibition.end_date && ` - ${new Date(exhibition.end_date).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DigitalWorkDetail;
