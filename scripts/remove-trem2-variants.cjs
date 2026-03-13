const ExcelJS = require('exceljs');
const path = require('path');

const filePath = path.resolve('C:/Users/quest/Programming/alz-market-viz/src/data/mechanisticFramework/framework.xlsx');

async function removeRow() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Nodes');
  if (!sheet) {
    console.error('ERROR: Could not find "Nodes" sheet');
    process.exit(1);
  }

  console.log(`Total rows in Nodes sheet: ${sheet.rowCount}`);

  let targetRowNumber = null;

  sheet.eachRow((row, rowNumber) => {
    const idCell = row.getCell(1).value;
    if (idCell === 'TREM2_variants') {
      targetRowNumber = rowNumber;
      console.log(`Found TREM2_variants at row ${rowNumber}`);
    }
  });

  if (targetRowNumber === null) {
    console.log('TREM2_variants not found in Nodes sheet.');
    process.exit(0);
  }

  sheet.spliceRows(targetRowNumber, 1);
  console.log(`Removed row ${targetRowNumber}`);
  console.log(`New row count: ${sheet.rowCount}`);

  await workbook.xlsx.writeFile(filePath);
  console.log('File saved successfully.');

  // Verify
  console.log('\n--- Verification ---');
  const workbook2 = new ExcelJS.Workbook();
  await workbook2.xlsx.readFile(filePath);
  const sheet2 = workbook2.getWorksheet('Nodes');
  let found = false;
  sheet2.eachRow((row, rowNumber) => {
    const idCell = row.getCell(1).value;
    if (typeof idCell === 'string' && idCell.includes('TREM2')) {
      console.log(`Row ${rowNumber}: id = "${idCell}"`);
      found = true;
    }
  });
  if (!found) {
    console.log('No TREM2 entries found in Nodes sheet. Removal confirmed.');
  }
}

removeRow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
