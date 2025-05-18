import { 
  Box, 
  Heading, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Select, 
  Text, 
  Accordion, 
  AccordionItem, 
  AccordionButton, 
  AccordionPanel, 
  AccordionIcon, 
  HStack,
  VStack,
  Container,
  Flex,
  Button,
  useToast,
  Progress,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Input,
  IconButton,
  Editable,
  EditableInput,
  EditablePreview,
  Tooltip,
  Radio,
  RadioGroup,
  ModalFooter
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Transaction, Category, CategoryType } from '../types/transaction';
import { getTransactions, getCategories, saveTransactions, saveCategories, getBudgetedAmounts } from '../utils/storage';
import { Navigation } from '../components/Navigation';
import { FiZap, FiSettings, FiTrash2, FiAlertCircle, FiFileText, FiDownload } from 'react-icons/fi';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { ensureDefaultCategories } from '../utils/categories';
import { parseDescription } from '../utils/parseDescription';
import { saveMapping, applyStoredMappings } from '../utils/transactionMappings';

type GroupedTransactions = {
  [key: string]: Transaction[];
};

const parseUKDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
  if (!day || !month || !year) return new Date(NaN);
  return new Date(year, month - 1, day);
};

// Add window interface
declare global {
  interface Window {
    exportHandler?: ExportHandler;
    exportToSpreadsheet?: () => void;
  }
}

// Add type for the export function
export type ExportHandler = {
  openExportModal: () => void;
  handleExport: (format: 'spreadsheet' | 'backup') => void;
};

// Memoized Transaction Row Component
const TransactionRow = memo(({ 
  transaction, 
  index, 
  monthKey, 
  categories,
  onCategoryChange,
  onNameChange,
  onReferenceChange
}: {
  transaction: Transaction;
  index: number;
  monthKey: string;
  categories: Category[];
  onCategoryChange: (monthKey: string, index: number, categoryId: string) => void;
  onNameChange: (monthKey: string, index: number, newName: string) => void;
  onReferenceChange: (monthKey: string, index: number, newReference: string) => void;
}) => {
  const { name, reference } = useMemo(() => parseDescription({ 
    description: transaction.transactionDescription, 
    type: transaction.transactionType 
  }), [transaction.transactionDescription, transaction.transactionType]);

  const formatAmount = useCallback((amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }, []);

  const relevantCategories = useMemo(() => 
    categories.filter(category => 
      transaction.creditAmount 
        ? category.type === 'INCOME'
        : category.type === 'EXPENSE'
    ),
    [categories, transaction.creditAmount]
  );

  return (
    <Tr 
      _hover={{ bg: 'green.50' }}
      transition="all 0.2s"
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg={!transaction.category ? 'orange.50' : undefined}
    >
      <Td py={3.5} color="gray.700" fontWeight="medium">
        {new Date(transaction.transactionDate.split('/').reverse().join('-')).toLocaleDateString('en-GB')}
      </Td>
      <Td py={3.5}>
        <Tooltip label="Click to edit name">
          <Box maxW="200px">
            <Editable
              defaultValue={name}
              onSubmit={(newName) => onNameChange(monthKey, index, newName)}
              color="gray.700"
            >
              <EditablePreview 
                _hover={{ bg: 'gray.100' }} 
                px={2} 
                w="100%"
                isTruncated
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              />
              <EditableInput px={2} />
            </Editable>
          </Box>
        </Tooltip>
      </Td>
      <Td py={3.5}>
        <Tooltip label="Click to edit reference">
          <Box maxW="200px">
            <Editable
              defaultValue={reference}
              onSubmit={(newRef) => onReferenceChange(monthKey, index, newRef)}
              color="gray.500"
            >
              <EditablePreview 
                _hover={{ bg: 'gray.100' }} 
                px={2} 
                w="100%"
                isTruncated
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              />
              <EditableInput px={2} />
            </Editable>
          </Box>
        </Tooltip>
      </Td>
      <Td py={3.5} isNumeric color={transaction.debitAmount ? "red.600" : "gray.400"} fontWeight={transaction.debitAmount ? "semibold" : "normal"}>
        {formatAmount(transaction.debitAmount)}
      </Td>
      <Td py={3.5} isNumeric color={transaction.creditAmount ? "green.600" : "gray.400"} fontWeight={transaction.creditAmount ? "semibold" : "normal"}>
        {formatAmount(transaction.creditAmount)}
      </Td>
      <Td py={3.5} isNumeric color="gray.900" fontWeight="semibold">{formatAmount(transaction.balance)}</Td>
      <Td py={3}>
        <Box position="relative" pt={5}>
          {!transaction.category && (
            <HStack 
              position="absolute" 
              top="0" 
              left="0" 
              color="orange.600" 
              fontSize="xs" 
              fontWeight="medium"
              spacing={1}
              mb={1}
            >
              <Icon as={FiAlertCircle} />
              <Text>Select a category</Text>
            </HStack>
          )}
          <Select
            size="sm"
            value={transaction.category || ''}
            onChange={(e) => onCategoryChange(monthKey, index, e.target.value)}
            placeholder="Select category"
            bg="white"
            borderColor={!transaction.category ? "orange.300" : "gray.200"}
            _hover={{ borderColor: !transaction.category ? "orange.400" : "green.400" }}
            _focus={{ 
              borderColor: !transaction.category ? "orange.500" : "green.500",
              boxShadow: `0 0 0 1px ${!transaction.category ? 'var(--chakra-colors-orange-500)' : 'var(--chakra-colors-green-500)'}` 
            }}
            width="100%"
          >
            {relevantCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Box>
      </Td>
    </Tr>
  );
});

// Memoized Month Section Component
const MonthSection = memo(({ 
  monthKey, 
  transactions,
  categories,
  onCategoryChange,
  onNameChange,
  onReferenceChange
}: {
  monthKey: string;
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (monthKey: string, index: number, categoryId: string) => void;
  onNameChange: (monthKey: string, index: number, newName: string) => void;
  onReferenceChange: (monthKey: string, index: number, newReference: string) => void;
}) => {
  const totalIncome = useMemo(() => 
    transactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0),
    [transactions]
  );

  const totalExpenses = useMemo(() => 
    transactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0),
    [transactions]
  );

  const formatAmount = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }, []);

  const monthYear = useMemo(() => {
    const [year, month] = monthKey.split('-').map(str => parseInt(str));
    if (!year || !month) return '';
    return new Date(year, month - 1).toLocaleString('en-GB', { 
      month: 'long',
      year: 'numeric'
    });
  }, [monthKey]);

  return (
    <AccordionItem border="none" mb={4}>
      <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
        <AccordionButton bg="green.800" _hover={{ bg: 'green.700' }} py={4}>
          <Box flex="1" textAlign="left">
            <Text fontSize="lg" fontWeight="semibold" color="white">
              {monthYear}
            </Text>
          </Box>
          <HStack spacing={8} mr={4}>
            <HStack spacing={2}>
              <Icon as={FiArrowUp} color="green.200" />
              <Text color="green.200" fontSize="sm">
                Income: {formatAmount(totalIncome)}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Icon as={FiArrowDown} color="red.200" />
              <Text color="red.200" fontSize="sm">
                Expenses: {formatAmount(totalExpenses)}
              </Text>
            </HStack>
          </HStack>
          <AccordionIcon color="white" />
        </AccordionButton>

        <AccordionPanel p={0}>
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th bg="green.50" py={4} color="gray.700" width="10%" borderBottom="2px" borderColor="green.800" fontSize="sm">Date</Th>
                  <Th bg="green.50" py={4} color="gray.700" width="18%" borderBottom="2px" borderColor="green.800" fontSize="sm">Name</Th>
                  <Th bg="green.50" py={4} color="gray.700" width="18%" borderBottom="2px" borderColor="green.800" fontSize="sm">Reference</Th>
                  <Th bg="green.50" py={4} color="gray.700" isNumeric width="10%" borderBottom="2px" borderColor="green.800" fontSize="sm">Debit</Th>
                  <Th bg="green.50" py={4} color="gray.700" isNumeric width="10%" borderBottom="2px" borderColor="green.800" fontSize="sm">Credit</Th>
                  <Th bg="green.50" py={4} color="gray.700" isNumeric width="10%" borderBottom="2px" borderColor="green.800" fontSize="sm">Balance</Th>
                  <Th bg="green.50" py={4} color="gray.700" width="24%" borderBottom="2px" borderColor="green.800" fontSize="sm">Category</Th>
                </Tr>
              </Thead>
              <Tbody>
                {transactions.map((transaction, index) => (
                  <TransactionRow
                    key={`${transaction.transactionDate}-${index}`}
                    transaction={transaction}
                    index={index}
                    monthKey={monthKey}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    onNameChange={onNameChange}
                    onReferenceChange={onReferenceChange}
                  />
                ))}
              </Tbody>
            </Table>
          </Box>
        </AccordionPanel>
      </Box>
    </AccordionItem>
  );
});

export const Transactions = () => {
  const navigate = useNavigate();
  const [, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions>({});
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('EXPENSE');
  const { 
    isOpen: isCategoryModalOpen, 
    onOpen: onCategoryModalOpen, 
    onClose: onCategoryModalClose 
  } = useDisclosure();
  
  const {
    isOpen: isExportModalOpen,
    onOpen: onExportModalOpen,
    onClose: onExportModalClose
  } = useDisclosure();

  const [exportFormat, setExportFormat] = useState<'spreadsheet' | 'backup'>('spreadsheet');
  const toast = useToast();

  // Calculate categorization statistics
  const categorizationStats = useMemo(() => {
    let total = 0;
    let categorized = 0;

    Object.values(groupedTransactions).forEach(transactions => {
      if (transactions) {
        transactions.forEach(transaction => {
          total++;
          if (transaction.category) categorized++;
        });
      }
    });

    return {
      total,
      categorized,
      remaining: total - categorized,
      percentage: total > 0 ? (categorized / total) * 100 : 0
    };
  }, [groupedTransactions]);

  const loadData = useCallback(() => {
    const loadedTransactions = getTransactions();
    const loadedCategories = getCategories();
    
    // Apply any stored mappings to the transactions
    const mappedTransactions = applyStoredMappings(loadedTransactions);
    setTransactions(mappedTransactions);
    
    // Ensure default categories are present
    const categoriesWithDefaults = ensureDefaultCategories(loadedCategories as Category[]);
    setCategories(categoriesWithDefaults);
    saveCategories(categoriesWithDefaults);

    // Group transactions by month and year
    const grouped = mappedTransactions.reduce((acc: GroupedTransactions, transaction) => {
      const date = parseUKDate(transaction.transactionDate);
      if (isNaN(date.getTime())) return acc;
      
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[key] = acc[key] || [];
      acc[key].push(transaction);
      return acc;
    }, {} as GroupedTransactions);

    // Sort transactions within each group by date
    Object.keys(grouped).forEach(key => {
      if (grouped[key]) {
        grouped[key].sort((a, b) => 
          parseUKDate(b.transactionDate).getTime() - parseUKDate(a.transactionDate).getTime()
        );
      }
    });

    // Sort the groups by date (most recent first)
    const sortedGrouped = Object.keys(grouped)
      .sort()
      .reverse()
      .reduce((acc: GroupedTransactions, key) => {
        if (grouped[key]) {
          acc[key] = grouped[key];
        } else {
          acc[key] = [];
        }
        return acc;
      }, {} as GroupedTransactions);

    setGroupedTransactions(sortedGrouped);
  }, []);

  useEffect(() => {
    const loadedTransactions = getTransactions();
    if (!loadedTransactions || loadedTransactions.length === 0) {
      navigate('/treasurer-portal');
      return;
    }
    loadData();
  }, [loadData, navigate]);

  // Expose the export functionality to the window object
  useEffect(() => {
    const exportHandler: ExportHandler = {
      openExportModal: onExportModalOpen,
      handleExport: (format) => {
        setExportFormat(format);
        if (format === 'spreadsheet') {
          window.exportToSpreadsheet?.();
        } else {
          // Create backup format
          const budgetedAmts = getBudgetedAmounts();
          const allBudgets = Object.entries(budgetedAmts).map(([categoryId, amount]) => ({
            categoryId,
            amount,
            date: new Date().toISOString().split('T')[0] // Current date as YYYY-MM-DD
          }));

          const backup = {
            transactions: Object.values(groupedTransactions).flat(),
            categories: categories,
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
        }
      }
    };

    window.exportHandler = exportHandler;
    return () => {
      delete window.exportHandler;
    };
  }, [groupedTransactions, categories, onExportModalOpen]);

  const handleCategoryChange = (monthKey: string, transactionIndex: number, categoryId: string) => {
    const updatedGrouped = { ...groupedTransactions };
    const monthTransactions = [...(updatedGrouped[monthKey] || [])];
    
    if (monthTransactions[transactionIndex]) {
      const transaction = monthTransactions[transactionIndex];
      const { name, reference } = parseDescription({ 
        description: transaction.transactionDescription, 
        type: transaction.transactionType 
      });

      // Save the mapping
      saveMapping(
        transaction.transactionDescription,
        name,
        reference,
        categoryId
      );

      monthTransactions[transactionIndex] = {
        ...transaction,
        category: categoryId
      };
      updatedGrouped[monthKey] = monthTransactions;
      
      setGroupedTransactions(updatedGrouped);
      const allTransactions = Object.values(updatedGrouped).flat();
      setTransactions(allTransactions);
      saveTransactions(allTransactions);
    }
  };

  const autoCategorizeTransactions = async () => {
    setIsAutoCategorizing(true);
    try {
      const updatedGrouped = { ...groupedTransactions };
      let hasChanges = false;
      const patternMappings: { [key: string]: string } = {};

      // First pass: build pattern mappings from existing categorized transactions
      for (const monthTransactions of Object.values(updatedGrouped)) {
        if (!monthTransactions) continue;
        
        for (const transaction of monthTransactions) {
          if (!transaction || !transaction.category) continue;

          const { reference } = parseDescription({ 
            description: transaction.transactionDescription, 
            type: transaction.transactionType 
          });

          // Store reference-based patterns
          if (reference) {
            const refLower = reference.toLowerCase();
            if (!patternMappings[refLower]) {
              patternMappings[refLower] = transaction.category;
            }
          }
        }
      }

      // Second pass: apply categorization
      for (const monthKey of Object.keys(updatedGrouped)) {
        const monthTransactions = updatedGrouped[monthKey];
        if (!monthTransactions) continue;
        
        for (let i = 0; i < monthTransactions.length; i++) {
          const transaction = monthTransactions[i];
          if (!transaction || transaction.category) continue;

          const { reference } = parseDescription({ 
            description: transaction.transactionDescription, 
            type: transaction.transactionType 
          });

          let matchedCategory = null;

          // 1. Try to match based on reference patterns
          if (reference) {
            const refLower = reference.toLowerCase();
            matchedCategory = patternMappings[refLower];
          }

          // 2. If no match, try category-specific rules
          if (!matchedCategory) {
            const description = transaction.transactionDescription.toLowerCase();
            
            // Filter categories based on transaction type
            const relevantCategories = categories.filter(category => 
              transaction.creditAmount 
                ? category.type === 'INCOME'
                : category.type === 'EXPENSE'
            );

            // Special case rules
            if (description.includes('umpire') || description.includes('referee')) {
              const matchCostsCategory = relevantCategories.find(c => c.name.toLowerCase().includes('match'));
              if (matchCostsCategory) {
                matchedCategory = matchCostsCategory.id;
              }
            }
            // Add more special case rules here as needed

            // 3. Fallback to keyword matching
            if (!matchedCategory) {
              for (const category of relevantCategories) {
                const keywords = category.name.toLowerCase().split(' ');
                if (keywords.some(keyword => 
                  description.includes(keyword) && keyword.length > 3  // Only match keywords longer than 3 chars
                )) {
                  matchedCategory = category.id;
                  break;
                }
              }
            }
          }

          if (matchedCategory) {
            monthTransactions[i] = {
              ...transaction,
              category: matchedCategory
            };
            
            // Save the mapping for future use
            const { name, reference } = parseDescription({ 
              description: transaction.transactionDescription, 
              type: transaction.transactionType 
            });
            saveMapping(
              transaction.transactionDescription,
              name,
              reference,
              matchedCategory
            );
            
            hasChanges = true;
          }
        }
        updatedGrouped[monthKey] = monthTransactions;
      }

      if (hasChanges) {
        setGroupedTransactions(updatedGrouped);
        const allTransactions = Object.values(updatedGrouped)
          .filter((transactions): transactions is Transaction[] => transactions !== undefined)
          .flat();
        setTransactions(allTransactions);
        saveTransactions(allTransactions);
        toast({
          title: "Auto-categorization complete",
          description: "Transactions have been automatically categorized based on patterns and existing mappings",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "No changes made",
          description: "No new categories could be automatically assigned",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: unknown) {
      console.error('Auto-categorization failed:', err);
      toast({
        title: "Error",
        description: "Failed to auto-categorize transactions",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  const handleSaveCategory = useCallback(() => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        status: "error",
        duration: 3000,
      });
      return;
    }

    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: newCategoryName,
      type: newCategoryType,
      color: newCategoryType === 'INCOME' ? '#38A169' : '#E53E3E'
    };
    
    setCategories(prevCategories => {
      const updatedCategories = [...prevCategories, newCategory];
      saveCategories(updatedCategories);
      return updatedCategories;
    });
    
    setNewCategoryName('');
    toast({
      title: "Success",
      description: "Category added successfully",
      status: "success",
      duration: 3000,
    });
  }, [newCategoryName, newCategoryType, toast]);

  const handleDeleteCategory = useCallback((categoryId: string) => {
    setCategories(prevCategories => {
      const updatedCategories = prevCategories.filter(c => c.id !== categoryId);
      saveCategories(updatedCategories);
      return updatedCategories;
    });
    
    toast({
      title: "Success",
      description: "Category deleted successfully",
      status: "success",
      duration: 3000,
    });
  }, [toast]);

  const handleNameChange = (monthKey: string, transactionIndex: number, newName: string) => {
    const updatedGrouped = { ...groupedTransactions };
    const monthTransactions = [...(updatedGrouped[monthKey] || [])];
    
    if (monthTransactions[transactionIndex]) {
      const transaction = monthTransactions[transactionIndex];
      const { reference } = parseDescription({ 
        description: transaction.transactionDescription, 
        type: transaction.transactionType 
      });

      // Save the mapping
      saveMapping(
        transaction.transactionDescription,
        newName,
        reference,
        transaction.category
      );

      monthTransactions[transactionIndex] = {
        ...transaction,
        transactionDescription: transaction.transactionDescription.replace(
          parseDescription({ 
            description: transaction.transactionDescription, 
            type: transaction.transactionType 
          }).name,
          newName
        )
      };
      updatedGrouped[monthKey] = monthTransactions;
      
      setGroupedTransactions(updatedGrouped);
      const allTransactions = Object.values(updatedGrouped).flat();
      setTransactions(allTransactions);
      saveTransactions(allTransactions);
    }
  };

  const handleReferenceChange = (monthKey: string, transactionIndex: number, newReference: string) => {
    const updatedGrouped = { ...groupedTransactions };
    const monthTransactions = [...(updatedGrouped[monthKey] || [])];
    
    if (monthTransactions[transactionIndex]) {
      const transaction = monthTransactions[transactionIndex];
      const parsed = parseDescription({ 
        description: transaction.transactionDescription, 
        type: transaction.transactionType 
      });
      
      // Save the mapping
      saveMapping(
        transaction.transactionDescription,
        parsed.name,
        newReference,
        transaction.category
      );

      let newDescription = transaction.transactionDescription;
      if (parsed.reference) {
        newDescription = newDescription.replace(parsed.reference, newReference);
      } else {
        newDescription = `${parsed.name} ${newReference}${newDescription.substring(parsed.name.length)}`;
      }

      monthTransactions[transactionIndex] = {
        ...transaction,
        transactionDescription: newDescription
      };
      updatedGrouped[monthKey] = monthTransactions;
      
      setGroupedTransactions(updatedGrouped);
      const allTransactions = Object.values(updatedGrouped).flat();
      setTransactions(allTransactions);
      saveTransactions(allTransactions);
    }
  };

  return (
    <>
      <Navigation />
      <Box bg="grey.100" py={2} width="100%">
        <Container maxW="container.xl" px={4}>
          <VStack align="stretch" width="100%" spacing={4}>
            <Box 
              bg="green.900" 
              borderRadius="lg" 
              shadow="md" 
              p={6}
              position="relative"
              top={4}
              mb={8}
              width="100%"
            >
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Heading size="lg" color="white">Transactions</Heading>
                  <Text color="green.100" fontSize="sm">
                    Manage and categorize your transactions
                  </Text>
                </VStack>
                <HStack>
                  <Button
                    leftIcon={<Icon as={FiZap} />}
                    colorScheme="green"
                    variant="outline"
                    color="white"
                    borderColor="green.100"
                    _hover={{ bg: 'green.800' }}
                    onClick={autoCategorizeTransactions}
                    isLoading={isAutoCategorizing}
                  >
                    Auto-Categorize
                  </Button>
                  <Button
                    aria-label="Settings"
                    leftIcon={<FiSettings />}
                    variant="outline"
                    color="white"
                    borderColor="green.100"
                    _hover={{ bg: 'green.800' }}
                    onClick={onCategoryModalOpen}>
                    Edit Categories
                  </Button>
                </HStack>
              </Flex>
              
              <HStack spacing={12} justify="space-between" mt={6}>
                <Box>
                  <Text color="white" fontSize="sm">Categorization Progress</Text>
                  <Text color="white" fontSize="2xl" fontWeight="bold">
                    {categorizationStats.percentage.toFixed(1)}%
                  </Text>
                </Box>
                <Box flex="1" maxW="60%">
                  <Progress 
                    value={categorizationStats.percentage} 
                    size="sm" 
                    colorScheme="green"
                    bg="green.700"
                    borderRadius="full"
                  />
                  <Text color="green.100" fontSize="sm" mt={1}>
                    {categorizationStats.categorized} of {categorizationStats.total} transactions categorized
                  </Text>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={6} px={4}>
        <VStack spacing={6} align="stretch" width="100%">
          <Accordion allowMultiple defaultIndex={[0]}>
            {Object.entries(groupedTransactions).map(([monthKey, transactions]) => (
              <MonthSection
                key={monthKey}
                monthKey={monthKey}
                transactions={transactions}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onNameChange={handleNameChange}
                onReferenceChange={handleReferenceChange}
              />
            ))}
          </Accordion>
        </VStack>
      </Container>

      {/* Export Modal */}
      <Modal isOpen={isExportModalOpen} onClose={onExportModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="green.800" color="white" borderTopRadius="md" py={6} px={6}>
            <VStack spacing={1} align="stretch">
              <Heading size="lg" letterSpacing="tight">Export Data</Heading>
              <Text color="green.100" fontSize="md">Choose your export format</Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6} px={6}>
            <RadioGroup value={exportFormat} onChange={(value: 'spreadsheet' | 'backup') => setExportFormat(value)}>
              <VStack align="stretch" spacing={4}>
                <Box
                  as="label"
                  cursor="pointer"
                  borderWidth="1px"
                  borderColor={exportFormat === 'spreadsheet' ? 'green.500' : 'gray.200'}
                  borderRadius="md"
                  p={4}
                  _hover={{ borderColor: 'green.400' }}
                >
                  <HStack>
                    <Radio value="spreadsheet" colorScheme="green" />
                    <Icon as={FiFileText} color="gray.600" boxSize={5} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">Spreadsheet</Text>
                      <Text fontSize="sm" color="gray.600">Export as an Excel spreadsheet for viewing and analysis</Text>
                    </VStack>
                  </HStack>
                </Box>
                <Box
                  as="label"
                  cursor="pointer"
                  borderWidth="1px"
                  borderColor={exportFormat === 'backup' ? 'green.500' : 'gray.200'}
                  borderRadius="md"
                  p={4}
                  _hover={{ borderColor: 'green.400' }}
                >
                  <HStack>
                    <Radio value="backup" colorScheme="green" />
                    <Icon as={FiDownload} color="gray.600" boxSize={5} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">Backup Format</Text>
                      <Text fontSize="sm" color="gray.600">Export all data including categories and customizations</Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>
            </RadioGroup>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onExportModalClose}>Cancel</Button>
            <Button 
              colorScheme="green" 
              onClick={() => {
                window.exportHandler?.handleExport(exportFormat);
                onExportModalClose();
              }}
              leftIcon={<Icon as={exportFormat === 'spreadsheet' ? FiFileText : FiDownload} />}
            >
              Export
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Category Management Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={onCategoryModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="green.800" color="white" borderTopRadius="md" py={6} px={6}>
            <VStack spacing={1} align="stretch">
              <Heading size="lg" letterSpacing="tight">Manage Categories</Heading>
              <Text color="green.100" fontSize="md">Add, edit, or remove transaction categories</Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6} px={6}>
            <Tabs variant="unstyled">
              <TabList gap={3} mb={6}>
                <Tab 
                  flex={1}
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  py={2}
                  _selected={{ 
                    bg: 'white',
                    color: 'green.800',
                    borderColor: 'green.800',
                    fontWeight: 'medium'
                  }}
                >
                  Income Categories
                </Tab>
                <Tab 
                  flex={1}
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  py={2}
                  _selected={{ 
                    bg: 'white',
                    color: 'green.800',
                    borderColor: 'green.800',
                    fontWeight: 'medium'
                  }}
                >
                  Expense Categories
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Flex>
                      <Input
                        placeholder="New income category"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        mr={2}
                        size="sm"
                        borderColor="gray.200"
                      />
                      <Button 
                        colorScheme="green" 
                        onClick={() => {
                          setNewCategoryType('INCOME');
                          handleSaveCategory();
                        }}
                        size="sm"
                      >
                        Add
                      </Button>
                    </Flex>
                    <VStack spacing={1} align="stretch">
                      {categories
                        .filter(cat => cat.type === 'INCOME')
                        .map(category => (
                          <Flex
                            key={category.id}
                            justify="space-between"
                            align="center"
                            py={2}
                            px={1}
                            borderBottom="1px"
                            borderColor="gray.100"
                            _hover={{ bg: 'gray.50' }}
                          >
                            <Text fontSize="sm">{category.name}</Text>
                            <IconButton
                              aria-label="Delete category"
                              icon={<FiTrash2 size="1em" />}
                              variant="ghost"
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDeleteCategory(category.id)}
                            />
                          </Flex>
                        ))}
                    </VStack>
                  </VStack>
                </TabPanel>
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Flex>
                      <Input
                        placeholder="New expense category"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        mr={2}
                        size="sm"
                        borderColor="gray.200"
                      />
                      <Button 
                        colorScheme="green" 
                        onClick={() => {
                          setNewCategoryType('EXPENSE');
                          handleSaveCategory();
                        }}
                        size="sm"
                      >
                        Add
                      </Button>
                    </Flex>
                    <VStack spacing={1} align="stretch">
                      {categories
                        .filter(cat => cat.type === 'EXPENSE')
                        .map(category => (
                          <Flex
                            key={category.id}
                            justify="space-between"
                            align="center"
                            py={2}
                            px={1}
                            borderBottom="1px"
                            borderColor="gray.100"
                            _hover={{ bg: 'gray.50' }}
                          >
                            <Text fontSize="sm">{category.name}</Text>
                            <IconButton
                              aria-label="Delete category"
                              icon={<FiTrash2 size="1em" />}
                              variant="ghost"
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDeleteCategory(category.id)}
                            />
                          </Flex>
                        ))}
                    </VStack>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}; 