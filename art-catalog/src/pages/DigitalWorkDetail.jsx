import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { digitalWorkAPI, salesAPI, getImageURL } from '../utils/api';
import { getVideoEmbedUrl } from '../utils/videoImportUtils';
import { fetchTezosPrice, formatPriceWithUSD } from '../utils/nftUtils';
import ImageLightbox from '../components/ImageLightbox';

function DigitalWorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [files, setFiles] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xtzUsdRate, setXtzUsdRate] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allWorkIds, setAllWorkIds] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    loadWork();
    loadTezosPrice();
    loadAllWorkIds();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (lightboxOpen) {
            setLightboxOpen(false);
          } else if (showShortcuts) {
            setShowShortcuts(false);
          } else {
            navigate('/digital-works');
          }
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
  }, [id, lightboxOpen, showShortcuts, allWorkIds]);

  async function loadAllWorkIds() {
    try {
      const works = await digitalWorkAPI.getAll();
      setAllWorkIds(works.map(w => w.id));
    } catch (error) {
      console.error('Error loading work IDs:', error);
    }
  }

  function navigateToPrevious() {
    const currentIndex = allWorkIds.indexOf(parseInt(id));
    if (currentIndex > 0) {
      navigate(`/digital-works/${allWorkIds[currentIndex - 1]}`);
    }
  }

  function navigateToNext() {
    const currentIndex = allWorkIds.indexOf(parseInt(id));
    if (currentIndex < allWorkIds.length - 1) {
      navigate(`/digital-works/${allWorkIds[currentIndex + 1]}`);
    }
  }

  async function loadWork() {
    try {
      const workData = await digitalWorkAPI.getById(id);
      if (!workData) {
        alert('Digital work not found');
        navigate('/digital-works');
        return;
      }

      setWork(workData);

      // Files are now included in the work data from API
      if (workData.images && workData.images.length > 0 && workData.images[0].id) {
        setFiles(workData.images);
      }

      // Exhibitions are included in the work data from API
      if (workData.exhibitions && workData.exhibitions.length > 0 && workData.exhibitions[0].id) {
        setExhibitions(workData.exhibitions);
      }
    } catch (error) {
      console.error('Error loading digital work:', error);
      alert('Error loading digital work');
    } finally {
      setLoading(false);
    }
  }

  async function loadTezosPrice() {
    try {
      const rate = await fetchTezosPrice();
      setXtzUsdRate(rate);
    } catch (error) {
      console.error('Error loading Tezos price:', error);
    }
  }

  async function handleDelete() {
    if (window.confirm(`Are you sure you want to delete "${work.title}"? This cannot be undone.`)) {
      try {
        await digitalWorkAPI.delete(id);
        navigate('/digital-works');
      } catch (error) {
        console.error('Error deleting digital work:', error);
        alert('Error deleting digital work');
      }
    }
  }

  async function handleRecordSale(e) {
    if (e) e.preventDefault();
    const saleDate = prompt('Sale date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!saleDate) return;

    const salePrice = prompt('Sale price (optional):');
    const buyerName = prompt('Buyer name (optional):');
    const buyerEmail = prompt('Buyer email (optional):');
    const platform = prompt('Platform (optional - e.g., fxhash, Tezos marketplace, Direct):');
    const notes = prompt('Notes (optional):');

    try {
      await salesAPI.create({
        digital_work_id: id,
        sale_date: saleDate,
        sale_price: salePrice || null,
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        platform: platform || null,
        notes: notes || null,
      });
      alert('Sale recorded successfully!');
      loadWork(); // Reload to update status
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
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/digital-works/edit/${id}`)}
          >
            Edit
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
          {work.sale_status !== 'sold' && (
            <button type="button" className="btn btn-success" onClick={handleRecordSale}>
              Record Sale
            </button>
          )}
        </div>
      </div>

      <div>
        <div>
          <div>
            {work.embed_url && (
              <div className="detail-image-section">
                <div style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%', // 16:9 aspect ratio
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '8px',
                  background: '#000'
                }}>
                  <iframe
                    src={work.embed_url}
                    title={work.title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {work.video_url && (
                  <div style={{ marginTop: '12px', fontSize: '14px' }}>
                    <a href={work.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>
                      Open on {work.platform} ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {!work.embed_url && files.length > 0 && (
              <div className="detail-image-section">
                {files.filter(f => f.file_path).length > 0 && (
                  <>
                    <img
                      src={getImageURL(files.find(f => f.is_primary)?.file_path || files[0].file_path)}
                      alt={work.title}
                      style={{
                        width: '100%',
                        maxHeight: '900px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => {
                        setLightboxIndex(0);
                        setLightboxOpen(true);
                      }}
                    />
                    
                    {/* Thumbnail strip for multiple images */}
                    {files.length > 1 && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {files.map((file, index) => (
                          <div
                            key={file.id}
                            style={{
                              width: '80px',
                              height: '80px',
                              cursor: 'pointer',
                              border: '2px solid #ecf0f1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => {
                              setLightboxIndex(index);
                              setLightboxOpen(true);
                            }}
                          >
                            <img
                              src={getImageURL(file.file_path)}
                              alt="Thumbnail"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Image Lightbox */}
            {lightboxOpen && files.length > 0 && (
              <ImageLightbox
                images={files.map(file => ({
                  url: getImageURL(file.file_path),
                  alt: work.title,
                  name: file.original_name || file.filename
                }))}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxOpen(false)}
              />
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
              <div className="detail-value">
                {work.price
                  ? (xtzUsdRate > 0
                      ? formatPriceWithUSD(parseFloat(work.price), xtzUsdRate)
                      : work.price)
                  : 'Not specified'}
              </div>
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

            {work.tags && work.tags.length > 0 && work.tags[0].id && (
              <div className="detail-field">
                <div className="detail-label">Tags</div>
                <div className="detail-value">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {work.tags.map(tag => (
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

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Keyboard Shortcuts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <kbd style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', fontFamily: 'monospace' }}>ESC</kbd>
                <span>Close lightbox / Go back to list</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <kbd style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', fontFamily: 'monospace' }}>←</kbd>
                <span>Previous digital work</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <kbd style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', fontFamily: 'monospace' }}>→</kbd>
                <span>Next digital work</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <kbd style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', fontFamily: 'monospace' }}>?</kbd>
                <span>Show this help</span>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              style={{
                marginTop: '24px',
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalWorkDetail;
