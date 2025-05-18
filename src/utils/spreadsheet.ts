import ExcelJS from 'exceljs';
import type { Transaction, Category } from '../types/transaction';
import { getTransactions, getCategories, getBudgetedAmounts } from './storage';
import { createStandaloneToast } from '@chakra-ui/react';
import { parseDescription } from './parseDescription';

const { toast } = createStandaloneToast();

// Constants
const LIGHT_GREEN = 'E8F5E9';
const TABLE_HEADER_GREEN = '006400';
const BORDER_COLOR = 'D0D0D0';

interface MonthlyData {
  income: Transaction[];
  expenses: Transaction[];
  all: Transaction[];
}

interface MonthlyTransactions {
  [key: string]: MonthlyData;
}

const groupTransactionsByMonth = (transactions: Transaction[]): MonthlyTransactions => {
  return transactions.reduce((acc: MonthlyTransactions, transaction: Transaction) => {
    const date = new Date(transaction.transactionDate.split('/').reverse().join('-'));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) {
      acc[key] = { income: [], expenses: [], all: [] };
    }
    acc[key].all.push(transaction);
    if (transaction.creditAmount) {
      acc[key].income.push(transaction);
    } else if (transaction.debitAmount) {
      acc[key].expenses.push(transaction);
    }
    return acc;
  }, {});
};

const formatMonthYear = (key: string): string => {
  const [year, month] = key.split('-').map(str => parseInt(str));
  if (!year || !month) return 'Invalid Date';
  return new Date(year, month - 1).toLocaleString('en-GB', { 
    month: 'short',
    year: '2-digit'
  });
};

const createMonthlySheet = async (
  workbook: ExcelJS.Workbook,
  monthKey: string,
  transactions: Transaction[],
  categories: Category[]
) => {
  const monthName = formatMonthYear(monthKey);
  const worksheet = workbook.addWorksheet(monthName);

  // Set column widths
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Name', key: 'name', width: 35 },
    { header: 'Reference', key: 'reference', width: 40 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Running Balance', key: 'balance', width: 15 },
    { header: 'Notes', key: 'notes', width: 25 }
  ];

  // Add title and logo
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'EUMHC';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add subtitle
  worksheet.mergeCells('A2:G2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `Financial Summary for ${monthName}`;
  subtitleCell.font = { size: 14, bold: true };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F0F0F0' }
  };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Calculate opening balance based on month position
  const allTransactions = getTransactions().sort((a, b) => {
    const dateA = new Date(a.transactionDate.split('/').reverse().join('-'));
    const dateB = new Date(b.transactionDate.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });

  // Find the first transaction of this month
  const firstTransactionOfMonth = transactions[0];
  let openingBalance = 0;

  if (firstTransactionOfMonth) {
    // Find the index of this transaction in the overall sorted list
    const transactionIndex = allTransactions.findIndex(t => 
      t.transactionDate === firstTransactionOfMonth.transactionDate &&
      t.transactionDescription === firstTransactionOfMonth.transactionDescription &&
      t.balance === firstTransactionOfMonth.balance
    );

    if (transactionIndex === 0) {
      // This is the very first transaction overall
      openingBalance = firstTransactionOfMonth.balance - (firstTransactionOfMonth.creditAmount || 0) + (firstTransactionOfMonth.debitAmount || 0);
    } else if (transactionIndex > 0) {
      // Use the balance from the previous transaction
      const prevTransaction = allTransactions[transactionIndex - 1];
      if (prevTransaction) {
        openingBalance = prevTransaction.balance;
      }
    }
  }

  // Calculate other values
  const income = transactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0);
  const expenses = transactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
  const netMovement = income - expenses;
  const closingBalance = openingBalance + netMovement;

  // Create summary box with proper spacing
  const summaryStartRow = 4;
  const summaryEndRow = 8;
  
  // Create a bordered summary section
  worksheet.mergeCells(`C${summaryStartRow}:F${summaryEndRow}`);
  
  // Add background to entire summary area
  for (let row = summaryStartRow; row <= summaryEndRow; row++) {
    for (let col = 3; col <= 6; col++) {
      const cell = worksheet.getCell(row, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' }
      };
    }
  }

  // Add outer border to summary area
  const borderStyle = { style: 'medium' as const, color: { argb: BORDER_COLOR } };
  for (let row = summaryStartRow; row <= summaryEndRow; row++) {
    worksheet.getCell(row, 3).border = {
      ...worksheet.getCell(row, 3).border,
      left: borderStyle
    };
    worksheet.getCell(row, 6).border = {
      ...worksheet.getCell(row, 6).border,
      right: borderStyle
    };
  }
  for (let col = 3; col <= 6; col++) {
    worksheet.getCell(summaryStartRow, col).border = {
      ...worksheet.getCell(summaryStartRow, col).border,
      top: borderStyle
    };
    worksheet.getCell(summaryEndRow, col).border = {
      ...worksheet.getCell(summaryEndRow, col).border,
      bottom: borderStyle
    };
  }

  // Add summary data
  const summaryData = [
    { label: 'Opening Balance:', value: openingBalance },
    { label: 'Income:', value: income, isPositive: true },
    { label: 'Expenses:', value: expenses, isNegative: true },
    { label: 'Net Movement:', value: netMovement },
    { label: 'Closing Balance:', value: closingBalance, isBold: true }
  ];

  summaryData.forEach((item, index) => {
    const rowNum = summaryStartRow + index;

    // Unmerge any existing merged cells in this row
    worksheet.unMergeCells(`C${rowNum}:F${rowNum}`);
    
    // Label cell
    const labelCell = worksheet.getCell(`C${rowNum}`);
    labelCell.value = item.label;
    labelCell.font = { 
      bold: true,
      size: item.isBold ? 12 : 11
    };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Value cell
    const valueCell = worksheet.getCell(`D${rowNum}`);
    valueCell.value = item.value;
    valueCell.numFmt = '"£"#,##0.00';
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Apply color coding
    if (item.isPositive && item.value > 0) {
      valueCell.font = { color: { argb: '2E7D32' }, bold: true };
    } else if (item.isNegative && item.value > 0) {
      valueCell.font = { color: { argb: 'D32F2F' }, bold: true };
    } else if (!item.isPositive && !item.isNegative) {
      valueCell.font = { 
        color: { argb: item.value >= 0 ? '2E7D32' : 'D32F2F' },
        bold: item.isBold
      };
    }

    // Add subtle separator between rows (except for last row)
    if (index < summaryData.length - 1) {
      [labelCell, valueCell].forEach(cell => {
        cell.border = {
          ...cell.border,
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
        };
      });
    }
  });

  // Split transactions
  const incomeTransactions = transactions.filter(t => t.creditAmount);
  const expenditureTransactions = transactions.filter(t => t.debitAmount);

  let currentRow = 10;

  // Income Section
  if (incomeTransactions.length > 0) {
    // Section header
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const incomeHeader = worksheet.getCell(`A${currentRow}`);
    incomeHeader.value = 'INCOME TRANSACTIONS';
    incomeHeader.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    incomeHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TABLE_HEADER_GREEN }
    };
    incomeHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Table headers
    const headerRow = worksheet.getRow(currentRow);
    ['Date', 'Name', 'Reference', 'Amount', 'Category', 'Running Balance', 'Notes'].forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LIGHT_GREEN }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });
    currentRow++;

    // Add income transactions
    incomeTransactions.forEach(transaction => {
      const { name, reference } = parseDescription({ 
        description: transaction.transactionDescription || '',
        type: transaction.transactionType
      });
      const row = worksheet.getRow(currentRow);
      
      // Add data starting from column A
      row.getCell(1).value = transaction.transactionDate;
      row.getCell(2).value = name;
      row.getCell(3).value = reference;
      row.getCell(4).value = transaction.creditAmount || 0;
      row.getCell(4).numFmt = '"£"#,##0.00';
      row.getCell(4).font = { color: { argb: '2E7D32' } };
      row.getCell(5).value = categories.find(c => c.id === transaction.category)?.name || 'Unselected';
      row.getCell(6).value = transaction.balance;
      row.getCell(6).numFmt = '"£"#,##0.00';
      row.getCell(7).value = '';

      // Style the row
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber >= 1 && colNumber <= 7) {
          cell.border = {
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
          };
          cell.alignment = { vertical: 'middle' };
        }
      });

      currentRow++;
    });

    currentRow += 2;
  }

  // Expenses Section
  if (expenditureTransactions.length > 0) {
    // Section header
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const expenseHeader = worksheet.getCell(`A${currentRow}`);
    expenseHeader.value = 'EXPENSE TRANSACTIONS';
    expenseHeader.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    expenseHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TABLE_HEADER_GREEN }
    };
    expenseHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Table headers
    const headerRow = worksheet.getRow(currentRow);
    ['Date', 'Name', 'Reference', 'Amount', 'Category', 'Running Balance', 'Notes'].forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LIGHT_GREEN }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });
    currentRow++;

    // Add expense transactions
    expenditureTransactions.forEach(transaction => {
      const { name, reference } = parseDescription({ 
        description: transaction.transactionDescription || '',
        type: transaction.transactionType
      });
      const row = worksheet.getRow(currentRow);
      
      // Add data starting from column A
      row.getCell(1).value = transaction.transactionDate;
      row.getCell(2).value = name;
      row.getCell(3).value = reference;
      row.getCell(4).value = transaction.debitAmount || 0;
      row.getCell(4).numFmt = '"£"#,##0.00';
      row.getCell(4).font = { color: { argb: 'D32F2F' } };
      row.getCell(5).value = categories.find(c => c.id === transaction.category)?.name || 'Unselected';
      row.getCell(6).value = transaction.balance;
      row.getCell(6).numFmt = '"£"#,##0.00';
      row.getCell(7).value = '';

      // Style the row
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber >= 1 && colNumber <= 7) {
          cell.border = {
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
          };
          cell.alignment = { vertical: 'middle' };
        }
      });

      currentRow++;
    });
  }
};

const createYearlySummary = async (workbook: ExcelJS.Workbook, processedData: MonthlyTransactions) => {
  const worksheet = workbook.addWorksheet('Yearly Summary');

  // Get all months sorted
  const months = Object.keys(processedData).sort();

  // Set column widths
  worksheet.columns = [
    { header: 'Category' as string, key: 'category', width: 30 },
    ...months.map(monthKey => ({
      header: formatMonthYear(monthKey) as string,
      key: monthKey,
      width: 15
    })),
    { header: 'Total' as string, key: 'total', width: 15 }
  ] as Partial<ExcelJS.Column>[];

  // Add title
  worksheet.mergeCells(`A1:${worksheet.getColumn(worksheet.columnCount).letter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'EUMHC';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add subtitle
  worksheet.mergeCells(`A2:${worksheet.getColumn(worksheet.columnCount).letter}2`);
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = 'Annual Financial Summary';
  subtitleCell.font = { size: 16, bold: true };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F0F0F0' }
  };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add spacing
  worksheet.getRow(3).height = 10;

  let currentRow = 4;

  // INCOME SECTION
  worksheet.mergeCells(`A${currentRow}:${worksheet.getColumn(worksheet.columnCount).letter}${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'MONTHLY INCOME';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell(`A${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  currentRow++;

  // Add headers
  const headerRow = worksheet.getRow(currentRow);
  worksheet.columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = (col.header || '') as string;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_GREEN }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };
  });
  currentRow++;

  // Process income categories
  const categories = getCategories();
  const incomeCategories = categories.filter(cat => cat.type === 'INCOME');
  const incomeTotals = new Array(months.length + 1).fill(0);

  // Check for uncategorized income transactions
  const hasUncategorizedIncome = months.some(month => {
    const monthData = processedData[month] || { income: [], expenses: [], all: [] };
    return monthData.income.some(t => !t.category);
  });

  // Add categorized income
  incomeCategories.forEach(category => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = category.name;
    let categoryTotal = 0;

    months.forEach((month, index) => {
      const monthData = processedData[month] || { income: [], expenses: [], all: [] };
      const amount = monthData.income
        .filter((t: Transaction) => t.category === category.id)
        .reduce((sum: number, t: Transaction) => sum + (t.creditAmount || 0), 0);
      
      const cell = row.getCell(index + 2);
      cell.value = amount;
      cell.numFmt = '"£"#,##0.00';
      if (amount !== 0) {
        cell.font = { color: { argb: '2E7D32' } }; // Green text for non-zero values
      }
      categoryTotal += amount;
      incomeTotals[index] += amount;
    });

    const totalCell = row.getCell(months.length + 2);
    totalCell.value = categoryTotal;
    totalCell.numFmt = '"£"#,##0.00';
    if (categoryTotal !== 0) {
      totalCell.font = { color: { argb: '2E7D32' } };
    }
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    incomeTotals[months.length] += categoryTotal;

    // Add subtle borders
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });

    currentRow++;
  });

  // Add uncategorized income row if exists
  if (hasUncategorizedIncome) {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = 'Uncategorized';
    row.getCell(1).font = { italic: true };
    let uncategorizedTotal = 0;

    months.forEach((month, index) => {
      const monthData = processedData[month] || { income: [], expenses: [], all: [] };
      const amount = monthData.income
        .filter((t: Transaction) => !t.category)
        .reduce((sum: number, t: Transaction) => sum + (t.creditAmount || 0), 0);
      
      const cell = row.getCell(index + 2);
      cell.value = amount;
      cell.numFmt = '"£"#,##0.00';
      if (amount !== 0) {
        cell.font = { color: { argb: '2E7D32' }, italic: true };
      } else {
        cell.font = { italic: true };
      }
      uncategorizedTotal += amount;
      incomeTotals[index] += amount;
    });

    const totalCell = row.getCell(months.length + 2);
    totalCell.value = uncategorizedTotal;
    totalCell.numFmt = '"£"#,##0.00';
    totalCell.font = { italic: true };
    if (uncategorizedTotal !== 0) {
      totalCell.font = { color: { argb: '2E7D32' }, italic: true };
    }
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    incomeTotals[months.length] += uncategorizedTotal;

    // Add subtle borders
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });

    currentRow++;
  }

  // Add income totals with grey background
  const incomeTotalRow = worksheet.getRow(currentRow);
  incomeTotalRow.getCell(1).value = 'Monthly Total';
  incomeTotalRow.getCell(1).font = { bold: true };
  incomeTotals.forEach((total, index) => {
    const cell = incomeTotalRow.getCell(index + 2);
    cell.value = total;
    cell.numFmt = '"£"#,##0.00';
    cell.font = { 
      bold: true,
      color: total !== 0 ? { argb: '2E7D32' } : undefined
    };
  });

  // Add grey background to total row (all cells)
  incomeTotalRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
  });

  currentRow += 2;

  // EXPENSES SECTION
  worksheet.mergeCells(`A${currentRow}:${worksheet.getColumn(worksheet.columnCount).letter}${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'MONTHLY EXPENSES';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell(`A${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  currentRow++;

  // Add headers for expenses
  const expenseHeaderRow = worksheet.getRow(currentRow);
  (worksheet.columns as Partial<ExcelJS.Column>[]).forEach((col, index) => {
    const cell = expenseHeaderRow.getCell(index + 1);
    cell.value = String(col.header || '');
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_GREEN }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };
  });
  currentRow++;

  // Process expense categories
  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');
  const expenseTotals = new Array(months.length + 1).fill(0);

  // Check for uncategorized expenses
  const hasUncategorizedExpenses = months.some(month => {
    const monthData = processedData[month] || { income: [], expenses: [], all: [] };
    return monthData.expenses.some(t => !t.category);
  });

  // Add categorized expenses
  expenseCategories.forEach(category => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = category.name;
    let categoryTotal = 0;

    months.forEach((month, index) => {
      const monthData = processedData[month] || { income: [], expenses: [], all: [] };
      const amount = monthData.expenses
        .filter((t: Transaction) => t.category === category.id)
        .reduce((sum: number, t: Transaction) => sum + (t.debitAmount || 0), 0);
      
      const cell = row.getCell(index + 2);
      cell.value = amount;
      cell.numFmt = '"£"#,##0.00';
      if (amount !== 0) {
        cell.font = { color: { argb: 'D32F2F' } }; // Red text for non-zero values
      }
      categoryTotal += amount;
      expenseTotals[index] += amount;
    });

    const totalCell = row.getCell(months.length + 2);
    totalCell.value = categoryTotal;
    totalCell.numFmt = '"£"#,##0.00';
    if (categoryTotal !== 0) {
      totalCell.font = { color: { argb: 'D32F2F' } };
    }
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    expenseTotals[months.length] += categoryTotal;

    // Add subtle borders
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });

    currentRow++;
  });

  // Add uncategorized expenses row if exists
  if (hasUncategorizedExpenses) {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = 'Uncategorized';
    row.getCell(1).font = { italic: true };
    let uncategorizedTotal = 0;

    months.forEach((month, index) => {
      const monthData = processedData[month] || { income: [], expenses: [], all: [] };
      const amount = monthData.expenses
        .filter((t: Transaction) => !t.category)
        .reduce((sum: number, t: Transaction) => sum + (t.debitAmount || 0), 0);
      
      const cell = row.getCell(index + 2);
      cell.value = amount;
      cell.numFmt = '"£"#,##0.00';
      if (amount !== 0) {
        cell.font = { color: { argb: 'D32F2F' }, italic: true };
      } else {
        cell.font = { italic: true };
      }
      uncategorizedTotal += amount;
      expenseTotals[index] += amount;
    });

    const totalCell = row.getCell(months.length + 2);
    totalCell.value = uncategorizedTotal;
    totalCell.numFmt = '"£"#,##0.00';
    totalCell.font = { italic: true };
    if (uncategorizedTotal !== 0) {
      totalCell.font = { color: { argb: 'D32F2F' }, italic: true };
    }
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    expenseTotals[months.length] += uncategorizedTotal;

    // Add subtle borders
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });

    currentRow++;
  }

  // Add expense totals with grey background
  const expenseTotalRow = worksheet.getRow(currentRow);
  expenseTotalRow.getCell(1).value = 'Monthly Total';
  expenseTotalRow.getCell(1).font = { bold: true };
  expenseTotals.forEach((total, index) => {
    const cell = expenseTotalRow.getCell(index + 2);
    cell.value = total;
    cell.numFmt = '"£"#,##0.00';
    cell.font = { 
      bold: true,
      color: total !== 0 ? { argb: 'D32F2F' } : undefined
    };
  });

  // Add grey background to total row (all cells)
  expenseTotalRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
  });

  currentRow += 2;

  // NET PROFIT/LOSS SECTION
  worksheet.mergeCells(`A${currentRow}:${worksheet.getColumn(worksheet.columnCount).letter}${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'MONTHLY PROFIT/LOSS';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell(`A${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  currentRow++;

  // Add headers for net
  const netHeaderRow = worksheet.getRow(currentRow);
  worksheet.columns.forEach((col, index) => {
    const cell = netHeaderRow.getCell(index + 1);
    cell.value = (col.header || '') as string;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_GREEN }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };
  });
  currentRow++;

  // Add net profit/loss row
  const netRow = worksheet.getRow(currentRow);
  netRow.getCell(1).value = 'Net Profit/Loss';
  netRow.getCell(1).font = { bold: true };

  let yearlyNet = 0;
  months.forEach((_, index) => {
    const net = incomeTotals[index] - expenseTotals[index];
    const cell = netRow.getCell(index + 2);
    cell.value = net;
    cell.numFmt = '"£"#,##0.00';
    if (net !== 0) {
      cell.font = { bold: true, color: { argb: net >= 0 ? '2E7D32' : 'D32F2F' } };
    }
    yearlyNet += net;
  });

  // Add yearly net total
  const yearlyNetCell = netRow.getCell(months.length + 2);
  yearlyNetCell.value = yearlyNet;
  yearlyNetCell.numFmt = '"£"#,##0.00';
  if (yearlyNet !== 0) {
    yearlyNetCell.font = { bold: true, color: { argb: yearlyNet >= 0 ? '2E7D32' : 'D32F2F' } };
  }
  yearlyNetCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F5F5F5' } // Light grey background for total column
  };

  // Add grey background to net row (all cells)
  netRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
  });
};

const createBudgetSummary = async (workbook: ExcelJS.Workbook, processedData: MonthlyTransactions) => {
  const worksheet = workbook.addWorksheet('Budget Summary');
  const categories = getCategories();
  const budgetedAmounts = getBudgetedAmounts() || {};

  // Set column widths
  worksheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Budgeted', key: 'budgeted', width: 15 },
    { header: 'Actual', key: 'actual', width: 15 },
    { header: 'Variance', key: 'variance', width: 15 }
  ] as Partial<ExcelJS.Column>[];

  // Add title
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'EUMHC';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: TABLE_HEADER_GREEN }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add subtitle
  worksheet.mergeCells('A2:D2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = 'Budget vs Actual Summary';
  subtitleCell.font = { size: 16, bold: true };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F0F0F0' }
  };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add spacing
  worksheet.getRow(3).height = 10;

  let currentRow = 4;
  let chartStartRow = 4;

  // Store category data for charts
  const incomeData: { category: string; budgeted: number; actual: number; variance: number }[] = [];
  const expenseData: { category: string; budgeted: number; actual: number; variance: number }[] = [];

  // Process income and expenses separately
  ['INCOME', 'EXPENSE'].forEach(type => {
    // Add section header
    const sectionCell = worksheet.getCell(`A${currentRow}`);
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sectionCell.value = `${type} CATEGORIES`;
    sectionCell.font = { bold: true, color: { argb: 'FFFFFF' } };
    sectionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TABLE_HEADER_GREEN }
    };
    currentRow++;

    // Add column headers
    const headerRow = worksheet.getRow(currentRow);
    worksheet.columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = String(col.header || '');
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LIGHT_GREEN }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });
    currentRow++;

    // Calculate actuals from transactions
    const categoryActuals = categories
      .filter(cat => cat.type === type)
      .map(category => {
        // Sum all transactions for this category
        const actual = Object.values(processedData).reduce((sum, monthData) => {
          return sum + monthData[type === 'INCOME' ? 'income' : 'expenses']
            .filter(t => t.category === category.id)
            .reduce((catSum, t) => catSum + (type === 'INCOME' ? (t.creditAmount || 0) : (t.debitAmount || 0)), 0);
        }, 0);

        const budgeted = budgetedAmounts[category.id] || 0;
        const variance = type === 'INCOME'
          ? actual - budgeted
          : budgeted - actual;

        // Store data for charts
        const data = { category: category.name, budgeted, actual, variance };
        if (type === 'INCOME') {
          incomeData.push(data);
        } else {
          expenseData.push(data);
        }

        return data;
      })
      .filter(summary => summary.budgeted !== 0 || summary.actual !== 0);

    // Add category rows
    categoryActuals.forEach(summary => {
      const row = worksheet.getRow(currentRow);
      
      row.getCell(1).value = summary.category;
      
      row.getCell(2).value = summary.budgeted;
      row.getCell(2).numFmt = '"£"#,##0.00';
      
      row.getCell(3).value = summary.actual;
      row.getCell(3).numFmt = '"£"#,##0.00';
      
      row.getCell(4).value = summary.variance;
      row.getCell(4).numFmt = '"£"#,##0.00';
      row.getCell(4).font = { color: { argb: summary.variance >= 0 ? '2E7D32' : 'D32F2F' } };

      // Add subtle borders
      row.eachCell(cell => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
        };
      });

      currentRow++;
    });

    // Add section total
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { bold: true };

    const sectionTotals = categoryActuals.reduce((acc, summary) => ({
      budgeted: acc.budgeted + summary.budgeted,
      actual: acc.actual + summary.actual,
      variance: acc.variance + summary.variance
    }), { budgeted: 0, actual: 0, variance: 0 });

    totalRow.getCell(2).value = sectionTotals.budgeted;
    totalRow.getCell(2).numFmt = '"£"#,##0.00';
    totalRow.getCell(2).font = { bold: true };

    totalRow.getCell(3).value = sectionTotals.actual;
    totalRow.getCell(3).numFmt = '"£"#,##0.00';
    totalRow.getCell(3).font = { bold: true };

    totalRow.getCell(4).value = sectionTotals.variance;
    totalRow.getCell(4).numFmt = '"£"#,##0.00';
    totalRow.getCell(4).font = { bold: true, color: { argb: sectionTotals.variance >= 0 ? '2E7D32' : 'D32F2F' } };

    // Add grey background and borders to total row
    totalRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }
      };
      cell.border = {
        top: { style: 'double', color: { argb: BORDER_COLOR } },
        bottom: { style: 'double', color: { argb: BORDER_COLOR } }
      };
    });

    // Add chart after each section
    if (categoryActuals.length > 0) {
      currentRow += 2;

      // Add chart title
      const chartTitleRow = worksheet.getRow(currentRow);
      chartTitleRow.getCell(1).value = `${type} - Budget vs Actual`;
      chartTitleRow.getCell(1).font = { bold: true, size: 12 };
      currentRow++;

      // Create chart
      const chart = workbook.addChart({
        type: 'column',
        style: 2,
      } as ExcelJS.ChartOptions) as ExcelJS.Chart;

      // Add the data series for budgeted amounts
      chart.addSeries({
        name: 'Budget',
        categories: categoryActuals.map(c => c.category),
        values: categoryActuals.map(c => c.budgeted),
        color: type === 'INCOME' ? '2E7D32' : 'D32F2F'
      });

      // Add the data series for actual amounts
      chart.addSeries({
        name: 'Actual',
        categories: categoryActuals.map(c => c.category),
        values: categoryActuals.map(c => c.actual),
        color: type === 'INCOME' ? '66BB6A' : 'EF5350'
      });

      // Configure chart
      chart.setTitle({
        name: `${type} Categories - Budget vs Actual`,
        color: '000000'
      });

      chart.setSize({
        width: 600,
        height: 300
      });

      chart.setPosition(`A${currentRow}`, 0);

      // Update current row to account for chart height
      currentRow += 18;
    }

    currentRow += 2; // Add spacing between sections
  });
};

const createMonthlySheets = async (workbook: ExcelJS.Workbook, processedData: MonthlyTransactions) => {
  for (const monthKey of Object.keys(processedData).sort().reverse()) {
    const monthData = processedData[monthKey];
    if (monthData) {
      await createMonthlySheet(workbook, monthKey, monthData.all, getCategories());
    }
  }
};

export const exportToSpreadsheet = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const transactions = getTransactions().sort((a, b) => {
      const dateA = a.transactionDate.split('/').reverse().join('-');
      const dateB = b.transactionDate.split('/').reverse().join('-');
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    if (!transactions.length) {
      toast({
        title: "No Data",
        description: "There are no transactions to export",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Simple month-by-month processing
    const monthlyData = new Map<string, {
      transactions: Transaction[],
      openingBalance: number,
      closingBalance: number
    }>();

    // First, group transactions by month
    transactions.forEach(transaction => {
      const [, month, year] = transaction.transactionDate.split('/');
      const monthKey = `${year}-${month}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          transactions: [],
          openingBalance: 0,
          closingBalance: 0
        });
      }
      
      monthlyData.get(monthKey)!.transactions.push(transaction);
    });

    // Sort months in academic year order (Aug-Jul)
    const sortedMonths = Array.from(monthlyData.keys()).sort((a, b) => {
      const [yearAStr = '', monthAStr = ''] = a.split('-');
      const [yearBStr = '', monthBStr = ''] = b.split('-');
      
      const yearA = parseInt(yearAStr) || 0;
      const yearB = parseInt(yearBStr) || 0;
      const monthA = parseInt(monthAStr) || 0;
      const monthB = parseInt(monthBStr) || 0;
      
      // Convert to academic year format (Aug = 1, Jul = 12)
      const academicMonthA = monthA >= 8 ? monthA - 7 : monthA + 5;
      const academicMonthB = monthB >= 8 ? monthB - 7 : monthB + 5;
      
      // Compare years first
      if (yearA !== yearB) return yearA - yearB;
      // Then compare academic months
      return academicMonthA - academicMonthB;
    });
    
    // Handle first month
    if (sortedMonths.length > 0) {
      const firstMonthKey = sortedMonths[0];
      if (firstMonthKey) {
        const firstMonth = monthlyData.get(firstMonthKey)!;
        const firstTransaction = firstMonth.transactions[0];
        
        if (firstTransaction) {
          // Set opening balance from first transaction
          firstMonth.openingBalance = firstTransaction.balance - (firstTransaction.creditAmount || 0) + (firstTransaction.debitAmount || 0);
          
          // Calculate net movement
          const netMovement = firstMonth.transactions.reduce((sum, t) => {
            return sum + (t.creditAmount || 0) - (t.debitAmount || 0);
          }, 0);
          
          // Calculate closing balance
          firstMonth.closingBalance = firstMonth.openingBalance + netMovement;
        }
      }
    }

    // Process remaining months
    for (let i = 1; i < sortedMonths.length; i++) {
      const currentMonthKey = sortedMonths[i];
      const previousMonthKey = sortedMonths[i - 1];
      
      if (currentMonthKey && previousMonthKey) {
        const currentMonth = monthlyData.get(currentMonthKey)!;
        const previousMonth = monthlyData.get(previousMonthKey)!;
        
        // Opening balance is previous month's closing balance
        currentMonth.openingBalance = previousMonth.closingBalance;
        
        // Calculate net movement
        const netMovement = currentMonth.transactions.reduce((sum, t) => {
          return sum + (t.creditAmount || 0) - (t.debitAmount || 0);
        }, 0);
        
        // Calculate closing balance
        currentMonth.closingBalance = currentMonth.openingBalance + netMovement;
      }
    }

    // Group transactions for spreadsheet creation
    const groupedTransactions = groupTransactionsByMonth(transactions);
    
    // Create sheets
    await createMonthlySheets(workbook, groupedTransactions);
    await createYearlySummary(workbook, groupedTransactions);
    await createBudgetSummary(workbook, groupedTransactions);

    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EUMHC_Financial_Report.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Spreadsheet exported successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

  } catch (error) {
    console.error('Export failed:', error);
    toast({
      title: "Export Failed",
      description: "Failed to generate the spreadsheet. Please try again.",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  }
}; 