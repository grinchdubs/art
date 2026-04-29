import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

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
import Reports from './pages/Reports';
import MigrationPanel from './components/MigrationPanel';

function Sidebar() {
  const location = useLocation();

  function isActive(path) {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">Art Catalog</div>
      <nav className="sidebar-nav">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          Dashboard
        </Link>

        <div className="nav-group-label">Physical Works</div>
        <Link to="/artworks" className={`nav-link ${isActive('/artworks') ? 'active' : ''}`}>
          All Works
        </Link>
        <Link to="/exhibitions" className={`nav-link ${isActive('/exhibitions') ? 'active' : ''}`}>
          Exhibitions
        </Link>
        <Link to="/series" className={`nav-link ${isActive('/series') ? 'active' : ''}`}>
          Series & Collections
        </Link>

        <div className="nav-group-label">Digital Works</div>
        <Link to="/digital-works" className={`nav-link ${isActive('/digital-works') ? 'active' : ''}`}>
          All Digital Works
        </Link>

        <div className="nav-group-label">Media</div>
        <Link to="/gallery" className={`nav-link ${isActive('/gallery') ? 'active' : ''}`}>
          Image Gallery
        </Link>

        <div className="nav-group-label">Business</div>
        <Link to="/sales" className={`nav-link ${isActive('/sales') ? 'active' : ''}`}>
          Sales Records
        </Link>
        <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
          Reports & Analytics
        </Link>

        <div className="nav-group-label">System</div>
        <Link to="/backup" className={`nav-link ${isActive('/backup') ? 'active' : ''}`}>
          Backup & Restore
        </Link>

        <div className="nav-group-label">Public</div>
        <Link to="/public" className={`nav-link ${isActive('/public') ? 'active' : ''}`}>
          Public Portfolio
        </Link>
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-version">Art Catalog v0.1.0</span>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
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
          <Route path="/reports" element={<Reports />} />
          <Route path="/backup" element={<BackupRestore />} />
          <Route path="/public" element={<PublicGallery />} />
          <Route path="/public/:type/:id" element={<PublicWorkDetail />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <MigrationPanel />
    </BrowserRouter>
  );
}

export default App;
