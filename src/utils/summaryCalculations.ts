import type { Category } from '../types/transaction';
import { getTransactions, getCategories } from './storage';

interface MonthlyTotals {
  income: { [categoryId: string]: number };
  expenses: { [categoryId: string]: number };
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  activeCategories: {
    income: Set<string>;
    expenses: Set<string>;
  };
}

interface YearlySummary {
  [monthKey: string]: MonthlyTotals;
  yearTotals: {
    income: { [categoryId: string]: number };
    expenses: { [categoryId: string]: number };
    totalIncome: number;
    totalExpenses: number;
    netChange: number;
    activeCategories: {
      income: Set<string>;
      expenses: Set<string>;
    };
  };
}

// Helper to get academic year range
export const getAcademicYearRange = (academicYear: number) => {
  const startDate = new Date(academicYear, 7, 1); // August 1st
  const endDate = new Date(academicYear + 1, 7, 31); // July 31st next year
  return { startDate, endDate };
};

// Helper to format academic year
export const formatAcademicYear = (year: number): string => {
  return `${year}/${(year + 1).toString().slice(-2)}`;
};

// Helper to check if a date is within academic year
const isInAcademicYear = (date: Date, academicYear: number): boolean => {
  const { startDate, endDate } = getAcademicYearRange(academicYear);
  return date >= startDate && date <= endDate;
};

// Helper to get month key in academic year format
const getMonthKeyForAcademicYear = (date: Date, academicYear: number): string => {
  const year = date.getMonth() >= 7 ? academicYear : academicYear + 1;
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const calculateYearlySummary = (academicYear: number): YearlySummary => {
  const transactions = getTransactions();
  const categories = getCategories() as Category[];
  
  // Initialize the summary object with all months
  const summary: YearlySummary = {
    yearTotals: {
      income: {},
      expenses: {},
      totalIncome: 0,
      totalExpenses: 0,
      netChange: 0,
      activeCategories: {
        income: new Set<string>(),
        expenses: new Set<string>()
      }
    }
  };
  
  // Initialize category totals for year
  categories.forEach(category => {
    if (category.id) {
      summary.yearTotals.income[category.id] = 0;
      summary.yearTotals.expenses[category.id] = 0;
    }
  });

  // Initialize all months (Aug to Jul)
  for (let month = 7; month < 19; month++) {
    const actualMonth = ((month % 12) + 1);
    const year = month < 12 ? academicYear : academicYear + 1;
    const monthKey = `${year}-${String(actualMonth).padStart(2, '0')}`;
    
    summary[monthKey] = {
      income: {},
      expenses: {},
      totalIncome: 0,
      totalExpenses: 0,
      netChange: 0,
      activeCategories: {
        income: new Set<string>(),
        expenses: new Set<string>()
      }
    };
    
    // Initialize category totals for each month
    categories.forEach(category => {
      if (category.id) {
        summary[monthKey]!.income[category.id] = 0;
        summary[monthKey]!.expenses[category.id] = 0;
      }
    });
  }

  // Process transactions
  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate.split('/').reverse().join('-'));
    if (!isInAcademicYear(date, academicYear)) return;

    const monthKey = getMonthKeyForAcademicYear(date, academicYear);
    const categoryId = transaction.category || 'unassigned';

    if (transaction.creditAmount && summary[monthKey]) {
      // Income
      const currentIncome = summary[monthKey].income[categoryId] || 0;
      summary[monthKey].income[categoryId] = currentIncome + transaction.creditAmount;
      summary[monthKey].totalIncome += transaction.creditAmount;
      summary[monthKey].activeCategories.income.add(categoryId);
      
      const yearlyIncome = summary.yearTotals.income[categoryId] || 0;
      summary.yearTotals.income[categoryId] = yearlyIncome + transaction.creditAmount;
      summary.yearTotals.totalIncome += transaction.creditAmount;
      summary.yearTotals.activeCategories.income.add(categoryId);
    }

    if (transaction.debitAmount && summary[monthKey]) {
      // Expenses
      const currentExpense = summary[monthKey].expenses[categoryId] || 0;
      summary[monthKey].expenses[categoryId] = currentExpense + transaction.debitAmount;
      summary[monthKey].totalExpenses += transaction.debitAmount;
      summary[monthKey].activeCategories.expenses.add(categoryId);
      
      const yearlyExpense = summary.yearTotals.expenses[categoryId] || 0;
      summary.yearTotals.expenses[categoryId] = yearlyExpense + transaction.debitAmount;
      summary.yearTotals.totalExpenses += transaction.debitAmount;
      summary.yearTotals.activeCategories.expenses.add(categoryId);
    }
  });

  // Calculate net changes
  Object.keys(summary).forEach(key => {
    if (key === 'yearTotals') {
      summary.yearTotals.netChange = summary.yearTotals.totalIncome - summary.yearTotals.totalExpenses;
    } else if (summary[key]) {
      summary[key].netChange = summary[key].totalIncome - summary[key].totalExpenses;
    }
  });

  return summary;
};

export const formatCurrency = (amount: number): string => {
  if (amount === 0) return '';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
};

export const getMonthName = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return '';
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-GB', { 
    month: 'long'
  });
};

export const getAvailableAcademicYears = (): number[] => {
  const transactions = getTransactions();
  const years = new Set<number>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate.split('/').reverse().join('-'));
    const academicYear = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
    years.add(academicYear);
  });
  
  return Array.from(years).sort((a, b) => b - a); // Sort descending
}; 