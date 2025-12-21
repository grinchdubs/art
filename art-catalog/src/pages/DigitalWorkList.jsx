import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { digitalWorkAPI, galleryAPI, getImageURL } from '../utils/api';
import { exportDigitalWorksToCSV, exportDigitalWorksToJSON, exportDigitalWorksToText, exportDigitalWorksStats } from '../utils/digitalExportUtils';
import { parseDigitalWorksCSV, downloadDigitalWorksTemplate } from '../utils/digitalImportUtils';
import { parseVideoUrls, getVideoImportExample, fetchVideoTitles } from '../utils/videoImportUtils';
import { fetchNFTsByCreator, matchVideoToNFT } from '../utils/nftUtils';

function DigitalWorkList() {
  const [works, setWorks] = useState([]);
  const [workImages, setWorkImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showVideoImportDialog, setShowVideoImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedImport, setParsedImport] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [videoUrlText, setVideoUrlText] = useState('');
  const [parsedVideos, setParsedVideos] = useState(null);
  const [videoErrors, setVideoErrors] = useState([]);
  const [selectedWorks, setSelectedWorks] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [nftImporting, setNftImporting] = useState(false);
  const [showNftDialog, setShowNftDialog] = useState(false);
  const [nftMatches, setNftMatches] = useState([]);
  const navigate = useNavigate();

  const WALLET_ADDRESS = 'tz1hUfR2FdZSwQQnG4Rj512g2C1R5vF3bUDZ';

  useEffect(() => {
    loadWorks();
  }, []);

  useEffect(() => {
    const handleFocus = () => loadWorks();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  async function loadWorks() {
    try {
      const data = await digitalWorkAPI.getAll();

      // Sort by inventory number (oldest first)
      const sortedData = data.sort((a, b) => {
        if (!a.inventory_number) return 1;
        if (!b.inventory_number) return -1;
        return a.inventory_number.localeCompare(b.inventory_number);
      });

      setWorks(sortedData);

      const images = {};
      for (const work of sortedData) {
        if (work.images && work.images.length > 0 && work.images[0].id) {
          const primaryImage = work.images.find(img => img.is_primary) || work.images[0];
          images[work.id] = getImageURL(primaryImage.file_path);
        }
      }
      setWorkImages(images);
    } catch (error) {
      console.error('Error loading digital works:', error);
    } finally {
      setLoading(false);
    }
  }

  const uniqueFormats = useMemo(() => {
    const formats = [...new Set(works.map(w => w.file_format).filter(Boolean))];
    return formats.sort();
  }, [works]);

  const filteredWorks = useMemo(() => {
    return works.filter(work => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          work.title?.toLowerCase().includes(search) ||
          work.inventory_number?.toLowerCase().includes(search) ||
          work.notes?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (filterFormat && work.file_format !== filterFormat) {
        return false;
      }

      if (filterStatus && work.sale_status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [works, searchTerm, filterFormat, filterStatus]);

  function clearFilters() {
    setSearchTerm('');
    setFilterFormat('');
    setFilterStatus('');
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const result = parseDigitalWorksCSV(csvText);
        setParsedImport(result);
        setImportErrors(result.errors);
      } catch (error) {
        alert(`Error parsing CSV: ${error.message}`);
        setImportFile(null);
      }
    };

    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsedImport || !parsedImport.works || parsedImport.works.length === 0) {
      alert('No valid digital works to import');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const allWorks = await digitalWorkAPI.getAll();

      for (const work of parsedImport.works) {
        try {
          if (!work.inventory_number) {
            const year = work.creation_date
              ? new Date(work.creation_date).getFullYear()
              : new Date().getFullYear();

            let namePart = '';
            if (work.file_format) {
              namePart = work.file_format.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            } else if (work.title) {
              namePart = work.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
            }

            const prefix = `GRNCH-DIG-${year}-${namePart}-`;
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
            work.inventory_number = `${prefix}${newSeriesNumber}`;
          }

          await digitalWorkAPI.create(work);
          successCount++;
        } catch (error) {
          console.error('Error importing work:', error);
          failCount++;
        }
      }

      alert(`Import complete!\nSuccessfully imported: ${successCount}\nFailed: ${failCount}`);
      setShowImportDialog(false);
      setImportFile(null);
      setParsedImport(null);
      setImportErrors([]);
      loadWorks();
    } catch (error) {
      console.error('Error during import:', error);
      alert('Error importing digital works. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  async function handleVideoUrlChange(e) {
    const text = e.target.value;
    setVideoUrlText(text);

    if (text.trim()) {
      const result = parseVideoUrls(text);

      // Fetch actual titles from APIs
      const videosWithTitles = await fetchVideoTitles(result.videos);

      setParsedVideos({ videos: videosWithTitles, errors: result.errors });
      setVideoErrors(result.errors);
    } else {
      setParsedVideos(null);
      setVideoErrors([]);
    }
  }

  async function handleVideoImport() {
    if (!parsedVideos || !parsedVideos.videos || parsedVideos.videos.length === 0) {
      alert('No valid video URLs to import');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Get all existing works once at the start
      const allWorks = await digitalWorkAPI.getAll();
      const year = new Date().getFullYear();

      // Pre-generate all inventory numbers to avoid duplicates
      const inventoryNumbers = new Map(); // platform -> next number

      // Find max numbers for each platform
      allWorks.forEach(work => {
        if (work.inventory_number) {
          const match = work.inventory_number.match(/GRNCH-DIG-\d+-(\w+)-(\d+)$/);
          if (match) {
            const platform = match[1];
            const num = parseInt(match[2], 10);
            if (!inventoryNumbers.has(platform) || inventoryNumbers.get(platform) < num) {
              inventoryNumbers.set(platform, num);
            }
          }
        }
      });

      // Generate inventory numbers for all videos upfront
      parsedVideos.videos.forEach(video => {
        const platform = video.platform.toUpperCase();
        const currentMax = inventoryNumbers.get(platform) || 0;
        const nextNumber = currentMax + 1;
        inventoryNumbers.set(platform, nextNumber);

        const prefix = `GRNCH-DIG-${year}-${platform}-`;
        const newSeriesNumber = String(nextNumber).padStart(3, '0');
        video.inventory_number = `${prefix}${newSeriesNumber}`;
        video.dimensions = 'Variable (Web Video)';
        video.file_size = 'Hosted externally';
      });

      // Now import all videos with pre-assigned inventory numbers
      for (const video of parsedVideos.videos) {
        try {
          await digitalWorkAPI.create(video);

          // Note: Thumbnail URLs are stored in the video object
          // The backend will handle saving the file reference
            }
          }

          successCount++;
        } catch (error) {
          console.error('Error importing video:', error);
          failCount++;
        }
      }

      alert(`Import complete!\nSuccessfully imported: ${successCount} videos\nFailed: ${failCount}`);
      setShowVideoImportDialog(false);
      setVideoUrlText('');
      setParsedVideos(null);
      setVideoErrors([]);
      loadWorks();
    } catch (error) {
      console.error('Error during video import:', error);
      alert('Error importing videos. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function toggleSelectWork(workId) {
    const newSelected = new Set(selectedWorks);
    if (newSelected.has(workId)) {
      newSelected.delete(workId);
    } else {
      newSelected.add(workId);
    }
    setSelectedWorks(newSelected);
    setSelectAll(newSelected.size === filteredWorks.length && filteredWorks.length > 0);
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedWorks(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredWorks.map(w => w.id));
      setSelectedWorks(allIds);
      setSelectAll(true);
    }
  }

  async function handleBatchDelete() {
    if (selectedWorks.size === 0) {
      alert('Please select digital works to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedWorks.size} digital work(s)? This cannot be undone.`)) {
      return;
    }

    try {
      for (const workId of selectedWorks) {
        await digitalWorkAPI.delete(workId);
      }
      setSelectedWorks(new Set());
      setSelectAll(false);
      loadWorks();
    } catch (error) {
      console.error('Error deleting digital works:', error);
      alert('Error deleting some digital works');
    }
  }

  async function handleNFTImport() {
    setNftImporting(true);
    try {
      // Fetch all NFTs for the wallet
      console.log('Fetching NFTs for wallet:', WALLET_ADDRESS);
      const nfts = await fetchNFTsByCreator(WALLET_ADDRESS);
      console.log(`Found ${nfts.length} NFTs`);

      if (nfts.length === 0) {
        alert('No NFTs found for this wallet address');
        setNftImporting(false);
        return;
      }

      // Get all current digital works
      const allWorks = await digitalWorkAPI.getAll();

      // Match NFTs to videos by title
      const matches = [];
      for (const work of allWorks) {
        const matchedNFT = matchVideoToNFT(work.title, nfts);
        if (matchedNFT) {
          matches.push({
            work,
            nft: matchedNFT,
            confirmed: true, // Auto-confirm good matches
          });
        }
      }

      console.log(`Matched ${matches.length} works to NFTs`);
      setNftMatches(matches);
      setShowNftDialog(true);
      setNftImporting(false);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      alert(`Error fetching NFTs: ${error.message}`);
      setNftImporting(false);
    }
  }

  async function confirmNFTMatches() {
    setNftImporting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const match of nftMatches) {
        if (!match.confirmed) continue;

        try {
          // Get price from listings if available
          const listings = match.nft.listings || [];
          const lowestListing = listings.length > 0 ? listings[0] : null;
          const priceInTez = lowestListing ? parseFloat(lowestListing.price) / 1000000 : null;

          await digitalWorkAPI.update(match.work.id, {
            ...match.work,
            nft_token_id: match.nft.token_id,
            nft_contract_address: match.nft.fa_contract,
            nft_blockchain: 'Tezos',
            price: priceInTez ? priceInTez.toString() : match.work.price,
          });
          successCount++;
        } catch (error) {
          console.error(`Error updating work ${match.work.id}:`, error);
          failCount++;
        }
      }

      alert(`NFT data linked!\nSuccess: ${successCount}\nFailed: ${failCount}`);
      setShowNftDialog(false);
      setNftMatches([]);
      loadWorks();
    } catch (error) {
      console.error('Error confirming NFT matches:', error);
      alert('Error linking NFT data');
    } finally {
      setNftImporting(false);
    }
  }

  function toggleNFTMatch(index) {
    const updatedMatches = [...nftMatches];
    updatedMatches[index].confirmed = !updatedMatches[index].confirmed;
    setNftMatches(updatedMatches);
  }

  const hasActiveFilters = searchTerm || filterFormat || filterStatus;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>All Digital Works</h2>
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          {selectedWorks.size > 0 && (
            <button className="btn btn-danger" onClick={handleBatchDelete}>
              Delete Selected ({selectedWorks.size})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
            Export
          </button>
          {showExportMenu && (
            <div className="dropdown-menu">
              <button onClick={() => { exportDigitalWorksToCSV(filteredWorks); setShowExportMenu(false); }}>
                Export as CSV
              </button>
              <button onClick={() => { exportDigitalWorksToJSON(filteredWorks); setShowExportMenu(false); }}>
                Export as JSON
              </button>
              <button onClick={() => { exportDigitalWorksToText(filteredWorks); setShowExportMenu(false); }}>
                Export as Text Report
              </button>
              <button onClick={() => { exportDigitalWorksStats(filteredWorks); setShowExportMenu(false); }}>
                Export Statistics
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={() => setShowImportDialog(true)}>
            Import CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setShowVideoImportDialog(true)}>
            Import Videos
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNFTImport}
            disabled={nftImporting}
          >
            {nftImporting ? 'Fetching NFTs...' : 'Import NFT Data'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/digital-works/new')}>
            Add New Digital Work
          </button>
        </div>
      </div>

      {works.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💾</div>
          <h3>No digital works yet</h3>
          <p>Get started by adding your first digital piece to the catalog</p>
          <button className="btn btn-primary" onClick={() => navigate('/digital-works/new')}>
            Add Your First Digital Work
          </button>
        </div>
      ) : (
        <>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="search">Search</label>
                <input
                  type="text"
                  id="search"
                  className="form-control"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, inventory number, or notes"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filterFormat">File Format</label>
                <select
                  id="filterFormat"
                  className="form-control"
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                >
                  <option value="">All Formats</option>
                  {uniqueFormats.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filterStatus">Sale Status</label>
                <select
                  id="filterStatus"
                  className="form-control"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="not-for-sale">Not for Sale</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                Showing {filteredWorks.length} of {works.length} digital works
              </div>
              {hasActiveFilters && (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredWorks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d', marginBottom: '16px' }}>No digital works match your filters</p>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
                <label style={{ cursor: 'pointer', userSelect: 'none' }} onClick={toggleSelectAll}>
                  Select All
                </label>
              </div>
              <div className="artwork-grid">
                {filteredWorks.map((work) => (
                <div
                  key={work.id}
                  className="artwork-card"
                  onClick={() => navigate(`/digital-works/${work.id}`)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
                    <input
                      type="checkbox"
                      checked={selectedWorks.has(work.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectWork(work.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div className="artwork-card-image">
                    {workImages[work.id] ? (
                      <img src={workImages[work.id]} alt={work.title} />
                    ) : (
                      <div className="artwork-card-placeholder">💾</div>
                    )}
                  </div>
                  <div className="artwork-card-content">
                    <div className="artwork-card-title">{work.title}</div>
                    <div className="artwork-card-meta">{work.inventory_number}</div>
                    <div className="artwork-card-meta">{work.file_format}</div>
                    <div className="artwork-card-meta">
                      <span className={`status-badge status-${work.sale_status}`}>
                        {work.sale_status}
                      </span>
                    </div>
                    <div className="artwork-card-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${work.title}"? This cannot be undone.`)) {
                            digitalWorkAPI.delete(work.id).then(() => {
                              loadWorks();
                            }).catch((error) => {
                              console.error('Error deleting digital work:', error);
                              alert('Error deleting digital work. Please try again.');
                            });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </>
      )}

      {showImportDialog && (
        <div className="modal-overlay" onClick={() => setShowImportDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Import Digital Works from CSV</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
              Upload a CSV file to import multiple digital works at once.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={downloadDigitalWorksTemplate}>
                Download CSV Template
              </button>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ marginBottom: '20px' }}
            />

            {parsedImport && (
              <div style={{ marginTop: '20px' }}>
                <h4>Preview ({parsedImport.works.length} digital works)</h4>

                {importErrors.length > 0 && (
                  <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                    <strong>Warnings ({importErrors.length}):</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                      {importErrors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>Row {error.row}: {error.message}</li>
                      ))}
                      {importErrors.length > 5 && (
                        <li>...and {importErrors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="preview-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Format</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedImport.works.map((work, idx) => (
                        <tr key={idx}>
                          <td>{work.title}</td>
                          <td>{work.file_format || 'N/A'}</td>
                          <td>{work.sale_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                  setParsedImport(null);
                  setImportErrors([]);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!parsedImport || parsedImport.works.length === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${parsedImport?.works.length || 0} Works`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoImportDialog && (
        <div className="modal-overlay" onClick={() => setShowVideoImportDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Import Videos from URLs</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
              Paste YouTube or Vimeo URLs (one per line) to import them as digital works.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Video URLs
              </label>
              <textarea
                className="form-control"
                rows="10"
                placeholder={getVideoImportExample()}
                value={videoUrlText}
                onChange={handleVideoUrlChange}
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
              <small style={{ color: '#7f8c8d', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                Supported: YouTube, Vimeo (paste one URL per line)
              </small>
            </div>

            {parsedVideos && (
              <div style={{ marginTop: '20px' }}>
                <h4>Preview ({parsedVideos.videos.length} videos)</h4>

                {videoErrors.length > 0 && (
                  <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                    <strong>Invalid URLs ({videoErrors.length}):</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                      {videoErrors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>Line {error.line}: {error.message}</li>
                      ))}
                      {videoErrors.length > 5 && (
                        <li>...and {videoErrors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="preview-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Video ID</th>
                        <th>Title</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedVideos.videos.map((video, idx) => (
                        <tr key={idx}>
                          <td>{video.platform}</td>
                          <td style={{ fontFamily: 'monospace' }}>{video.video_id}</td>
                          <td>{video.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowVideoImportDialog(false);
                  setVideoUrlText('');
                  setParsedVideos(null);
                  setVideoErrors([]);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleVideoImport}
                disabled={!parsedVideos || parsedVideos.videos.length === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${parsedVideos?.videos.length || 0} Videos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFT Matching Dialog */}
      {showNftDialog && (
        <div className="modal-overlay" onClick={() => setShowNftDialog(false)}>
          <div className="modal-content import-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h3>Match NFTs to Digital Works</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
              {nftMatches.length} NFT{nftMatches.length !== 1 ? 's' : ''} matched to your videos. Review and confirm the matches below.
            </p>

            {nftMatches.length > 0 ? (
              <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                        <input
                          type="checkbox"
                          checked={nftMatches.every(m => m.confirmed)}
                          onChange={(e) => {
                            const allConfirmed = e.target.checked;
                            setNftMatches(nftMatches.map(m => ({ ...m, confirmed: allConfirmed })));
                          }}
                        />
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Video Title</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>NFT Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Token ID</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Editions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nftMatches.map((match, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={match.confirmed}
                            onChange={() => toggleNFTMatch(idx)}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>{match.work.title}</td>
                        <td style={{ padding: '8px' }}>{match.nft.name}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                          {match.nft.token_id}
                        </td>
                        <td style={{ padding: '8px' }}>{match.nft.supply || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px 0' }}>
                No NFTs could be automatically matched. Try manually editing works to add NFT data.
              </p>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNftDialog(false);
                  setNftMatches([]);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmNFTMatches}
                disabled={nftImporting || !nftMatches.some(m => m.confirmed)}
              >
                {nftImporting ? 'Linking...' : `Link ${nftMatches.filter(m => m.confirmed).length} NFT${nftMatches.filter(m => m.confirmed).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalWorkList;
