import * as XLSX from "xlsx";

/**
 * COA Form Excel Generator
 * Generates Property, Plant and Equipment Ledger Card (COA Form No. I-A-2)
 * Matches the exact Appendix 70 format
 */

export async function generateCOAExcel(asset, depreciationData) {
  try {
    // Fetch the template file
    const response = await fetch('/Appendix 70 - PPELC.xls');
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse the template
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get depreciation data for this asset, sorted by year descending (newest first)
    const depData = [...depreciationData]
      .filter(d => d.assetId === asset.id)
      .sort((a, b) => b.year - a.year);
    
    // Helper function to set cell value while preserving existing style
    const setCellValue = (cellRef, value) => {
      const existingCell = worksheet[cellRef];
      worksheet[cellRef] = {
        ...existingCell,
        v: value,
        t: typeof value === 'number' ? 'n' : 's'
      };
    };
    
    // Helper to set number cell while preserving style
    const setNumCellValue = (cellRef, value) => {
      const existingCell = worksheet[cellRef];
      worksheet[cellRef] = {
        ...existingCell,
        v: parseFloat(value) || 0,
        t: 'n'
      };
    };
    
    // ==================== HEADER SECTION ====================
    
    // A38: Appendix 70 (vertical text reference)
    setCellValue('A38', 'Appendix 70');
    
    // K1-L1: Appendix 70 (horizontal header)
    setCellValue('K1', 'Appendix 70');
    setCellValue('L1', '');
    
    // B2-L2: spaces
    for (let col = 1; col <= 12; col++) {
      const cell = String.fromCharCode(65 + col) + '2';
      setCellValue(cell, '');
    }
    
    // B3-L3: spaces
    for (let col = 1; col <= 12; col++) {
      const cell = String.fromCharCode(65 + col) + '3';
      setCellValue(cell, '');
    }
    
    // B4-L4: PROPERTY, PLANT AND EQUIPMENT LEDGER CARD
    setCellValue('B4', 'PROPERTY, PLANT AND EQUIPMENT LEDGER CARD');
    for (let col = 2; col <= 12; col++) {
      const cell = String.fromCharCode(65 + col) + '4';
      setCellValue(cell, '');
    }
    
    // B5-L5: spaces
    for (let col = 1; col <= 12; col++) {
      const cell = String.fromCharCode(65 + col) + '5';
      setCellValue(cell, '');
    }
    
    // B6-L6: spaces
    for (let col = 1; col <= 12; col++) {
      const cell = String.fromCharCode(65 + col) + '6';
      setCellValue(cell, '');
    }
    
    // B7-G7: Entity Name
    setCellValue('B7', 'Entity Name:');
    setCellValue('C7', '');
    setCellValue('D7', '');
    setCellValue('E7', '');
    setCellValue('F7', '');
    setCellValue('G7', '');
    
    // J7-L7: Fund Cluster
    setCellValue('J7', 'Fund Cluster:');
    setCellValue('K7', '');
    setCellValue('L7', '');
    
    // ==================== PROPERTY INFORMATION SECTION ====================
    
    // B9-I10: Description (inside box)
    setCellValue('B9', 'Description:');
    setCellValue('B10', asset.description || '');
    for (let col = 3; col <= 9; col++) {
      const cell = String.fromCharCode(65 + col) + '9';
      setCellValue(cell, '');
    }
    for (let col = 2; col <= 9; col++) {
      const cell = String.fromCharCode(65 + col) + '10';
      setCellValue(cell, '');
    }
    
    // B11-I12: Description (inside box)
    setCellValue('B11', 'Description:');
    setCellValue('B12', '');
    for (let col = 3; col <= 9; col++) {
      const cell = String.fromCharCode(65 + col) + '11';
      setCellValue(cell, '');
    }
    for (let col = 2; col <= 9; col++) {
      const cell = String.fromCharCode(65 + col) + '12';
      setCellValue(cell, '');
    }
    
    // J9-L9: Object Account Code
    setCellValue('J9', 'Object Account Code:');
    setCellValue('K9', asset.accountCode || '');
    setCellValue('L9', '');
    
    // J10-L10: Estimated Useful Life
    setCellValue('J10', 'Estimated Useful Life:');
    setCellValue('K10', asset.usefulLife ? `${asset.usefulLife} years` : '');
    setCellValue('L10', '');
    
    // J11-L11: Rate of Depreciation
    setCellValue('J11', 'Rate of Depreciation:');
    setCellValue('K11', asset.depreciationRate || '');
    setCellValue('L11', '');
    
    // J12-L12: spaces
    setCellValue('J12', '');
    setCellValue('K12', '');
    setCellValue('L12', '');
    
    // ==================== TABLE HEADERS (Row 13-14) ====================
    
    // B13-B14: Date
    setCellValue('B13', 'Date');
    setCellValue('B14', '');
    
    // C13-C14: Description (removed Reference)
    setCellValue('C13', 'Description');
    setCellValue('C14', '');
    
    // D13: Remarks (removed Receipt)
    setCellValue('D13', 'Remarks');
    
    // D14: Qty.
    setCellValue('D14', 'Qty.');
    
    // E14: Unit Cost
    setCellValue('E14', 'Unit Cost');
    
    // F14: Total Cost
    setCellValue('F14', 'Total Cost');
    
    // G13-G14: Accumulated Depreciation
    setCellValue('G13', 'Accumulated Depreciation');
    setCellValue('G14', '');
    
    // H13-H14: Accumulated Impairment Losses
    setCellValue('H13', 'Accumulated Impairment Losses');
    setCellValue('H14', '');
    
    // I13-I14: Issues/Transfers/Adjustments
    setCellValue('I13', 'Issues/Transfers/Adjustments');
    setCellValue('I14', '');
    
    // J13-J14: Adjusted Cost
    setCellValue('J13', 'Adjusted Cost');
    setCellValue('J14', '');
    
    // K13-L13: Repair History
    setCellValue('K13', 'Repair History');
    setCellValue('L13', '');
    
    // K14: Nature of Repair
    setCellValue('K14', 'Nature of Repair');
    
    // L14: Amount
    setCellValue('L14', 'Amount');
    
    // ==================== DATA ROWS (Row 15-38) ====================
    
    // Row 15: Initial property entry
    setCellValue('B15', asset.dateAcquired || '');
    setCellValue('C15', asset.propertyNumber || '');
    setNumCellValue('D15', asset.quantity || 1);
    setNumCellValue('E15', asset.unitCost || 0);
    setNumCellValue('F15', asset.totalCost || asset.unitCost || 0);
    setNumCellValue('G15', 0); // Accumulated Depreciation initially 0
    setNumCellValue('H15', 0); // Accumulated Impairment Losses
    setNumCellValue('I15', 0); // Issues/Transfers/Adjustments
    setNumCellValue('J15', asset.totalCost || asset.unitCost || 0); // Adjusted Cost
    setCellValue('K15', ''); // Nature of Repair
    setNumCellValue('L15', 0); // Amount
    
    // Rows 16-38: Depreciation entries (sorted by year descending - newest first)
    let row = 16;
    depData.forEach((dep) => {
      if (row <= 38) {
        setCellValue(`B${row}`, dep.year?.toString() || '');
        setCellValue(`C${row}`, dep.description || ''); // Description instead of Reference
        setNumCellValue(`D${row}`, 0); // Qty
        setNumCellValue(`E${row}`, 0); // Unit Cost
        setNumCellValue(`F${row}`, 0); // Total Cost
        setNumCellValue(`G${row}`, dep.accumulatedDepreciation || 0); // Accumulated Depreciation
        setNumCellValue(`H${row}`, 0); // Accumulated Impairment Losses
        setNumCellValue(`I${row}`, 0); // Issues/Transfers/Adjustments
        setNumCellValue(`J${row}`, dep.endingBookValue || 0); // Adjusted Cost (Ending Book Value)
        setCellValue(`K${row}`, ''); // Nature of Repair
        setNumCellValue(`L${row}`, 0); // Amount
        row++;
      }
    });
    
    // Fill remaining rows with empty values
    while (row <= 38) {
      setCellValue(`B${row}`, '');
      setCellValue(`C${row}`, '');
      setNumCellValue(`D${row}`, 0);
      setNumCellValue(`E${row}`, 0);
      setNumCellValue(`F${row}`, 0);
      setNumCellValue(`G${row}`, 0);
      setNumCellValue(`H${row}`, 0);
      setNumCellValue(`I${row}`, 0);
      setNumCellValue(`J${row}`, 0);
      setCellValue(`K${row}`, '');
      setNumCellValue(`L${row}`, 0);
      row++;
    }
    
    return workbook;
    
  } catch (err) {
    console.error("Error generating COA Excel:", err);
    throw err;
  }
}

export async function downloadCOAFile(asset, depreciationData) {
  try {
    const workbook = await generateCOAExcel(asset, depreciationData);
    
    // Generate buffer - use xlsx format to preserve styles
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', bookSST: false });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PPELC_${asset.propertyNumber || 'export'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error downloading COA file:", err);
    alert("Error generating COA form. Please try again.");
  }
}

// HTML generator for Word export - matches Appendix 70 format
export function generateCOAHTML(asset, depreciationData) {
  const sortedData = [...depreciationData].sort((a, b) => b.year - a.year);
  
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>COA Property Form</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid black; padding: 3px; }
      .header { text-align: center; font-weight: bold; }
      .bold { font-weight: bold; }
      .center { text-align: center; }
      .right { text-align: right; }
    </style>
    </head><body>
    
    <table style='width: 100%; border: none;'>
      <tr>
        <td style='width: 50px; border: none; vertical-align: top;'>
          <p style='-webkit-transform: rotate(-90deg); transform: rotate(-90deg); margin: 0;'>Appendix 70</p>
        </td>
        <td style='border: none; text-align: center;'>
          <p style='margin: 0; font-style: italic;'>Appendix 70</p>
          <p style='margin: 0; font-weight: bold; font-size: 14pt;'>PROPERTY, PLANT AND EQUIPMENT LEDGER CARD</p>
          <p style='margin: 0;'>(COA Form No. I-A-2)</p>
        </td>
        <td style='width: 50px; border: none;'></td>
      </tr>
    </table>
    
    <table style='width: 100%; border: none; margin-top: 10px;'>
      <tr>
        <td style='border: none;'><span class='bold'>Entity Name:</span> _________________________</td>
        <td style='border: none;'><span class='bold'>Fund Cluster:</span> _________</td>
      </tr>
    </table>
    
    <table style='width: 100%; border: 1px solid black; margin-top: 10px;'>
      <tr>
        <td style='border: 1px solid black;' colspan='4'>
          <span class='bold'>Object Account Code:</span> ${asset.accountCode || ''}<br>
          <span class='bold'>Estimated Useful Life:</span> ${asset.usefulLife || ''} years<br>
          <span class='bold'>Rate of Depreciation:</span> ${asset.depreciationRate ? asset.depreciationRate + '%' : '-'}
        </td>
      </tr>
    </table>
    
    <table style='width: 100%; border-collapse: collapse; margin-top: 10px;'>
      <tr>
        <th class='center' rowspan='2' style='width: 60px;'>Date</th>
        <th class='center' rowspan='2' style='width: 60px;'>Description</th>
        <th class='center' colspan='3'>Remarks</th>
        <th class='center' rowspan='2'>Accumulated Depreciation</th>
        <th class='center' rowspan='2'>Accumulated Impairment Losses</th>
        <th class='center' rowspan='2'>Issues/ Transfers/ Adjustments</th>
        <th class='center' rowspan='2'>Adjusted Cost</th>
        <th class='center' colspan='2'>Repair History</th>
      </tr>
      <tr>
        <th class='center'>Qty.</th>
        <th class='center'>Unit Cost</th>
        <th class='center'>Total Cost</th>
        <th class='center'>Nature of Repair</th>
        <th class='center'>Amount</th>
      </tr>
      
      <!-- Initial Entry Row -->
      <tr>
        <td class='center'>${formatDate(asset.dateAcquired)}</td>
        <td class='center'>${asset.propertyNumber || ''}</td>
        <td class='center'>${asset.quantity || 1}</td>
        <td class='right'>${formatCurrency(asset.unitCost)}</td>
        <td class='right'>${formatCurrency(asset.totalCost || asset.unitCost)}</td>
        <td class='right'>-</td>
        <td class='right'>-</td>
        <td class='right'>-</td>
        <td class='right'>${formatCurrency(asset.totalCost || asset.unitCost)}</td>
        <td></td>
        <td></td>
      </tr>
      
      <!-- Depreciation Rows -->
      ${sortedData.map(dep => `
      <tr>
        <td class='center'>${dep.year}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class='right'>${formatCurrency(dep.accumulatedDepreciation)}</td>
        <td class='right'>-</td>
        <td class='right'>-</td>
        <td class='right'>${formatCurrency(dep.endingBookValue)}</td>
        <td></td>
        <td></td>
      </tr>
      `).join('')}
      
      <!-- Empty rows to fill -->
      ${Array.from({ length: Math.max(0, 15 - sortedData.length) }).map(() => `
      <tr>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
      `).join('')}
    </table>
    
    </body></html>
  `;
  
  return html;
}
