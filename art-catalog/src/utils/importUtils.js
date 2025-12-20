// Import utilities for artwork catalog

/**
 * Parse CSV file and convert to artwork objects
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Expected headers from export format (only require the essential ones)
  const expectedHeaders = [
    'Inventory Number',
    'Title',
    'Creation Date',
    'Medium',
    'Dimensions',
    'Series/Collection',
    'Sale Status',
    'Price',
    'Location',
    'Notes'
  ];

  // Debug: log the headers
  console.log('Parsed headers:', headers);
  console.log('Expected headers:', expectedHeaders);

  // Validate headers - check if at least Title is present (most important field)
  const hasTitle = headers.some(h => h.toLowerCase().trim() === 'title');

  if (!hasTitle) {
    throw new Error(`CSV headers do not match expected format. Found headers: ${headers.join(', ')}. Please use the export template.`);
  }

  // Parse data rows
  const artworks = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    try {
      const values = parseCSVLine(lines[i]);
      const artwork = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch (header.toLowerCase()) {
          case 'inventory number':
            artwork.inventory_number = value;
            break;
          case 'title':
            artwork.title = value;
            break;
          case 'creation date':
            artwork.creation_date = value;
            break;
          case 'medium':
            artwork.medium = value;
            break;
          case 'dimensions':
            artwork.dimensions = value;
            break;
          case 'series/collection':
            artwork.series_name = value;
            break;
          case 'sale status':
            artwork.sale_status = value || 'available';
            break;
          case 'price':
            artwork.price = value;
            break;
          case 'location':
            artwork.location = value;
            break;
          case 'notes':
            artwork.notes = value;
            break;
        }
      });

      // Validate required fields
      if (!artwork.title) {
        errors.push({
          row: i + 1,
          message: 'Missing required field: Title',
          data: artwork
        });
        continue;
      }

      artworks.push(artwork);
    } catch (error) {
      errors.push({
        row: i + 1,
        message: error.message,
        data: lines[i]
      });
    }
  }

  return { artworks, errors };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of value
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Push last value
  values.push(currentValue.trim());

  return values;
}

/**
 * Validate sale status
 */
export function validateSaleStatus(status) {
  const validStatuses = ['available', 'sold', 'on-loan'];
  const normalized = status.toLowerCase().trim();

  if (!normalized) return 'available';
  if (validStatuses.includes(normalized)) return normalized;

  throw new Error(`Invalid sale status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
}

/**
 * Generate CSV template for import
 */
export function downloadTemplate() {
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
    'Notes'
  ];

  const exampleRow = [
    'GRNCH-2025-Example-001',
    'Example Artwork',
    '2025-01-15',
    'Oil on Canvas',
    '24 x 36 inches',
    'Example Series',
    'available',
    '$500',
    'Studio',
    'This is an example artwork for import'
  ];

  const csvContent = [
    headers.join(','),
    exampleRow.join(',')
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'artwork-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
