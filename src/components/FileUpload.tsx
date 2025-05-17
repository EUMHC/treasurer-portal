import { useCallback } from 'react';
import { Text, useToast, VStack, Icon, Center } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import type { Transaction } from '../types/transaction';
import { saveTransactions } from '../utils/storage';
import { FiUploadCloud } from 'react-icons/fi';

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

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const toast = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

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
            description: `Imported ${transactions.length} transactions`,
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
  }, [onUploadSuccess, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  return (
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
        >
          {isDragActive ? "Drop the CSV file here" : "Drag & drop a CSV file here, or click to select"}
        </Text>
        <Text fontSize="sm" color="green.200">
          Only .csv files are accepted
        </Text>
      </VStack>
    </Center>
  );
}; 