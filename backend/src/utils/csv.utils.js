/**
 * RFC 4180 Compliant CSV Serializer
 * Handles quoting, embedded commas, double quotes, and linebreaks.
 * @param {Array<object>} data - Array of row objects
 * @param {Array<{ key: string, header: string }>} columns - Column definitions
 * @returns {string} Serialized CSV text
 */
const jsonToCsv = (data, columns) => {
  if (!Array.isArray(data) || data.length === 0) {
    // If no data, return header line only
    if (columns && columns.length > 0) {
      return columns.map((col) => escapeCsvValue(col.header)).join(',') + '\r\n';
    }
    return '';
  }

  // Derive columns from first object if not explicitly provided
  const cols =
    columns && columns.length > 0
      ? columns
      : Object.keys(data[0]).map((key) => ({ key, header: key }));

  const headerLine = cols.map((col) => escapeCsvValue(col.header)).join(',');
  const rowLines = data.map((row) => {
    return cols
      .map((col) => {
        const val = getNestedValue(row, col.key);
        return escapeCsvValue(val);
      })
      .join(',');
  });

  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
};

/**
 * Escape single CSV cell value
 */
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // If value contains comma, double-quote, or newline, escape quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }

  return str;
};

/**
 * Helper to safely extract dot-notated nested properties
 */
const getNestedValue = (obj, path) => {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
};

module.exports = {
  jsonToCsv,
  escapeCsvValue,
};
