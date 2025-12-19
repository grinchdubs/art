// Import utilities for digital works catalog

/**
 * Parse CSV file and convert to digital work objects
 */
export function parseDigitalWorksCSV(csvText) {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = parseCSVLine(lines[0]);

  const expectedHeaders = [
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

  const hasValidHeaders = expectedHeaders.every(header =>
    headers.some(h => h.toLowerCase() === header.toLowerCase())
  );

  if (!hasValidHeaders) {
    throw new Error('CSV headers do not match expected format. Please use the export template.');
  }

  const works = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    try {
      const values = parseCSVLine(lines[i]);
      const work = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch (header.toLowerCase()) {
          case 'inventory number':
            work.inventory_number = value;
            break;
          case 'title':
            work.title = value;
            break;
          case 'creation date':
            work.creation_date = value;
            break;
          case 'file format':
            work.file_format = value;
            break;
          case 'file size':
            work.file_size = value;
            break;
          case 'dimensions':
            work.dimensions = value;
            break;
          case 'sale status':
            work.sale_status = value || 'available';
            break;
          case 'price':
            work.price = value;
            break;
          case 'license type':
            work.license_type = value;
            break;
          case 'notes':
            work.notes = value;
            break;
        }
      });

      if (!work.title) {
        errors.push({
          row: i + 1,
          message: 'Missing required field: Title',
          data: work
        });
        continue;
      }

      works.push(work);
    } catch (error) {
      errors.push({
        row: i + 1,
        message: error.message,
        data: lines[i]
      });
    }
  }

  return { works, errors };
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
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  values.push(currentValue.trim());

  return values;
}

/**
 * Generate CSV template for import
 */
export function downloadDigitalWorksTemplate() {
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
    'Notes'
  ];

  const exampleRow = [
    'GRNCH-DIG-2025-001',
    'Example Digital Work',
    '2025-01-15',
    'PNG',
    '5MB',
    '1920x1080',
    'available',
    '$100',
    'CC BY-SA',
    'This is an example digital work for import'
  ];

  const csvContent = [
    headers.join(','),
    exampleRow.join(',')
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'digital-works-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
