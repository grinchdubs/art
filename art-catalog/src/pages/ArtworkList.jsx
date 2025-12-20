import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { artworkOperations, fileOperations } from '../db';
import { exportToCSV, exportToJSON, exportToText, exportStats } from '../utils/exportUtils';
import { parseCSV, downloadTemplate } from '../utils/importUtils';

function ArtworkList() {
  const [artworks, setArtworks] = useState([]);
  const [artworkImages, setArtworkImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedImport, setParsedImport] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  // Batch selection states
  const [selectedArtworks, setSelectedArtworks] = useState(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
  const [batchLocation, setBatchLocation] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMedium, setFilterMedium] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    loadArtworks();
  }, []);

  // Also reload when window gets focus (in case data changed)
  useEffect(() => {
    const handleFocus = () => loadArtworks();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  async function loadArtworks() {
    try {
      const data = await artworkOperations.getAll();
      setArtworks(data);

      // Load primary image for each artwork
      const images = {};
      for (const artwork of data) {
        const files = await fileOperations.getFilesForArtwork(artwork.id);
        const primaryFile = files.find(f => f.is_primary === 1) || files[0];
        if (primaryFile) {
          images[artwork.id] = primaryFile.file_path;
        }
      }
      setArtworkImages(images);
    } catch (error) {
      console.error('Error loading artworks:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get unique values for filter dropdowns
  const uniqueMediums = useMemo(() => {
    const mediums = [...new Set(artworks.map(a => a.medium).filter(Boolean))];
    return mediums.sort();
  }, [artworks]);

  const uniqueSeries = useMemo(() => {
    const series = [...new Set(artworks.map(a => a.series_name).filter(Boolean))];
    return series.sort();
  }, [artworks]);

  // Filter artworks based on all criteria
  const filteredArtworks = useMemo(() => {
    return artworks.filter(artwork => {
      // Text search (title, inventory number, notes)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          artwork.title?.toLowerCase().includes(search) ||
          artwork.inventory_number?.toLowerCase().includes(search) ||
          artwork.notes?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filter by medium
      if (filterMedium && artwork.medium !== filterMedium) {
        return false;
      }

      // Filter by status
      if (filterStatus && artwork.sale_status !== filterStatus) {
        return false;
      }

      // Filter by series
      if (filterSeries && artwork.series_name !== filterSeries) {
        return false;
      }

      // Filter by date range
      if (filterDateFrom && artwork.creation_date) {
        if (new Date(artwork.creation_date) < new Date(filterDateFrom)) {
          return false;
        }
      }

      if (filterDateTo && artwork.creation_date) {
        if (new Date(artwork.creation_date) > new Date(filterDateTo)) {
          return false;
        }
      }

      return true;
    });
  }, [artworks, searchTerm, filterMedium, filterStatus, filterSeries, filterDateFrom, filterDateTo]);

  function clearFilters() {
    setSearchTerm('');
    setFilterMedium('');
    setFilterStatus('');
    setFilterSeries('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  // Batch operation functions
  function toggleArtworkSelection(artworkId) {
    setSelectedArtworks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artworkId)) {
        newSet.delete(artworkId);
      } else {
        newSet.add(artworkId);
      }
      return newSet;
    });
  }

  function selectAllArtworks() {
    setSelectedArtworks(new Set(filteredArtworks.map(a => a.id)));
  }

  function deselectAllArtworks() {
    setSelectedArtworks(new Set());
  }

  async function handleBatchUpdateStatus() {
    if (!batchStatus) {
      alert('Please select a status');
      return;
    }

    try {
      for (const artworkId of selectedArtworks) {
        const artwork = artworks.find(a => a.id === artworkId);
        if (artwork) {
          await artworkOperations.update(artworkId, { ...artwork, sale_status: batchStatus });
        }
      }
      await loadArtworks();
      setShowBatchActions(false);
      setBatchStatus('');
      setSelectedArtworks(new Set());
      alert(`Updated ${selectedArtworks.size} artworks`);
    } catch (error) {
      console.error('Error updating artworks:', error);
      alert('Error updating artworks. Please try again.');
    }
  }

  async function handleBatchUpdateLocation() {
    if (!batchLocation.trim()) {
      alert('Please enter a location');
      return;
    }

    try {
      for (const artworkId of selectedArtworks) {
        const artwork = artworks.find(a => a.id === artworkId);
        if (artwork) {
          await artworkOperations.update(artworkId, { ...artwork, location: batchLocation });
        }
      }
      await loadArtworks();
      setShowBatchActions(false);
      setBatchLocation('');
      setSelectedArtworks(new Set());
      alert(`Updated ${selectedArtworks.size} artworks`);
    } catch (error) {
      console.error('Error updating artworks:', error);
      alert('Error updating artworks. Please try again.');
    }
  }

  async function handleBatchDelete() {
    if (!window.confirm(`Are you sure you want to delete ${selectedArtworks.size} artworks? This cannot be undone.`)) {
      return;
    }

    try {
      for (const artworkId of selectedArtworks) {
        await artworkOperations.delete(artworkId);
      }
      await loadArtworks();
      setSelectedArtworks(new Set());
      alert(`Deleted ${selectedArtworks.size} artworks`);
    } catch (error) {
      console.error('Error deleting artworks:', error);
      alert('Error deleting artworks. Please try again.');
    }
  }

  // Import functions
  function handleImportFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setImportFile(file);

    // Read and parse the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const { artworks, errors } = parseCSV(csvText);
        setParsedImport(artworks);
        setImportErrors(errors);
      } catch (error) {
        alert(`Error parsing CSV: ${error.message}`);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  }

  async function generateInventoryNumber(artwork, existingArtworks) {
    // If artwork already has an inventory number, use it
    if (artwork.inventory_number && artwork.inventory_number.trim()) {
      return artwork.inventory_number;
    }

    try {
      // Extract year from creation_date or use current year
      const year = artwork.creation_date
        ? new Date(artwork.creation_date).getFullYear()
        : new Date().getFullYear();

      // Generate NAME part from title
      let namePart = '';
      if (artwork.title) {
        namePart = artwork.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      }

      if (!namePart) {
        // Fallback to generic name
        namePart = 'UNTITLED';
      }

      // Find the maximum sequence number across ALL artworks
      let maxSeriesNumber = 0;
      existingArtworks.forEach(existing => {
        if (existing.inventory_number) {
          const match = existing.inventory_number.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxSeriesNumber) {
              maxSeriesNumber = num;
            }
          }
        }
      });

      // Generate new series number (pad to 3 digits)
      const newSeriesNumber = String(maxSeriesNumber + 1).padStart(3, '0');
      return `GRNCH-${namePart}-${year}-${newSeriesNumber}`;
    } catch (error) {
      console.error('Error generating inventory number:', error);
      // Fallback to timestamp-based number
      return `GRNCH-${new Date().getFullYear()}-IMPORT-${Date.now()}`;
    }
  }

  async function handleImportConfirm() {
    if (!parsedImport || parsedImport.length === 0) {
      alert('No artworks to import');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      // Get all existing artworks for inventory number generation
      const existingArtworks = await artworkOperations.getAll();

      for (const artwork of parsedImport) {
        try {
          // Generate inventory number if missing
          if (!artwork.inventory_number || !artwork.inventory_number.trim()) {
            artwork.inventory_number = await generateInventoryNumber(artwork, existingArtworks);
          }

          // Add timestamps
          artwork.created_at = new Date().toISOString();
          artwork.updated_at = new Date().toISOString();

          await artworkOperations.add(artwork);

          // Add to existing artworks array for next iteration
          existingArtworks.push(artwork);

          successCount++;
        } catch (error) {
          console.error('Error importing artwork:', artwork, error);
          errorCount++;
        }
      }

      await loadArtworks();
      setShowImportDialog(false);
      setImportFile(null);
      setParsedImport(null);
      setImportErrors([]);

      alert(`Import complete!\nSuccessfully imported: ${successCount}\nFailed: ${errorCount}`);
    } catch (error) {
      console.error('Error during import:', error);
      alert('Error importing artworks. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function closeImportDialog() {
    setShowImportDialog(false);
    setImportFile(null);
    setParsedImport(null);
    setImportErrors([]);
  }

  const hasActiveFilters = searchTerm || filterMedium || filterStatus || filterSeries || filterDateFrom || filterDateTo;

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
        <h2>All Works</h2>
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportDialog(true)}
          >
            Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            Export
          </button>
          {showExportMenu && (
            <div className="export-menu" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              minWidth: '200px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => {
                  exportToCSV(filteredArtworks);
                  setShowExportMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#2c3e50',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Export as CSV
              </button>
              <button
                onClick={() => {
                  exportToJSON(filteredArtworks);
                  setShowExportMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#2c3e50',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Export as JSON
              </button>
              <button
                onClick={() => {
                  exportToText(filteredArtworks);
                  setShowExportMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#2c3e50',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Export as Text Report
              </button>
              <div style={{ borderTop: '1px solid #ecf0f1', margin: '4px 0' }}></div>
              <button
                onClick={() => {
                  exportStats(artworks);
                  setShowExportMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#2c3e50',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Export Statistics
              </button>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/artworks/new')}>
            Add New Work
          </button>
        </div>
      </div>

      {artworks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎨</div>
          <h3>No works yet</h3>
          <p>Get started by adding your first piece to the catalog</p>
          <button className="btn btn-primary" onClick={() => navigate('/artworks/new')}>
            Add Your First Work
          </button>
        </div>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Search */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Search
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Title, inventory, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Medium Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Medium
                </label>
                <select
                  className="form-control"
                  value={filterMedium}
                  onChange={(e) => setFilterMedium(e.target.value)}
                >
                  <option value="">All Mediums</option>
                  {uniqueMediums.map(medium => (
                    <option key={medium} value={medium}>{medium}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Status
                </label>
                <select
                  className="form-control"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="on-loan">On Loan</option>
                  <option value="not-for-sale">Not for Sale</option>
                </select>
              </div>

              {/* Series Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Series
                </label>
                <select
                  className="form-control"
                  value={filterSeries}
                  onChange={(e) => setFilterSeries(e.target.value)}
                >
                  <option value="">All Series</option>
                  {uniqueSeries.map(series => (
                    <option key={series} value={series}>{series}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Created From
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#2c3e50' }}>
                  Created To
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Results count and clear button */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                  Showing {filteredArtworks.length} of {artworks.length} works
                  {selectedArtworks.size > 0 && ` • ${selectedArtworks.size} selected`}
                </div>
                {selectedArtworks.size === 0 && filteredArtworks.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={selectAllArtworks}>
                    Select All
                  </button>
                )}
                {selectedArtworks.size > 0 && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={deselectAllArtworks}>
                      Deselect All
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowBatchActions(true)}>
                      Batch Actions ({selectedArtworks.size})
                    </button>
                  </>
                )}
              </div>
              {hasActiveFilters && (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Batch Actions Dialog */}
          {showBatchActions && (
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
              <div className="batch-dialog" style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
              }}>
                <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>
                  Batch Actions ({selectedArtworks.size} works)
                </h3>

                <div className="form-group">
                  <label>Update Status</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-control"
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value)}
                    >
                      <option value="">Select status...</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="on-loan">On Loan</option>
                      <option value="not-for-sale">Not for Sale</option>
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleBatchUpdateStatus}
                      disabled={!batchStatus}
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Update Location</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter new location..."
                      value={batchLocation}
                      onChange={(e) => setBatchLocation(e.target.value)}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleBatchUpdateLocation}
                      disabled={!batchLocation.trim()}
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
                  <button
                    className="btn btn-danger"
                    onClick={handleBatchDelete}
                    style={{ width: '100%' }}
                  >
                    Delete {selectedArtworks.size} Works
                  </button>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBatchActions(false);
                      setBatchStatus('');
                      setBatchLocation('');
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Artwork Grid */}
          {filteredArtworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#7f8c8d', marginBottom: '16px' }}>No works match your filters</p>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="artwork-grid">
              {filteredArtworks.map((artwork) => (
                <div
                  key={artwork.id}
                  className="artwork-card"
                  style={{ position: 'relative' }}
                  onClick={() => navigate(`/artworks/${artwork.id}`)}
                >
                  {/* Selection checkbox */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 10
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedArtworks.has(artwork.id)}
                      onChange={() => toggleArtworkSelection(artwork.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div className="artwork-card-image">
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
                    <div className="artwork-card-meta">
                      <span className={`status-badge status-${artwork.sale_status}`}>
                        {artwork.sale_status}
                      </span>
                    </div>
                    <div className="artwork-card-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${artwork.title}"? This cannot be undone.`)) {
                            artworkOperations.delete(artwork.id).then(() => {
                              loadArtworks();
                            }).catch((error) => {
                              console.error('Error deleting work:', error);
                              alert('Error deleting work. Please try again.');
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
          )}
        </>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
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
          <div className="import-dialog" style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>
              Import Works from CSV
            </h3>

            {!importFile ? (
              <>
                <p style={{ marginBottom: '20px', color: '#7f8c8d' }}>
                  Upload a CSV file to import multiple works at once. The file should follow the export format.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      downloadTemplate();
                    }}
                    style={{ marginBottom: '12px' }}
                  >
                    Download Template
                  </button>
                </div>

                <div className="form-group">
                  <label>Select CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportFileSelect}
                    className="form-control"
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    File: {importFile.name}
                  </div>
                  {parsedImport && (
                    <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                      {parsedImport.length} works ready to import
                      {importErrors.length > 0 && ` • ${importErrors.length} errors found`}
                    </div>
                  )}
                </div>

                {importErrors.length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                    <div style={{ fontWeight: '500', color: '#856404', marginBottom: '8px' }}>
                      Errors Found:
                    </div>
                    <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                      {importErrors.map((error, index) => (
                        <div key={index} style={{ fontSize: '13px', color: '#856404', marginBottom: '4px' }}>
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedImport && parsedImport.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontWeight: '500', marginBottom: '8px' }}>Preview:</div>
                    <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ecf0f1', borderRadius: '6px' }}>
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ecf0f1' }}>Title</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ecf0f1' }}>Inventory</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ecf0f1' }}>Medium</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ecf0f1' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedImport.slice(0, 10).map((artwork, index) => (
                            <tr key={index}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ecf0f1' }}>{artwork.title}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ecf0f1' }}>{artwork.inventory_number}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ecf0f1' }}>{artwork.medium}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ecf0f1' }}>{artwork.sale_status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedImport.length > 10 && (
                        <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#7f8c8d', background: '#f8f9fa' }}>
                          ... and {parsedImport.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={closeImportDialog}
                disabled={importing}
              >
                Cancel
              </button>
              {parsedImport && parsedImport.length > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={handleImportConfirm}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : `Import ${parsedImport.length} Works`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtworkList;
