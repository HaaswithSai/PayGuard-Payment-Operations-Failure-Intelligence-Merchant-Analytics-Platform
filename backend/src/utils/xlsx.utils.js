/**
 * SpreadsheetML XML Builder for Microsoft Excel (.xlsx / .xml)
 * Compatible with Microsoft Excel, Google Sheets, and LibreOffice.
 * @param {Array<object>} data - Array of row objects
 * @param {Array<{ key: string, header: string }>} columns - Column definitions
 * @param {string} [sheetName='PayGuard Report'] - Workbook sheet name
 * @returns {string} XML Spreadsheet document
 */
const jsonToExcelXml = (data, columns, sheetName = 'PayGuard Report') => {
  const cols =
    columns && columns.length > 0
      ? columns
      : data.length > 0
      ? Object.keys(data[0]).map((key) => ({ key, header: key }))
      : [{ key: 'message', header: 'No Data' }];

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
`;

  // Header Row
  xml += '   <Row ss:Height="24">\n';
  cols.forEach((col) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`;
  });
  xml += '   </Row>\n';

  // Data Rows
  if (Array.isArray(data) && data.length > 0) {
    data.forEach((row) => {
      xml += '   <Row ss:Height="18">\n';
      cols.forEach((col) => {
        const val = getNestedValue(row, col.key);
        const isNum = typeof val === 'number' && !isNaN(val);
        const cellType = isNum ? 'Number' : 'String';
        const styleId = isNum ? ' ss:StyleID="NumberCell"' : '';
        xml += `    <Cell${styleId}><Data ss:Type="${cellType}">${escapeXml(val)}</Data></Cell>\n`;
      });
      xml += '   </Row>\n';
    });
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
};

const escapeXml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getNestedValue = (obj, path) => {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
};

module.exports = {
  jsonToExcelXml,
  escapeXml,
};
