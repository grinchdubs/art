import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesAPI } from '../utils/api';

function SalesList() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSales();
    loadStats();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchTerm, sales]);

  async function loadSales() {
    try {
      setLoading(true);
      const data = await salesAPI.getAll();
      setSales(data);
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const data = await salesAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  function filterSales() {
    if (!searchTerm.trim()) {
      setFilteredSales(sales);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = sales.filter(
      (sale) =>
        sale.buyer_name?.toLowerCase().includes(term) ||
        sale.buyer_email?.toLowerCase().includes(term) ||
        sale.artwork_title?.toLowerCase().includes(term) ||
        sale.digital_work_title?.toLowerCase().includes(term) ||
        sale.platform?.toLowerCase().includes(term)
    );
    setFilteredSales(filtered);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this sale record?')) {
      return;
    }

    try {
      await salesAPI.delete(id);
      await loadSales();
      await loadStats();
      alert('Sale deleted successfully');
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale');
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Sales</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading sales...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Sales</h2>
        <button className="btn btn-primary" onClick={() => navigate('/artworks')}>
          Record New Sale
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="stat-card">
              <div className="stat-label">Total Sales</div>
              <div className="stat-value" style={{ color: '#3498db' }}>
                {stats.total_sales || 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ color: '#27ae60' }}>
                ${parseFloat(stats.total_revenue || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average Sale</div>
              <div className="stat-value" style={{ color: '#f39c12' }}>
                ${parseFloat(stats.average_sale_price || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Items Sold</div>
              <div className="stat-value" style={{ color: '#9b59b6' }}>
                {(parseInt(stats.artworks_sold) || 0) + (parseInt(stats.digital_works_sold) || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search sales by buyer, item, or platform..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          {sales.length === 0 ? 'No sales recorded yet.' : 'No sales match your search.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Edition</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Platform</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td>
                    {sale.artwork_title || sale.digital_work_title}
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {sale.artwork_inventory || sale.digital_work_inventory}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: sale.artwork_id ? '#e3f2fd' : '#f3e5f5',
                        color: sale.artwork_id ? '#1976d2' : '#7b1fa2',
                      }}
                    >
                      {sale.artwork_id ? 'Physical' : 'Digital'}
                    </span>
                  </td>
                  <td>{sale.edition_number ? `#${sale.edition_number}` : '-'}</td>
                  <td>
                    {sale.buyer_name || '-'}
                    {sale.buyer_email && (
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {sale.buyer_email}
                      </div>
                    )}
                  </td>
                  <td>
                    {sale.sale_price
                      ? `$${parseFloat(sale.sale_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '-'}
                  </td>
                  <td>{sale.platform || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(sale.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SalesList;
