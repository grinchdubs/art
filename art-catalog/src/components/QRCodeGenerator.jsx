import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

function QRCodeGenerator({ url, title, inventory, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    generateQR();
  }, [url]);

  async function generateQR() {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  function downloadQR() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size (QR + label area)
    canvas.width = 500;
    canvas.height = 600;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code
    const img = new Image();
    img.onload = () => {
      const qrSize = 400;
      const x = (canvas.width - qrSize) / 2;
      ctx.drawImage(img, x, 50, qrSize, qrSize);
      
      // Add title and inventory below QR
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(title, canvas.width / 2, 480);
      
      if (inventory) {
        ctx.font = '18px Arial';
        ctx.fillText(inventory, canvas.width / 2, 510);
      }
      
      // Add URL at bottom
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(url, canvas.width / 2, 560);
      
      // Download
      const link = document.createElement('a');
      link.download = `qr-${inventory || 'code'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrDataUrl;
  }

  function copyURL() {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          maxWidth: '500px',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px', color: '#2c3e50' }}>QR Code</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: '#2c3e50' }}>{title}</h3>
          {inventory && (
            <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>{inventory}</p>
          )}
        </div>

        {qrDataUrl && (
          <div style={{ marginBottom: '24px' }}>
            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{ maxWidth: '100%', border: '8px solid #ecf0f1', borderRadius: '8px' }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px', fontSize: '12px', color: '#7f8c8d', wordBreak: 'break-all' }}>
          {url}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={downloadQR}>
            Download QR Code
          </button>
          <button className="btn btn-secondary" onClick={copyURL}>
            Copy URL
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeGenerator;
