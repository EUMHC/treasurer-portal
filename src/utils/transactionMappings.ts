import type { Transaction } from '../types/transaction';
import { parseDescription } from './parseDescription';

interface TransactionMapping {
  originalDescription: string;
  name: string;
  reference: string;
  category?: string;
}

const STORAGE_KEY = 'transactionMappings';

export const saveMapping = (
  originalDescription: string,
  name: string,
  reference: string,
  category?: string
) => {
  const mappings = getMappings();
  mappings[originalDescription] = { originalDescription, name, reference, category };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
};

export const getMappings = (): Record<string, TransactionMapping> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const clearMappings = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getMapping = (description: string): TransactionMapping | undefined => {
  const mappings = getMappings();
  return mappings[description];
};

export const applyStoredMappings = (transactions: Transaction[]): Transaction[] => {
  const mappings = getMappings();
  
  return transactions.map(transaction => {
    const mapping = mappings[transaction.transactionDescription];
    if (mapping) {
      // Get the original parsed parts
      const { name: originalName, reference: originalRef } = parseDescription({
        description: transaction.transactionDescription,
        type: transaction.transactionType
      });

      // Create new description by replacing the original name and reference with mapped values
      let newDescription = transaction.transactionDescription;
      
      // Replace the name
      if (originalName) {
        newDescription = newDescription.replace(originalName, mapping.name);
      }
      
      // Replace the reference
      if (originalRef && mapping.reference) {
        newDescription = newDescription.replace(originalRef, mapping.reference);
      } else if (!originalRef && mapping.reference) {
        // If there was no reference before, append it after the name
        newDescription = newDescription.replace(mapping.name, `${mapping.name} ${mapping.reference}`);
      }

      return {
        ...transaction,
        transactionDescription: newDescription,
        category: mapping.category || transaction.category
      };
    }
    return transaction;
  });
}; 