import type { Transaction, Category } from '../types/transaction';

const STORAGE_KEYS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  STARTING_BALANCE: 'startingBalance',
};

export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const getTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return stored ? JSON.parse(stored) : [];
};

export const saveCategories = (categories: Category[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getCategories = (): Category[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return stored ? JSON.parse(stored) : getDefaultCategories();
};

export const saveStartingBalance = (balance: number) => {
  localStorage.setItem(STORAGE_KEYS.STARTING_BALANCE, balance.toString());
};

export const getStartingBalance = (): number => {
  const stored = localStorage.getItem(STORAGE_KEYS.STARTING_BALANCE);
  return stored ? parseFloat(stored) : 0;
};

export const getDefaultCategories = (): Category[] => {
  return [
    { id: 'membership', name: 'Membership', color: '#2ECC71', type: 'INCOME' },
    { id: 'sponsorship', name: 'Sponsorship', color: '#3498DB', type: 'INCOME' },
    { id: 'equipment', name: 'Equipment', color: '#E74C3C', type: 'EXPENSE' },
    { id: 'travel', name: 'Travel', color: '#F39C12', type: 'EXPENSE' },
    { id: 'venue', name: 'Venue Hire', color: '#9B59B6', type: 'EXPENSE' },
    { id: 'social', name: 'Social Events', color: '#1ABC9C', type: 'EXPENSE' },
    { id: 'other', name: 'Other', color: '#95A5A6', type: 'EXPENSE' },
  ];
};

// Budget storage functions
export const getBudgetedAmounts = (): { [key: string]: number } => {
  const stored = localStorage.getItem('budgetedAmounts');
  return stored ? JSON.parse(stored) : {};
};

export const saveBudgetedAmounts = (budgetedAmounts: { [key: string]: number }): void => {
  localStorage.setItem('budgetedAmounts', JSON.stringify(budgetedAmounts));
}; 