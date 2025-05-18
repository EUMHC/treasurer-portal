export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Budget {
  categoryId: string;
  amount: number;
  year: number;
  month: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  budgetedValues?: Budget[];
}

export interface Transaction {
  transactionDate: string;
  transactionType: string;
  sortCode: string;
  accountNumber: string;
  transactionDescription: string;
  debitAmount: number | null;
  creditAmount: number | null;
  balance: number;
  category?: string;
}

export type TransactionCategory = {
  id: string;
  name: string;
  color: string;
}; 