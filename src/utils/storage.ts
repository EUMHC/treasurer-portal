import type { Transaction, Category } from '../types/transaction';
import { getAllDefaultCategories } from './categories';

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
  return stored ? JSON.parse(stored) : getAllDefaultCategories();
};

export const saveStartingBalance = (balance: number): void => {
  localStorage.setItem(STORAGE_KEYS.STARTING_BALANCE, balance.toString());
};

export const getStartingBalance = (): number => {
  const stored = localStorage.getItem(STORAGE_KEYS.STARTING_BALANCE);
  return stored ? parseFloat(stored) : 0;
};

// Budget storage functions
export const getBudgetedAmounts = (): { [key: string]: number } => {
  const stored = localStorage.getItem('budgetedAmounts');
  return stored ? JSON.parse(stored) : {};
};

export const saveBudgetedAmounts = (budgetedAmounts: { [key: string]: number }): void => {
  localStorage.setItem('budgetedAmounts', JSON.stringify(budgetedAmounts));
}; 