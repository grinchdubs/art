import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { artworkOperations, digitalWorkOperations, dbUtils } from '../db';

function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    sold: 0,
    onLoan: 0,
  });
  const [digitalStats, setDigitalStats] = useState({
    total: 0,
    vimeo: 0,
    youtube: 0,
    available: 0,
    sold: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Load physical artworks stats
      const artworks = await artworkOperations.getAll();
      const stats = {
        total: artworks.length,
        available: artworks.filter((a) => a.sale_status === 'available').length,
        sold: artworks.filter((a) => a.sale_status === 'sold').length,
        onLoan: artworks.filter((a) => a.sale_status === 'on-loan').length,
      };
      setStats(stats);

      // Load digital works stats
      const digitalWorks = await digitalWorkOperations.getAll();
      const digitalStats = {
        total: digitalWorks.length,
        vimeo: digitalWorks.filter((w) => w.inventory_number?.includes('VIMEO')).length,
        youtube: digitalWorks.filter((w) => w.inventory_number?.includes('YOUTUBE')).length,
        available: digitalWorks.filter((w) => w.sale_status === 'available').length,
        sold: digitalWorks.filter((w) => w.sale_status === 'sold').length,
      };
      setDigitalStats(digitalStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      {/* Physical Artworks Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: '18px' }}>
          Physical Artworks
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Total Works
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#2c3e50' }}>
              {stats.total}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Available
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#27ae60' }}>
              {stats.available}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Sold</div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#e74c3c' }}>
              {stats.sold}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              On Loan
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#f39c12' }}>
              {stats.onLoan}
            </div>
          </div>
        </div>
      </div>

      {/* Digital Works Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: '18px' }}>
          Digital Works
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Total Digital Works
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#2c3e50' }}>
              {digitalStats.total}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Vimeo Videos
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#1ab7ea' }}>
              {digitalStats.vimeo}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              YouTube Videos
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#ff0000' }}>
              {digitalStats.youtube}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Available
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#27ae60' }}>
              {digitalStats.available}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
              Sold
            </div>
            <div style={{ fontSize: '36px', fontWeight: '600', color: '#e74c3c' }}>
              {digitalStats.sold}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ marginBottom: '16px', color: '#2c3e50' }}>Welcome to Art Catalog</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Manage your collection with ease. Track inventory, manage exhibitions, and export
          your catalog.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/artworks/new')}>
            Add New Work
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/artworks')}>
            View All Works
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      <div
        style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px',
          border: '1px solid #dee2e6',
        }}
      >
        <h4 style={{ marginBottom: '12px', color: '#495057', fontSize: '14px' }}>
          Database Debug Tools
        </h4>
        <p style={{ color: '#6c757d', fontSize: '12px', marginBottom: '16px' }}>
          Use these tools if images aren't uploading or displaying correctly.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => dbUtils.checkDatabase()}
            style={{ fontSize: '12px' }}
          >
            Check Database (see console)
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (
                window.confirm(
                  'This will delete ALL data and reset the database. Are you sure?'
                )
              ) {
                dbUtils.resetDatabase();
              }
            }}
            style={{ fontSize: '12px' }}
          >
            Reset Database
          </button>
        </div>
        <p style={{ color: '#6c757d', fontSize: '11px', marginTop: '12px', fontStyle: 'italic' }}>
          Note: If images aren't working, try "Check Database" first, then "Reset Database" if
          file_references table is missing.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
