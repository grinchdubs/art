import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI, getImageURL } from '../utils/api';

function PublicGallery() {
  const [artworks, setArtworks] = useState([]);
  const [digitalWorks, setDigitalWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workType, setWorkType] = useState('all'); // all, artworks, digital-works
  const [filterMedium, setFilterMedium] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    try {
      const [artworksData, digitalWorksData] = await Promise.all([
        publicAPI.getArtworks(),
        publicAPI.getDigitalWorks(),
      ]);
      setArtworks(artworksData);
      setDigitalWorks(digitalWorksData);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  }

  // Combine all works for filtering
  const allWorks = useMemo(() => {
    let works = [];
    
    if (workType === 'all' || workType === 'artworks') {
      works = [...works, ...artworks.map(a => ({ ...a, type: 'artwork' }))];
    }
    
    if (workType === 'all' || workType === 'digital-works') {
      works = [...works, ...digitalWorks.map(d => ({ ...d, type: 'digital-work' }))];
    }
    
    return works;
  }, [artworks, digitalWorks, workType]);

  // Get unique values for filters
  const uniqueMediums = useMemo(() => {
    const mediums = new Set();
    artworks.forEach(a => a.medium && mediums.add(a.medium));
    digitalWorks.forEach(d => d.file_format && mediums.add(d.file_format));
    return Array.from(mediums).sort();
  }, [artworks, digitalWorks]);

  const uniqueSeries = useMemo(() => {
    const series = new Set();
    allWorks.forEach(w => w.series_name && series.add(w.series_name));
    return Array.from(series).sort();
  }, [allWorks]);

  // Filter works
  const filteredWorks = useMemo(() => {
    return allWorks.filter(work => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          work.title?.toLowerCase().includes(search) ||
          work.notes?.toLowerCase().includes(search) ||
          work.series_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Medium/format filter
      if (filterMedium) {
        const workMedium = work.type === 'artwork' ? work.medium : work.file_format;
        if (workMedium !== filterMedium) return false;
      }

      // Series filter
      if (filterSeries && work.series_name !== filterSeries) {
        return false;
      }

      return true;
    });
  }, [allWorks, searchTerm, filterMedium, filterSeries]);

  function getPrimaryImage(work) {
    if (work.images && work.images.length > 0) {
      const primary = work.images.find(img => img.is_primary) || work.images[0];
      return getImageURL(primary.file_path);
    }
    return null;
  }

  function handleWorkClick(work) {
    navigate(`/public/${work.type}/${work.id}`);
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div>Loading gallery...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '48px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '24px'
      }}>
        <h1 style={{ 
          fontSize: '42px', 
          fontWeight: '300', 
          marginBottom: '8px',
          color: '#2c3e50',
          letterSpacing: '2px'
        }}>
          Portfolio
        </h1>
        <p style={{ 
          fontSize: '18px', 
          color: '#7f8c8d',
          fontWeight: '300'
        }}>
          Digital Art & Physical Works
        </p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '32px',
        padding: '24px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#2c3e50'
          }}>
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search works..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#2c3e50'
          }}>
            Type
          </label>
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Works</option>
            <option value="artworks">Physical Artworks</option>
            <option value="digital-works">Digital Works</option>
          </select>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#2c3e50'
          }}>
            Medium/Format
          </label>
          <select
            value={filterMedium}
            onChange={(e) => setFilterMedium(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Mediums</option>
            {uniqueMediums.map(medium => (
              <option key={medium} value={medium}>{medium}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#2c3e50'
          }}>
            Series
          </label>
          <select
            value={filterSeries}
            onChange={(e) => setFilterSeries(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Series</option>
            {uniqueSeries.map(series => (
              <option key={series} value={series}>{series}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Work count */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '24px',
        color: '#7f8c8d',
        fontSize: '14px'
      }}>
        Showing {filteredWorks.length} of {allWorks.length} works
      </div>

      {/* Gallery Grid */}
      {filteredWorks.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#7f8c8d'
        }}>
          <p style={{ fontSize: '18px' }}>No works match your filters</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '32px'
        }}>
          {filteredWorks.map(work => {
            const imageUrl = getPrimaryImage(work);
            
            return (
              <div
                key={`${work.type}-${work.id}`}
                onClick={() => handleWorkClick(work)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* Image */}
                <div style={{ 
                  width: '100%', 
                  paddingTop: '100%', 
                  position: 'relative',
                  background: '#f0f0f0'
                }}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={work.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#bbb',
                      fontSize: '48px'
                    }}>
                      🖼️
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '500',
                    color: '#2c3e50'
                  }}>
                    {work.title || 'Untitled'}
                  </h3>
                  
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#7f8c8d',
                    marginBottom: '4px'
                  }}>
                    {work.type === 'artwork' && work.medium}
                    {work.type === 'digital-work' && work.file_format}
                  </div>

                  {work.series_name && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#95a5a6',
                      fontStyle: 'italic'
                    }}>
                      {work.series_name}
                    </div>
                  )}

                  {work.creation_date && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#95a5a6',
                      marginTop: '4px'
                    }}>
                      {new Date(work.creation_date).getFullYear()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PublicGallery;
