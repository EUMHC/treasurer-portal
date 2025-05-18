import { getTransactions, getCategories, getBudgetedAmounts } from './storage';

export type ExportHandler = {
  openExportModal: () => void;
  handleExport: (format: 'spreadsheet' | 'backup') => void;
};

let exportModalCallback: (() => void) | null = null;
let spreadsheetExportCallback: (() => void) | null = null;

export const initializeExportHandlers = (
  openModalFn: () => void,
  spreadsheetExportFn: () => void
) => {
  exportModalCallback = openModalFn;
  spreadsheetExportCallback = spreadsheetExportFn;

  // Set up the global handlers
  window.exportHandler = {
    openExportModal: () => exportModalCallback?.(),
    handleExport: (format) => {
      if (format === 'spreadsheet') {
        spreadsheetExportCallback?.();
      } else {
        handleBackupExport();
      }
    }
  };
};

export const cleanupExportHandlers = () => {
  exportModalCallback = null;
  spreadsheetExportCallback = null;
  delete window.exportHandler;
};

const handleBackupExport = () => {
  // Create backup format
  const budgetedAmts = getBudgetedAmounts();
  const allBudgets = Object.entries(budgetedAmts).map(([categoryId, amount]) => ({
    categoryId,
    amount,
    date: new Date().toISOString().split('T')[0] // Current date as YYYY-MM-DD
  }));

  const backup = {
    transactions: getTransactions(),
    categories: getCategories(),
    budgets: allBudgets,
    budgetedAmounts: budgetedAmts,
    version: '1.0'
  };
  
  // Create and download the file
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `treasurer-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Add window interface
declare global {
  interface Window {
    exportHandler?: ExportHandler;
    exportToSpreadsheet?: () => void;
  }
} 