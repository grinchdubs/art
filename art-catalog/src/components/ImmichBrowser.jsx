import { useState, useEffect } from 'react';
import { fetchImmichAssets, searchImmichAssets, getImmichThumbnailUrl, downloadImmichImage, fetchImmichAlbums, fetchAlbumAssets } from '../utils/immichUtils';

function ImmichBrowser({ isOpen, onClose, onImport }) {
  const [assets, setAssets] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('recent'); // 'recent' or 'albums'
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRecentAssets();
      loadAlbums();
    }
  }, [isOpen]);

  async function loadRecentAssets() {
    setLoading(true);
    try {
      const data = await fetchImmichAssets(1, 50);
      setAssets(data);
    } catch (error) {
      console.error('Failed to load Immich assets:', error);
      alert('Failed to connect to Immich server. Please check the connection.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAlbums() {
    try {
      const data = await fetchImmichAlbums();
      setAlbums(data);
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadRecentAssets();
      return;
    }

    setLoading(true);
    try {
      const results = await searchImmichAssets(searchQuery);
      setAssets(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAlbumSelect(album) {
    setSelectedAlbum(album);
    setLoading(true);
    try {
      const albumAssets = await fetchAlbumAssets(album.id);
      setAssets(albumAssets);
    } catch (error) {
      console.error('Failed to load album assets:', error);
      alert('Failed to load album photos.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAssetSelection(assetId) {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
  }

  async function handleImport() {
    if (selectedAssets.size === 0) {
      alert('Please select at least one image');
      return;
    }

    setImporting(true);
    try {
      const files = [];
      for (const assetId of selectedAssets) {
        const asset = assets.find(a => a.id === assetId);
        const filename = asset?.originalFileName || `immich-${assetId}.jpg`;
        const file = await downloadImmichImage(assetId, filename);
        files.push(file);
      }

      onImport(files);
      setSelectedAssets(new Set());
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import images. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📷 Import from Immich</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '12px'
        }}>
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 24px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Search
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedAlbum(null);
              loadRecentAssets();
            }}
            style={{
              padding: '10px 24px',
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Reset
          </button>
        </div>

        {/* View Tabs */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => {
              setCurrentView('recent');
              setSelectedAlbum(null);
              loadRecentAssets();
            }}
            style={{
              padding: '8px 16px',
              background: currentView === 'recent' ? '#3498db' : '#ecf0f1',
              color: currentView === 'recent' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Recent Photos
          </button>
          <button
            onClick={() => setCurrentView('albums')}
            style={{
              padding: '8px 16px',
              background: currentView === 'albums' ? '#3498db' : '#ecf0f1',
              color: currentView === 'albums' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Albums ({albums.length})
          </button>
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div>Loading...</div>
            </div>
          ) : currentView === 'albums' ? (
            <div>
              {selectedAlbum ? (
                <div>
                  <button
                    onClick={() => {
                      setSelectedAlbum(null);
                      loadRecentAssets();
                    }}
                    style={{
                      marginBottom: '16px',
                      padding: '8px 16px',
                      background: '#ecf0f1',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Albums
                  </button>
                  <h3 style={{ marginBottom: '16px' }}>{selectedAlbum.albumName}</h3>
                  {renderAssetGrid()}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {albums.map(album => (
                    <div
                      key={album.id}
                      onClick={() => handleAlbumSelect(album)}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        fontSize: '48px',
                        marginBottom: '8px'
                      }}>
                        📁
                      </div>
                      <div style={{
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {album.albumName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#7f8c8d'
                      }}>
                        {album.assetCount} photos
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            renderAssetGrid()
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            {selectedAssets.size} photo{selectedAssets.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={importing}
              style={{
                padding: '10px 24px',
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: importing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: importing ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedAssets.size === 0 || importing}
              style={{
                padding: '10px 24px',
                background: selectedAssets.size === 0 || importing ? '#bdc3c7' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedAssets.size === 0 || importing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {importing ? 'Importing...' : `Import ${selectedAssets.size} Photo${selectedAssets.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function renderAssetGrid() {
    if (assets.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          No photos found
        </div>
      );
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {assets.map(asset => {
          const isSelected = selectedAssets.has(asset.id);
          return (
            <div
              key={asset.id}
              onClick={() => toggleAssetSelection(asset.id)}
              style={{
                position: 'relative',
                paddingTop: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: isSelected ? '3px solid #3498db' : '1px solid #ddd',
                transition: 'all 0.2s'
              }}
            >
              <img
                src={getImmichThumbnailUrl(asset.id)}
                alt=""
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#3498db',
                  color: 'white',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
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
          );
        })}
      </div>
    );
  }
}

export default ImmichBrowser;
