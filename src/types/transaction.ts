export type CategoryType = 'INCOME' | 'EXPENSE';

export type Category = {
  id: string;
  name: string;
  color: string;
  type: CategoryType;
};

export type Transaction = {
  transactionDate: string;
  transactionDescription: string;
  debitAmount: number | null;
  creditAmount: number | null;
  balance: number;
  category?: string;  // References Category.id
};

export type TransactionCategory = {
  id: string;
  name: string;
  color: string;
}; 