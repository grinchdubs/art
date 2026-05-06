import { useState } from 'react';
import { backupAPI } from '../utils/api';

function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [importFile, setImportFile] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const backup = await backupAPI.export();
      
      // Create download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `art-catalog-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Backup exported successfully!' });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setMessage({ type: '', text: '' });
    }
  };

  const handleImport = async (clearFirst = false) => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a backup file first' });
      return;
    }

    const confirmMsg = clearFirst
      ? 'WARNING: This will DELETE ALL existing data and import the backup. This cannot be undone. Continue?'
      : 'This will import the backup and merge with existing data. Duplicate IDs will be updated. Continue?';

    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Read file
      const text = await importFile.text();
      const backupData = JSON.parse(text);

      // Clear data if requested
      if (clearFirst) {
        await backupAPI.clear();
      }

      // Import
      const result = await backupAPI.import(backupData);
      
      setMessage({ 
        type: 'success', 
        text: `Import successful! ${JSON.stringify(result.imported)}` 
      });
      setImportFile(null);
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    const confirm1 = confirm('⚠️ WARNING: This will DELETE ALL DATA in the database. This cannot be undone. Are you sure?');
    if (!confirm1) return;

    const confirm2 = confirm('⚠️ FINAL WARNING: All artworks, digital works, exhibitions, sales, and images will be permanently deleted. Type YES to continue.');
    if (!confirm2) return;

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      await backupAPI.clear();
      
      setMessage({ type: 'success', text: 'All data cleared successfully' });
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Clear error:', error);
      setMessage({ type: 'error', text: `Clear failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Backup & Restore</h1>
      
      {message.text && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Export Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h2>Export Backup</h2>
        <p>Download a complete backup of all your data including artworks, digital works, exhibitions, sales, tags, and series.</p>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={loading}
          style={{ marginTop: '10px' }}
        >
          {loading ? 'Exporting...' : 'Export Backup'}
        </button>
      </div>

      {/* Import Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h2>Import Backup</h2>
        <p>Restore data from a backup file. You can either merge with existing data or clear all data first.</p>
        
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={loading}
            style={{ 
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px'
            }}
          />
          {importFile && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              Selected: {importFile.name}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            className="btn btn-success"
            onClick={() => handleImport(false)}
            disabled={loading || !importFile}
          >
            {loading ? 'Importing...' : 'Import & Merge'}
          </button>
          <button
            className="btn btn-warning"
            onClick={() => handleImport(true)}
            disabled={loading || !importFile}
          >
            {loading ? 'Importing...' : 'Clear All & Import'}
          </button>
        </div>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Note:</strong>
          <ul style={{ marginTop: '5px', marginBottom: '0' }}>
            <li><strong>Import & Merge:</strong> Adds backup data to existing data. Duplicates will be updated.</li>
            <li><strong>Clear All & Import:</strong> Deletes all existing data first, then imports backup (recommended for clean restore).</li>
          </ul>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ 
        padding: '20px', 
        border: '2px solid #dc3545', 
        borderRadius: '8px',
        backgroundColor: '#fff5f5'
      }}>
        <h2 style={{ color: '#dc3545' }}>⚠️ Danger Zone</h2>
        <p>Permanently delete all data from the database. This action cannot be undone!</p>
        <button
          className="btn btn-danger"
          onClick={handleClearAll}
          disabled={loading}
          style={{ marginTop: '10px' }}
        >
          {loading ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>
    </div>
  );
}

export default BackupRestore;
