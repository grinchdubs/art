// Export utilities for digital works catalog

/**
 * Convert digital works to CSV format
 */
export function exportDigitalWorksToCSV(works) {
  if (!works || works.length === 0) {
    alert('No digital works to export');
    return;
  }

  const headers = [
    'Inventory Number',
    'Title',
    'Creation Date',
    'File Format',
    'File Size',
    'Dimensions',
    'Sale Status',
    'Price',
    'License Type',
    'Notes',
    'Added to Catalog',
    'Last Updated'
  ];

  const rows = works.map(work => {
    return [
      work.inventory_number || '',
      work.title || '',
      work.creation_date || '',
      work.file_format || '',
      work.file_size || '',
      work.dimensions || '',
      work.sale_status || '',
      work.price || '',
      work.license_type || '',
      work.notes ? `"${work.notes.replace(/"/g, '""')}"` : '',
      work.created_at || '',
      work.updated_at || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadFile(csvContent, 'digital-works-export.csv', 'text/csv');
}

/**
 * Convert digital works to JSON format
 */
export function exportDigitalWorksToJSON(works) {
  if (!works || works.length === 0) {
    alert('No digital works to export');
    return;
  }

  const jsonContent = JSON.stringify(works, null, 2);
  downloadFile(jsonContent, 'digital-works-export.json', 'application/json');
}

/**
 * Generate a simple text-based report
 */
export function exportDigitalWorksToText(works) {
  if (!works || works.length === 0) {
    alert('No digital works to export');
    return;
  }

  const timestamp = new Date().toLocaleString();

  let textContent = `DIGITAL WORKS CATALOG REPORT\n`;
  textContent += `Generated: ${timestamp}\n`;
  textContent += `Total Digital Works: ${works.length}\n`;
  textContent += `${'='.repeat(80)}\n\n`;

  works.forEach((work, index) => {
    textContent += `${index + 1}. ${work.title || 'Untitled'}\n`;
    textContent += `   Inventory: ${work.inventory_number || 'N/A'}\n`;
    if (work.creation_date) {
      textContent += `   Created: ${new Date(work.creation_date).toLocaleDateString()}\n`;
    }
    if (work.file_format) {
      textContent += `   Format: ${work.file_format}\n`;
    }
    if (work.file_size) {
      textContent += `   File Size: ${work.file_size}\n`;
    }
    if (work.dimensions) {
      textContent += `   Dimensions: ${work.dimensions}\n`;
    }
    textContent += `   Status: ${work.sale_status || 'N/A'}\n`;
    if (work.price) {
      textContent += `   Price: ${work.price}\n`;
    }
    if (work.license_type) {
      textContent += `   License: ${work.license_type}\n`;
    }
    if (work.notes) {
      textContent += `   Notes: ${work.notes}\n`;
    }
    textContent += '\n';
  });

  downloadFile(textContent, 'digital-works-report.txt', 'text/plain');
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
export function exportDigitalWorksStats(works) {
  if (!works || works.length === 0) {
    alert('No digital works to export');
    return;
  }

  const stats = {
    totalDigitalWorks: works.length,
    byStatus: {},
    byFormat: {},
    byLicense: {},
    generatedAt: new Date().toISOString()
  };

  works.forEach(work => {
    const status = work.sale_status || 'unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    const format = work.file_format || 'unknown';
    stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;

    const license = work.license_type || 'none';
    stats.byLicense[license] = (stats.byLicense[license] || 0) + 1;
  });

  const jsonContent = JSON.stringify(stats, null, 2);
  downloadFile(jsonContent, 'digital-works-statistics.json', 'application/json');
}
