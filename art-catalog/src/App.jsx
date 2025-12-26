import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import ArtworkList from './pages/ArtworkList';
import ArtworkForm from './pages/ArtworkForm';
import ArtworkDetail from './pages/ArtworkDetail';
import ExhibitionList from './pages/ExhibitionList';
import ExhibitionForm from './pages/ExhibitionForm';
import ExhibitionDetail from './pages/ExhibitionDetail';
import DigitalWorkList from './pages/DigitalWorkList';
import DigitalWorkForm from './pages/DigitalWorkForm';
import DigitalWorkDetail from './pages/DigitalWorkDetail';
import Gallery from './pages/Gallery';
import SeriesList from './pages/SeriesList';
import SeriesForm from './pages/SeriesForm';
import SeriesDetail from './pages/SeriesDetail';
import PublicGallery from './pages/PublicGallery';
import PublicWorkDetail from './pages/PublicWorkDetail';
import SalesList from './pages/SalesList';
import BackupRestore from './pages/BackupRestore';

// Import components
import MigrationPanel from './components/MigrationPanel';

// Create dark mode context
const DarkModeContext = createContext();

export function useDarkMode() {
  return useContext(DarkModeContext);
}

function Sidebar() {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useDarkMode();

  function isActive(path) {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }

  return (
    <div className="sidebar">
      <h1>Art Catalog</h1>
      <nav>
        <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
          Dashboard
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Physical Works
        </div>
        <Link to="/artworks" className={`nav-link ${isActive('/artworks') ? 'active' : ''}`}>
          All Works
        </Link>
        <Link to="/exhibitions" className={`nav-link ${isActive('/exhibitions') ? 'active' : ''}`}>
          Exhibitions
        </Link>
        <Link to="/series" className={`nav-link ${isActive('/series') ? 'active' : ''}`}>
          Series & Collections
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Digital Works
        </div>
        <Link to="/digital-works" className={`nav-link ${isActive('/digital-works') ? 'active' : ''}`}>
          All Digital Works
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Media
        </div>
        <Link to="/gallery" className={`nav-link ${isActive('/gallery') ? 'active' : ''}`}>
          Image Gallery
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Sales
        </div>
        <Link to="/sales" className={`nav-link ${isActive('/sales') ? 'active' : ''}`}>
          Sales Records
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Settings
        </div>
        <Link to="/backup" className={`nav-link ${isActive('/backup') ? 'active' : ''}`}>
          Backup & Restore
        </Link>

        <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '12px' }}>
          Public View
        </div>
        <Link to="/public" className={`nav-link ${isActive('/public') ? 'active' : ''}`}>
          🌐 Public Portfolio
        </Link>
      </nav>
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={toggleDarkMode}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
        >
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          Art Catalog v0.1.0
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/artworks" element={<ArtworkList />} />
          <Route path="/artworks/new" element={<ArtworkForm />} />
          <Route path="/artworks/edit/:id" element={<ArtworkForm />} />
          <Route path="/artworks/:id" element={<ArtworkDetail />} />
          <Route path="/exhibitions" element={<ExhibitionList />} />
          <Route path="/exhibitions/new" element={<ExhibitionForm />} />
          <Route path="/exhibitions/edit/:id" element={<ExhibitionForm />} />
          <Route path="/exhibitions/:id" element={<ExhibitionDetail />} />
          <Route path="/series" element={<SeriesList />} />
          <Route path="/series/new" element={<SeriesForm />} />
          <Route path="/series/:id/edit" element={<SeriesForm />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/digital-works" element={<DigitalWorkList />} />
          <Route path="/digital-works/new" element={<DigitalWorkForm />} />
          <Route path="/digital-works/edit/:id" element={<DigitalWorkForm />} />
          <Route path="/digital-works/:id" element={<DigitalWorkDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/backup" element={<BackupRestore />} />
          <Route path="/public" element={<PublicGallery />} />
          <Route path="/public/:type/:id" element={<PublicWorkDetail />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <BrowserRouter>
        <AppContent />
        <MigrationPanel />
      </BrowserRouter>
    </DarkModeContext.Provider>
  );
}

export default App;
