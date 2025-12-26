import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../utils/api';
import { useDarkMode } from '../App';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

function Dashboard() {
  const { darkMode } = useDarkMode();
  const [summary, setSummary] = useState(null);
  const [worksOverTime, setWorksOverTime] = useState([]);
  const [worksByMedium, setWorksByMedium] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState({ physical: [], digital: [] });
  const [priceRanges, setPriceRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [summaryData, timeData, mediumData, statusData, priceData] = await Promise.all([
        analyticsAPI.getSummary(),
        analyticsAPI.getWorksOverTime(),
        analyticsAPI.getWorksByMedium(),
        analyticsAPI.getStatusDistribution(),
        analyticsAPI.getPriceRanges(),
      ]);

      setSummary(summaryData);
      
      // Process time data - group by month and combine physical/digital
      const timeMap = new Map();
      timeData.forEach(item => {
        const monthKey = new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!timeMap.has(monthKey)) {
          timeMap.set(monthKey, { month: monthKey, physical: 0, digital: 0 });
        }
        const entry = timeMap.get(monthKey);
        if (item.type === 'physical') {
          entry.physical += parseInt(item.count);
        } else {
          entry.digital += parseInt(item.count);
        }
      });
      setWorksOverTime(Array.from(timeMap.values()));

      setWorksByMedium(mediumData);
      setStatusDistribution(statusData);
      setPriceRanges(priceData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      {/* Summary Stats */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <div className="stat-card">
            <div className="stat-label">Total Artworks</div>
            <div className="stat-value" style={{ color: '#3498db' }}>
              {summary?.total_artworks || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Digital Works</div>
            <div className="stat-value" style={{ color: '#9b59b6' }}>
              {summary?.total_digital_works || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Exhibitions</div>
            <div className="stat-value" style={{ color: '#2ecc71' }}>
              {summary?.total_exhibitions || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Gallery Images</div>
            <div className="stat-value" style={{ color: '#f39c12' }}>
              {summary?.total_images || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Artworks Sold</div>
            <div className="stat-value" style={{ color: '#e74c3c' }}>
              {summary?.artworks_sold || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">NFTs Minted</div>
            <div className="stat-value" style={{ color: '#1abc9c' }}>
              {summary?.digital_works_minted || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Value</div>
            <div className="stat-value" style={{ color: '#27ae60' }}>
              ${parseFloat(summary?.total_artwork_value || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '24px', color: darkMode ? '#e0e0e0' : '#2c3e50', fontSize: '20px' }}>Analytics</h3>
        
        {/* Works Over Time */}
        {worksOverTime.length > 0 && (
          <div style={{ marginBottom: '40px', background: darkMode ? '#2d2d2d' : 'white', padding: '24px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Works Created Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={worksOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
                <XAxis dataKey="month" stroke={darkMode ? '#e0e0e0' : '#666'} />
                <YAxis stroke={darkMode ? '#e0e0e0' : '#666'} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e1e1e' : 'white', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, color: darkMode ? '#e0e0e0' : '#333' }} />
                <Legend wrapperStyle={{ color: darkMode ? '#e0e0e0' : '#666' }} />
                <Line type="monotone" dataKey="physical" stroke="#3498db" strokeWidth={2} name="Physical Artworks" />
                <Line type="monotone" dataKey="digital" stroke="#9b59b6" strokeWidth={2} name="Digital Works" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two column layout for medium and price */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          {/* Works By Medium */}
          {worksByMedium.length > 0 && (
            <div style={{ background: darkMode ? '#2d2d2d' : 'white', padding: '24px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Works by Medium</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={worksByMedium}
                    dataKey="count"
                    nameKey="medium"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.medium} (${entry.count})`}
                  >
                    {worksByMedium.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e1e1e' : 'white', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, color: darkMode ? '#e0e0e0' : '#333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Price Ranges */}
          {priceRanges.length > 0 && (
            <div style={{ background: darkMode ? '#2d2d2d' : 'white', padding: '24px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Price Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceRanges}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
                  <XAxis dataKey="range" stroke={darkMode ? '#e0e0e0' : '#666'} />
                  <YAxis stroke={darkMode ? '#e0e0e0' : '#666'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e1e1e' : 'white', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, color: darkMode ? '#e0e0e0' : '#333' }} />
                  <Bar dataKey="count" fill="#2ecc71" name="Artworks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {statusDistribution.physical?.length > 0 && (
            <div style={{ background: darkMode ? '#2d2d2d' : 'white', padding: '24px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Physical Artwork Status</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution.physical}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={(entry) => `${entry.status} (${entry.count})`}
                  >
                    {statusDistribution.physical.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e1e1e' : 'white', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, color: darkMode ? '#e0e0e0' : '#333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {statusDistribution.digital?.length > 0 && (
            <div style={{ background: darkMode ? '#2d2d2d' : 'white', padding: '24px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Digital Work Status</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution.digital}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={(entry) => `${entry.status} (${entry.count})`}
                  >
                    {statusDistribution.digital.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e1e1e' : 'white', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, color: darkMode ? '#e0e0e0' : '#333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: darkMode ? '#2d2d2d' : 'white', padding: '32px', borderRadius: '8px', boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '16px', color: darkMode ? '#e0e0e0' : '#2c3e50' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/artworks/new')}>
            Add New Artwork
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/digital-works/new')}>
            Add Digital Work
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/artworks')}>
            View All Artworks
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/exhibitions')}>
            View Exhibitions
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
