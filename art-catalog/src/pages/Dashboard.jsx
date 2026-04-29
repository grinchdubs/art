import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../utils/api';
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
            <div className="stat-value">{summary?.total_artworks || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Digital Works</div>
            <div className="stat-value">{summary?.total_digital_works || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Exhibitions</div>
            <div className="stat-value">{summary?.total_exhibitions || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Gallery Images</div>
            <div className="stat-value">{summary?.total_images || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Artworks Sold</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary?.artworks_sold || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">NFTs Minted</div>
            <div className="stat-value">{summary?.digital_works_minted || 0}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Value</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              ${parseFloat(summary?.total_artwork_value || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)', fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 500 }}>Analytics</h3>

        {worksOverTime.length === 0 && worksByMedium.length === 0 && priceRanges.length === 0 && (
          <div className="stat-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', opacity: 0.3, marginBottom: '16px' }}>📊</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Charts will appear once you add works to your catalog</p>
          </div>
        )}

        {/* Works Over Time */}
        {worksOverTime.length > 0 && (
          <div className="stat-card" style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '16px', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Works Created Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={worksOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                <XAxis dataKey="month" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #363636', color: '#e2e2e2', borderRadius: '6px' }} />
                <Legend wrapperStyle={{ color: '#888', fontSize: 13 }} />
                <Line type="monotone" dataKey="physical" stroke="#c9a86c" strokeWidth={2} name="Physical Artworks" dot={false} />
                <Line type="monotone" dataKey="digital" stroke="#888" strokeWidth={2} name="Digital Works" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two column layout for medium and price */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Works By Medium */}
          {worksByMedium.length > 0 && (
            <div className="stat-card">
              <h4 style={{ marginBottom: '16px', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Works by Medium</h4>
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
                  <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #363636', color: '#e2e2e2', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Price Ranges */}
          {priceRanges.length > 0 && (
            <div className="stat-card">
              <h4 style={{ marginBottom: '16px', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Price Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceRanges}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                  <XAxis dataKey="range" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #363636', color: '#e2e2e2', borderRadius: '6px' }} />
                  <Bar dataKey="count" fill="#c9a86c" name="Artworks" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {statusDistribution.physical?.length > 0 && (
            <div className="stat-card">
              <h4 style={{ marginBottom: '16px', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Physical Artwork Status</h4>
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
                  <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #363636', color: '#e2e2e2', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {statusDistribution.digital?.length > 0 && (
            <div className="stat-card">
              <h4 style={{ marginBottom: '16px', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Digital Work Status</h4>
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
                  <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #363636', color: '#e2e2e2', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="stat-card" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '16px', color: '#e2e2e2', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '18px' }}>Quick Actions</h3>
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
