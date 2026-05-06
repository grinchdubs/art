// Export utilities for artwork catalog

/**
 * Convert artworks to CSV format
 */
export function exportToCSV(artworks) {
  if (!artworks || artworks.length === 0) {
    alert('No artworks to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Inventory Number',
    'Title',
    'Creation Date',
    'Medium',
    'Dimensions',
    'Series/Collection',
    'Sale Status',
    'Price',
    'Location',
    'Notes',
    'Added to Catalog',
    'Last Updated'
  ];

  // Convert artworks to CSV rows
  const rows = artworks.map(artwork => {
    return [
      artwork.inventory_number || '',
      artwork.title || '',
      artwork.creation_date || '',
      artwork.medium || '',
      artwork.dimensions || '',
      artwork.series_name || '',
      artwork.sale_status || '',
      artwork.price || '',
      artwork.location || '',
      artwork.notes ? `"${artwork.notes.replace(/"/g, '""')}"` : '', // Escape quotes in notes
      artwork.created_at || '',
      artwork.updated_at || ''
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  downloadFile(csvContent, 'artworks-export.csv', 'text/csv');
}

/**
 * Convert artworks to JSON format
 */
export function exportToJSON(artworks) {
  if (!artworks || artworks.length === 0) {
    alert('No artworks to export');
    return;
  }

  const jsonContent = JSON.stringify(artworks, null, 2);
  downloadFile(jsonContent, 'artworks-export.json', 'application/json');
}

/**
 * Generate a simple text-based report
 */
export function exportToText(artworks) {
  if (!artworks || artworks.length === 0) {
    alert('No artworks to export');
    return;
  }

  const timestamp = new Date().toLocaleString();

  let textContent = `ARTWORK CATALOG REPORT\n`;
  textContent += `Generated: ${timestamp}\n`;
  textContent += `Total Artworks: ${artworks.length}\n`;
  textContent += `${'='.repeat(80)}\n\n`;

  artworks.forEach((artwork, index) => {
    textContent += `${index + 1}. ${artwork.title || 'Untitled'}\n`;
    textContent += `   Inventory: ${artwork.inventory_number || 'N/A'}\n`;
    if (artwork.creation_date) {
      textContent += `   Created: ${new Date(artwork.creation_date).toLocaleDateString()}\n`;
    }
    if (artwork.medium) {
      textContent += `   Medium: ${artwork.medium}\n`;
    }
    if (artwork.dimensions) {
      textContent += `   Dimensions: ${artwork.dimensions}\n`;
    }
    if (artwork.series_name) {
      textContent += `   Series: ${artwork.series_name}\n`;
    }
    textContent += `   Status: ${artwork.sale_status || 'N/A'}\n`;
    if (artwork.price) {
      textContent += `   Price: ${artwork.price}\n`;
    }
    if (artwork.location) {
      textContent += `   Location: ${artwork.location}\n`;
    }
    if (artwork.notes) {
      textContent += `   Notes: ${artwork.notes}\n`;
    }
    textContent += '\n';
  });

  downloadFile(textContent, 'artworks-report.txt', 'text/plain');
}

/**
 * Helper function to download a file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export statistics summary
 */
export function exportStats(artworks) {
  if (!artworks || artworks.length === 0) {
    alert('No artworks to export');
    return;
  }

  const stats = {
    totalArtworks: artworks.length,
    byStatus: {},
    byMedium: {},
    bySeries: {},
    byLocation: {},
    generatedAt: new Date().toISOString()
  };

  // Calculate statistics
  artworks.forEach(artwork => {
    // By status
    const status = artwork.sale_status || 'unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // By medium
    const medium = artwork.medium || 'unknown';
    stats.byMedium[medium] = (stats.byMedium[medium] || 0) + 1;

    // By series
    const series = artwork.series_name || 'none';
    stats.bySeries[series] = (stats.bySeries[series] || 0) + 1;

    // By location
    const location = artwork.location || 'unknown';
    stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
  });

  const jsonContent = JSON.stringify(stats, null, 2);
  downloadFile(jsonContent, 'artworks-statistics.json', 'application/json');
}
