import { useState, useEffect } from 'react';
import { salesAPI, artworkAPI, digitalWorkAPI, exhibitionAPI } from '../utils/api';
import { useDarkMode } from '../App';

function Reports() {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('sales');
  const [salesData, setSalesData] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [digitalWorks, setDigitalWorks] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [salesRes, artworksRes, digitalWorksRes, exhibitionsRes] = await Promise.all([
        salesAPI.getAll(),
        artworkAPI.getAll(),
        digitalWorkAPI.getAll(),
        exhibitionAPI.getAll()
      ]);
      setSalesData(salesRes);
      setArtworks(artworksRes);
      setDigitalWorks(digitalWorksRes);
      setExhibitions(exhibitionsRes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterSalesByDate(sales) {
    if (!dateRange.start && !dateRange.end) return sales;
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      return true;
    });
  }

  function generateSalesReport() {
    const filteredSales = filterSalesByDate(salesData);
    
    const totalRevenue = filteredSales.reduce((sum, sale) => {
      return sum + (parseFloat(sale.sale_price) || 0);
    }, 0);

    const physicalSales = filteredSales.filter(s => s.artwork_id);
    const digitalSales = filteredSales.filter(s => s.digital_work_id);

    const platformBreakdown = {};
    filteredSales.forEach(sale => {
      const platform = sale.platform || 'Direct';
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { count: 0, revenue: 0 };
      }
      platformBreakdown[platform].count++;
      platformBreakdown[platform].revenue += parseFloat(sale.sale_price) || 0;
    });

    const monthlySales = {};
    filteredSales.forEach(sale => {
      const month = new Date(sale.sale_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlySales[month]) {
        monthlySales[month] = { count: 0, revenue: 0 };
      }
      monthlySales[month].count++;
      monthlySales[month].revenue += parseFloat(sale.sale_price) || 0;
    });

    return {
      totalSales: filteredSales.length,
      totalRevenue,
      averageSalePrice: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
      physicalSales: physicalSales.length,
      digitalSales: digitalSales.length,
      platformBreakdown,
      monthlySales
    };
  }

  function generateInventoryReport() {
    const allWorks = [...artworks, ...digitalWorks];
    
    const available = allWorks.filter(w => w.sale_status === 'available');
    const sold = allWorks.filter(w => w.sale_status === 'sold');
    const reserved = allWorks.filter(w => w.sale_status === 'reserved');
    const notForSale = allWorks.filter(w => w.sale_status === 'not_for_sale');

    const physicalAvailable = artworks.filter(w => w.sale_status === 'available');
    const digitalAvailable = digitalWorks.filter(w => w.sale_status === 'available');

    const totalValue = available.reduce((sum, work) => {
      const price = parseFloat(work.price) || 0;
      return sum + price;
    }, 0);

    const editionWorks = allWorks.filter(w => w.edition_total);
    const totalEditions = editionWorks.reduce((sum, work) => sum + (work.edition_total || 0), 0);

    return {
      totalWorks: allWorks.length,
      physicalWorks: artworks.length,
      digitalWorks: digitalWorks.length,
      available: available.length,
      sold: sold.length,
      reserved: reserved.length,
      notForSale: notForSale.length,
      physicalAvailable: physicalAvailable.length,
      digitalAvailable: digitalAvailable.length,
      totalValue,
      editionWorks: editionWorks.length,
      totalEditions
    };
  }

  function generateExhibitionReport() {
    const upcoming = exhibitions.filter(e => new Date(e.start_date) > new Date());
    const ongoing = exhibitions.filter(e => {
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      const now = new Date();
      return start <= now && now <= end;
    });
    const past = exhibitions.filter(e => new Date(e.end_date) < new Date());

    const byVenue = {};
    exhibitions.forEach(ex => {
      const venue = ex.venue || 'Unknown';
      if (!byVenue[venue]) {
        byVenue[venue] = 0;
      }
      byVenue[venue]++;
    });

    const totalArtworksExhibited = exhibitions.reduce((sum, ex) => {
      return sum + (ex.artworks?.length || 0);
    }, 0);

    return {
      totalExhibitions: exhibitions.length,
      upcoming: upcoming.length,
      ongoing: ongoing.length,
      past: past.length,
      byVenue,
      totalArtworksExhibited
    };
  }

  function exportToCSV(reportData, filename) {
    let csv = '';
    
    if (reportType === 'sales') {
      const sales = filterSalesByDate(salesData);
      csv = 'Date,Item,Type,Buyer,Email,Price,Platform,Edition,Notes\n';
      sales.forEach(sale => {
        const item = sale.artwork_title || sale.digital_work_title;
        const type = sale.artwork_id ? 'Physical' : 'Digital';
        const price = sale.sale_price || '';
        const edition = sale.edition_number ? `#${sale.edition_number}` : '';
        csv += `"${sale.sale_date}","${item}","${type}","${sale.buyer_name || ''}","${sale.buyer_email || ''}","${price}","${sale.platform || ''}","${edition}","${(sale.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else if (reportType === 'inventory') {
      csv = 'Type,Inventory,Title,Status,Price,Medium/Format,Location,Edition\n';
      [...artworks, ...digitalWorks].forEach(work => {
        const type = work.medium ? 'Physical' : 'Digital';
        const mediumFormat = work.medium || work.file_format || '';
        const edition = work.edition_total ? `${work.edition_number || '?'}/${work.edition_total}` : '';
        csv += `"${type}","${work.inventory_number}","${work.title}","${work.sale_status}","${work.price || ''}","${mediumFormat}","${work.location || ''}","${edition}"\n`;
      });
    } else if (reportType === 'exhibitions') {
      csv = 'Title,Venue,Start Date,End Date,Status,# of Works\n';
      exhibitions.forEach(ex => {
        const start = new Date(ex.start_date);
        const end = new Date(ex.end_date);
        const now = new Date();
        let status = 'Past';
        if (start > now) status = 'Upcoming';
        else if (start <= now && now <= end) status = 'Ongoing';
        
        csv += `"${ex.title}","${ex.venue || ''}","${ex.start_date}","${ex.end_date}","${status}","${ex.artworks?.length || 0}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const salesReport = reportType === 'sales' ? generateSalesReport() : null;
  const inventoryReport = reportType === 'inventory' ? generateInventoryReport() : null;
  const exhibitionReport = reportType === 'exhibitions' ? generateExhibitionReport() : null;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Reports & Analytics</h1>
        <button
          className="btn btn-primary"
          onClick={() => exportToCSV(null, `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          Export to CSV
        </button>
      </div>

      {/* Report Type Selector */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <button
          className={`btn ${reportType === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('sales')}
        >
          Sales Report
        </button>
        <button
          className={`btn ${reportType === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('inventory')}
        >
          Inventory Report
        </button>
        <button
          className={`btn ${reportType === 'exhibitions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('exhibitions')}
        >
          Exhibition Report
        </button>
      </div>

      {/* Date Range Filter for Sales */}
      {reportType === 'sales' && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          gap: '15px',
          alignItems: 'center'
        }}>
          <label>
            From:
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ marginLeft: '8px', padding: '5px', borderRadius: '4px' }}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ marginLeft: '8px', padding: '5px', borderRadius: '4px' }}
            />
          </label>
          {(dateRange.start || dateRange.end) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setDateRange({ start: '', end: '' })}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sales Report */}
      {reportType === 'sales' && salesReport && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value">{salesReport.totalSales}</div>
              <div className="stat-label">Total Sales</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                ${salesReport.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                ${salesReport.averageSalePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stat-label">Average Sale Price</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value">{salesReport.physicalSales}</div>
              <div className="stat-label">Physical Works Sold</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{salesReport.digitalSales}</div>
              <div className="stat-label">Digital Works Sold</div>
            </div>
          </div>

          <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Sales by Platform</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Sales Count</th>
                  <th>Revenue</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesReport.platformBreakdown).map(([platform, data]) => (
                  <tr key={platform}>
                    <td>{platform}</td>
                    <td>{data.count}</td>
                    <td>${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${(data.revenue / data.count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Monthly Sales</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sales Count</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesReport.monthlySales).reverse().map(([month, data]) => (
                  <tr key={month}>
                    <td>{month}</td>
                    <td>{data.count}</td>
                    <td>${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Report */}
      {reportType === 'inventory' && inventoryReport && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.totalWorks}</div>
              <div className="stat-label">Total Works</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.physicalWorks}</div>
              <div className="stat-label">Physical Works</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.digitalWorks}</div>
              <div className="stat-label">Digital Works</div>
            </div>
          </div>

          <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Status Breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card" style={{ backgroundColor: '#d4edda' }}>
              <div className="stat-value" style={{ color: '#155724' }}>{inventoryReport.available}</div>
              <div className="stat-label" style={{ color: '#155724' }}>Available</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#f8d7da' }}>
              <div className="stat-value" style={{ color: '#721c24' }}>{inventoryReport.sold}</div>
              <div className="stat-label" style={{ color: '#721c24' }}>Sold</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#fff3cd' }}>
              <div className="stat-value" style={{ color: '#856404' }}>{inventoryReport.reserved}</div>
              <div className="stat-label" style={{ color: '#856404' }}>Reserved</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#d1ecf1' }}>
              <div className="stat-value" style={{ color: '#0c5460' }}>{inventoryReport.notForSale}</div>
              <div className="stat-label" style={{ color: '#0c5460' }}>Not For Sale</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value">
                ${inventoryReport.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stat-label">Total Available Inventory Value</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.editionWorks}</div>
              <div className="stat-label">Limited Edition Works</div>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.7 }}>
                {inventoryReport.totalEditions} total editions
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.physicalAvailable}</div>
              <div className="stat-label">Physical Available</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{inventoryReport.digitalAvailable}</div>
              <div className="stat-label">Digital Available</div>
            </div>
          </div>
        </div>
      )}

      {/* Exhibition Report */}
      {reportType === 'exhibitions' && exhibitionReport && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value">{exhibitionReport.totalExhibitions}</div>
              <div className="stat-label">Total Exhibitions</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#d1ecf1' }}>
              <div className="stat-value" style={{ color: '#0c5460' }}>{exhibitionReport.upcoming}</div>
              <div className="stat-label" style={{ color: '#0c5460' }}>Upcoming</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#d4edda' }}>
              <div className="stat-value" style={{ color: '#155724' }}>{exhibitionReport.ongoing}</div>
              <div className="stat-label" style={{ color: '#155724' }}>Ongoing</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{exhibitionReport.past}</div>
              <div className="stat-label">Past</div>
            </div>
          </div>

          <div className="stat-card" style={{ marginBottom: '30px' }}>
            <div className="stat-value">{exhibitionReport.totalArtworksExhibited}</div>
            <div className="stat-label">Total Artworks Exhibited</div>
          </div>

          <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Exhibitions by Venue</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Number of Exhibitions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(exhibitionReport.byVenue)
                  .sort((a, b) => b[1] - a[1])
                  .map(([venue, count]) => (
                    <tr key={venue}>
                      <td>{venue}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
