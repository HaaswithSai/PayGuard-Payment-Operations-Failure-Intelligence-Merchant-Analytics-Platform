const XLSX = require('xlsx');

/**
 * OpenXML Binary (.xlsx) Builder for Microsoft Excel
 * Compatible with Microsoft Excel (all versions), Google Sheets, Apple Numbers, and LibreOffice.
 * @param {Array<object>} data - Array of row objects
 * @param {Array<{ key: string, header: string }>} columns - Column definitions
 * @param {string} [sheetName='PayGuard Report'] - Workbook sheet name
 * @returns {Buffer} Binary XLSX buffer
 */
const jsonToExcelBuffer = (data, columns, sheetName = 'PayGuard Report') => {
  let formattedData = [];

  if (Array.isArray(data) && data.length > 0) {
    if (columns && columns.length > 0) {
      formattedData = data.map((row) => {
        const rowObj = {};
        columns.forEach((col) => {
          rowObj[col.header] = getNestedValue(row, col.key);
        });
        return rowObj;
      });
    } else {
      formattedData = data;
    }
  } else {
    formattedData = [{ Message: 'No Data Available for the Selected Period' }];
  }

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  
  // Sheet name max 31 chars in Excel
  const safeSheetName = (sheetName || 'Report').substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const getNestedValue = (obj, path) => {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
};

module.exports = {
  jsonToExcelBuffer,
};

