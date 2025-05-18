import { useCallback } from 'react';
import { Text, useToast, VStack, Icon, Center, HStack, Button } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import type { Transaction, Category, Budget } from '../types/transaction';
import { saveTransactions, saveCategories } from '../utils/storage';
import { FiUploadCloud, FiFile, FiDatabase } from 'react-icons/fi';

interface FileUploadProps {
  onUploadSuccess: (transactions: Transaction[]) => void;
}

interface CSVRow {
  'Transaction Date': string;
  'Transaction Type': string;
  'Sort Code': string;
  'Account Number': string;
  'Transaction Description': string;
  'Debit Amount': string;
  'Credit Amount': string;
  'Balance': string;
}

interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  version: string;
  budgets?: Budget[];
}

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const toast = useToast();

  const handleCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const transactions = (results.data as CSVRow[]).map((row) => ({
            transactionDate: row['Transaction Date'],
            transactionType: row['Transaction Type'],
            sortCode: row['Sort Code'],
            accountNumber: row['Account Number'],
            transactionDescription: row['Transaction Description'],
            debitAmount: row['Debit Amount'] ? parseFloat(row['Debit Amount']) : null,
            creditAmount: row['Credit Amount'] ? parseFloat(row['Credit Amount']) : null,
            balance: parseFloat(row['Balance']),
          }));

          saveTransactions(transactions);
          onUploadSuccess(transactions);

          toast({
            title: 'Upload successful',
            description: `Imported ${transactions.length} transactions from CSV`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
        } catch (err) {
          console.error(err);
          toast({
            title: 'Upload failed',
            description: 'Failed to parse CSV file. Please check the format.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      },
      error: (error) => {
        console.error(error);
        toast({
          title: 'Upload failed',
          description: 'Failed to read CSV file',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  const handleBackupFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      if (!data.version || !data.transactions || !data.categories) {
        throw new Error('Invalid backup file format');
      }

      // Update categories with budgeted values if they exist
      const categoriesWithBudgets = data.categories.map(category => ({
        ...category,
        budgetedValues: data.budgets?.filter(b => b.categoryId === category.id) || []
      }));

      // Save the data
      saveTransactions(data.transactions);
      saveCategories(categoriesWithBudgets);
      onUploadSuccess(data.transactions);

      toast({
        title: 'Backup restored',
        description: `Imported ${data.transactions.length} transactions, ${data.categories.length} categories, and ${data.budgets?.length || 0} budget entries`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Restore failed',
        description: 'Failed to restore from backup file. Please check the format.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      handleCSVFile(file);
    } else if (file.name.toLowerCase().endsWith('.json')) {
      handleBackupFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1
  });

  return (
    <VStack spacing={4} width="100%">
      <HStack spacing={4} width="100%">
        <Button
          flex={1}
          leftIcon={<Icon as={FiFile} />}
          variant="outline"
          color="white"
          borderColor="green.500"
          _hover={{ bg: 'green.700' }}
          height="auto"
          py={3}
          whiteSpace="normal"
          textAlign="left"
        >
          <VStack align="start" spacing={0}>
            <Text>CSV Import</Text>
            <Text fontSize="xs" color="green.200">Import new transactions from bank statement</Text>
          </VStack>
        </Button>
        <Button
          flex={1}
          leftIcon={<Icon as={FiDatabase} />}
          variant="outline"
          color="white"
          borderColor="green.500"
          _hover={{ bg: 'green.700' }}
          height="auto"
          py={3}
          whiteSpace="normal"
          textAlign="left"
        >
          <VStack align="start" spacing={0}>
            <Text>Backup Restore</Text>
            <Text fontSize="xs" color="green.200">Restore from a previous backup file</Text>
          </VStack>
        </Button>
      </HStack>

      <Center
        {...getRootProps()}
        p={6}
        border="2px dashed"
        borderColor={isDragActive ? "green.500" : "green.600"}
        borderRadius="md"
        bg={isDragActive ? "green.600" : "green.900"}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: "green.500",
          bg: "green.600"
        }}
        width="100%"
      >
        <input {...getInputProps()} />
        <VStack spacing={2}>
          <Icon 
            as={FiUploadCloud} 
            w={8} 
            h={8} 
            color={isDragActive ? "white" : "green.100"} 
          />
          <Text 
            color="white"
            fontWeight="medium"
            textAlign="center"
          >
            {isDragActive 
              ? "Drop the file here" 
              : "Drag & drop a file here, or click to select"
            }
          </Text>
          <Text fontSize="sm" color="green.200" textAlign="center">
            Accepts .csv (bank statement) or .json (backup) files
          </Text>
        </VStack>
      </Center>
    </VStack>
  );
}; 