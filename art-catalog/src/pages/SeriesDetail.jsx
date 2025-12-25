import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { seriesAPI, getImageURL } from '../utils/api';

function SeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeries();
  }, [id]);

  async function loadSeries() {
    try {
      const data = await seriesAPI.getById(id);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
      alert('Error loading series');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!series) {
    return <div>Series not found</div>;
  }

  const totalWorks = (series.artworks?.length || 0) + (series.digital_works?.length || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{series.name}</h2>
          {series.description && (
            <p style={{ color: '#7f8c8d', marginTop: '8px', lineHeight: '1.6' }}>
              {series.description}
            </p>
          )}
          {(series.start_date || series.end_date) && (
            <p style={{ color: '#95a5a6', fontSize: '14px', marginTop: '8px' }}>
              {series.start_date && new Date(series.start_date).toLocaleDateString()}
              {series.start_date && series.end_date && ' - '}
              {series.end_date && new Date(series.end_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/series/${id}/edit`)}>
            Edit Series
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/series')}>
            Back to All Series
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '32px', display: 'flex', gap: '24px' }}>
        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
            {series.artworks?.length || 0}
          </div>
          <div style={{ color: '#7f8c8d' }}>Physical Artworks</div>
        </div>
        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9b59b6' }}>
            {series.digital_works?.length || 0}
          </div>
          <div style={{ color: '#7f8c8d' }}>Digital Works</div>
        </div>
        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
            {totalWorks}
          </div>
          <div style={{ color: '#7f8c8d' }}>Total Works</div>
        </div>
      </div>

      {series.artworks && series.artworks.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Physical Artworks</h3>
          <div className="artwork-grid">
            {series.artworks.map((artwork) => {
              const primaryImage = artwork.images?.find(img => img.is_primary) || artwork.images?.[0];
              
              return (
                <div
                  key={artwork.id}
                  className="artwork-card"
                  onClick={() => navigate(`/artworks/${artwork.id}`)}
                >
                  {primaryImage && (
                    <img
                      src={getImageURL(primaryImage.file_path)}
                      alt={artwork.title}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        borderRadius: '8px 8px 0 0',
                      }}
                    />
                  )}
                  <div className="artwork-info">
                    <h3 className="artwork-title">{artwork.title}</h3>
                    {artwork.medium && (
                      <p className="artwork-medium">{artwork.medium}</p>
                    )}
                    {artwork.creation_date && (
                      <p className="artwork-date">{artwork.creation_date}</p>
                    )}
                    {artwork.price && (
                      <p className="artwork-price">${artwork.price}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {series.digital_works && series.digital_works.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Digital Works</h3>
          <div className="artwork-grid">
            {series.digital_works.map((work) => {
              const primaryImage = work.images?.find(img => img.is_primary) || work.images?.[0];
              
              return (
                <div
                  key={work.id}
                  className="artwork-card"
                  onClick={() => navigate(`/digital-works/${work.id}`)}
                >
                  {primaryImage && (
                    <img
                      src={getImageURL(primaryImage.file_path)}
                      alt={work.title}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        borderRadius: '8px 8px 0 0',
                      }}
                    />
                  )}
                  <div className="artwork-info">
                    <h3 className="artwork-title">{work.title}</h3>
                    {work.platform && (
                      <p className="artwork-medium">{work.platform}</p>
                    )}
                    {work.creation_date && (
                      <p className="artwork-date">{work.creation_date}</p>
                    )}
                    {work.price && (
                      <p className="artwork-price">${work.price}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalWorks === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#7f8c8d', marginBottom: '16px' }}>
            No works in this series yet
          </p>
          <p style={{ color: '#95a5a6', fontSize: '14px' }}>
            Add works to this series by editing them and selecting this series from the dropdown
          </p>
        </div>
      )}
    </div>
  );
}

export default SeriesDetail;
