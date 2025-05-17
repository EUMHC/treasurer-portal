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
  IconButton
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Transaction, Category, CategoryType } from '../types/transaction';
import { getTransactions, getCategories, saveTransactions, saveCategories } from '../utils/storage';
import { Navigation } from '../components/Navigation';
import { FiZap, FiSettings, FiTrash2 } from 'react-icons/fi';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { ensureDefaultCategories } from '../utils/categories';

type GroupedTransactions = {
  [key: string]: Transaction[];
};

const parseUKDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
  if (!day || !month || !year) return new Date(NaN);
  return new Date(year, month - 1, day);
};

// Add description parsing function
const parseDescription = (description: string): { name: string; reference: string } => {
  if (!description) {
    return { name: '', reference: '' };
  }

  const patterns = [
    // Pattern for reference numbers and technical details at end
    { regex: /^(.+?)(?:\s+\d{12,}|\s+[A-Z0-9]+\s+\d{6}\s+\d{2}\s+\d{2}[A-Z]{3}\d{2}\s+\d{2}:\d{2})\s*(.*)$/i },
    // Pattern for simple reference after name
    { regex: /^(.+?)\s+((?:INTRAMURAL\s*MEMB|TECHNICAL\s*KIT|EUSU\s*MSL\s*INCOME).*)$/i },
    // Pattern for PlayerData
    { regex: /^PLYRDATA\s+(.+)$/, name: "Playerdata", refGroup: 1 },
    // Pattern for 1&1
    { regex: /^(1&1\s+INTERNET\s+LTD)[.\s]*(.+)?$/i },
    // Pattern for Edinburgh University
    { regex: /^(EDIN(?:BURGH)?\s+UNIVERSI(?:TY)?)\s*(.+)?$/i },
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern.regex);
    if (match) {
      if (pattern.name === "Playerdata" && match[pattern.refGroup]) {
        return {
          name: pattern.name,
          reference: match[pattern.refGroup] as string
        };
      }
      if (match[1]) {
        return {
          name: match[1].trim(),
          reference: (match[2] || '').trim()
        };
      }
    }
  }

  return {
    name: description.trim(),
    reference: ''
  };
};

export const Transactions = () => {
  const [, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions>({});
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('EXPENSE');
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    setTransactions(loadedTransactions);
    
    // Ensure default categories are present
    const categoriesWithDefaults = ensureDefaultCategories(loadedCategories as Category[]);
    setCategories(categoriesWithDefaults);
    saveCategories(categoriesWithDefaults);

    // Group transactions by month and year
    const grouped = loadedTransactions.reduce((acc: GroupedTransactions, transaction) => {
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
    loadData();
  }, [loadData]);

  const handleCategoryChange = (monthKey: string, transactionIndex: number, categoryId: string) => {
    const updatedGrouped = { ...groupedTransactions };
    const monthTransactions = [...(updatedGrouped[monthKey] || [])];
    
    if (monthTransactions[transactionIndex]) {
      monthTransactions[transactionIndex] = {
        ...monthTransactions[transactionIndex],
        category: categoryId
      };
      updatedGrouped[monthKey] = monthTransactions;
      
      // Update both states
      setGroupedTransactions(updatedGrouped);
      
      // Flatten all transactions for storage
      const allTransactions = Object.values(updatedGrouped).flat();
      setTransactions(allTransactions);
      saveTransactions(allTransactions);
    }
  };

  const calculateTotalIncome = (transactions: Transaction[]): number => {
    return transactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0);
  };

  const calculateTotalExpenses = (transactions: Transaction[]): number => {
    return transactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatMonthYear = (key: string) => {
    const [year, month] = key.split('-').map(str => parseInt(str));
    if (!year || !month) return '';
    return new Date(year, month - 1).toLocaleString('en-GB', { 
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = parseUKDate(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const autoCategorizeTransactions = async () => {
    setIsAutoCategorizing(true);
    try {
      const updatedGrouped = { ...groupedTransactions };
      let hasChanges = false;

      // Process each transaction
      for (const monthKey of Object.keys(updatedGrouped)) {
        const monthTransactions = updatedGrouped[monthKey];
        if (!monthTransactions) continue;
        
        for (let i = 0; i < monthTransactions.length; i++) {
          const transaction = monthTransactions[i];
          if (!transaction || transaction.category) continue;

          const description = transaction.transactionDescription.toLowerCase();
          let matchedCategory = null;

          // Filter categories based on transaction type before matching
          const relevantCategories = categories.filter(category => 
            transaction.creditAmount 
              ? category.type === 'INCOME'
              : category.type === 'EXPENSE'
          );

          // Simple matching logic - can be enhanced with more sophisticated rules
          for (const category of relevantCategories) {
            const keywords = category.name.toLowerCase().split(' ');
            if (keywords.some(keyword => description.includes(keyword))) {
              matchedCategory = category.id;
              break;
            }
          }

          if (matchedCategory) {
            monthTransactions[i] = {
              ...transaction,
              category: matchedCategory
            };
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
          description: "Transactions have been automatically categorized based on their descriptions",
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

  const handleSaveCategory = () => {
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
      color: newCategoryType === 'INCOME' ? '#38A169' : '#E53E3E' // Default colors for new categories
    };
    
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
    setNewCategoryName('');
    toast({
      title: "Success",
      description: "Category added successfully",
      status: "success",
      duration: 3000,
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
    toast({
      title: "Success",
      description: "Category deleted successfully",
      status: "success",
      duration: 3000,
    });
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
                  <IconButton
                    aria-label="Settings"
                    icon={<FiSettings />}
                    variant="outline"
                    color="white"
                    borderColor="green.100"
                    _hover={{ bg: 'green.800' }}
                    onClick={onOpen}
                  />
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
              <AccordionItem 
                key={monthKey}
                border="none"
                mb={4}
              >
                <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
                  <AccordionButton 
                    bg="green.800" 
                    _hover={{ bg: 'green.700' }}
                    py={4}
                  >
                    <Box flex="1" textAlign="left">
                      <Text fontSize="lg" fontWeight="semibold" color="white">
                        {formatMonthYear(monthKey)}
                      </Text>
                    </Box>
                    <HStack spacing={8} mr={4}>
                      <HStack spacing={2}>
                        <Icon as={FiArrowUp} color="green.200" />
                        <Text color="green.200" fontSize="sm">
                          Income: {formatAmount(calculateTotalIncome(transactions))}
                        </Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Icon as={FiArrowDown} color="red.200" />
                        <Text color="red.200" fontSize="sm">
                          Expenses: {formatAmount(calculateTotalExpenses(transactions))}
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
                            <Th bg="green.50" py={4} color="gray.700" width="20%" borderBottom="2px" borderColor="green.800" fontSize="sm">Name</Th>
                            <Th bg="green.50" py={4} color="gray.700" width="20%" borderBottom="2px" borderColor="green.800" fontSize="sm">Reference</Th>
                            <Th bg="green.50" py={4} color="gray.700" isNumeric width="12%" borderBottom="2px" borderColor="green.800" fontSize="sm">Debit</Th>
                            <Th bg="green.50" py={4} color="gray.700" isNumeric width="12%" borderBottom="2px" borderColor="green.800" fontSize="sm">Credit</Th>
                            <Th bg="green.50" py={4} color="gray.700" isNumeric width="12%" borderBottom="2px" borderColor="green.800" fontSize="sm">Balance</Th>
                            <Th bg="green.50" py={4} color="gray.700" width="20%" borderBottom="2px" borderColor="green.800" fontSize="sm">Category</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transactions.map((transaction, index) => {
                            const { name, reference } = parseDescription(transaction.transactionDescription);
                            return (
                              <Tr 
                                key={`${transaction.transactionDate}-${index}`}
                                _hover={{ bg: 'green.50' }}
                                transition="all 0.2s"
                                borderBottomWidth="1px"
                                borderColor="gray.200"
                              >
                                <Td py={3.5} color="gray.700" fontWeight="medium">{formatDate(transaction.transactionDate)}</Td>
                                <Td py={3.5} color="gray.700" maxW="0" isTruncated title={name}>
                                  {name}
                                </Td>
                                <Td py={3.5} color="gray.500" maxW="0" isTruncated title={reference}>
                                  {reference}
                                </Td>
                                <Td py={3.5} isNumeric color={transaction.debitAmount ? "red.600" : "gray.400"} fontWeight={transaction.debitAmount ? "semibold" : "normal"}>
                                  {formatAmount(transaction.debitAmount)}
                                </Td>
                                <Td py={3.5} isNumeric color={transaction.creditAmount ? "green.600" : "gray.400"} fontWeight={transaction.creditAmount ? "semibold" : "normal"}>
                                  {formatAmount(transaction.creditAmount)}
                                </Td>
                                <Td py={3.5} isNumeric color="gray.900" fontWeight="semibold">{formatAmount(transaction.balance)}</Td>
                                <Td py={3}>
                                  <Select
                                    size="sm"
                                    value={transaction.category || ''}
                                    onChange={(e) => handleCategoryChange(monthKey, index, e.target.value)}
                                    placeholder="Select category"
                                    bg="white"
                                    borderColor="gray.200"
                                    _hover={{ borderColor: "green.400" }}
                                    _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px var(--chakra-colors-green-500)" }}
                                  >
                                    {categories
                                      .filter(category => 
                                        transaction.creditAmount 
                                          ? category.type === 'INCOME'
                                          : category.type === 'EXPENSE'
                                      )
                                      .map((category) => (
                                        <option key={category.id} value={category.id}>
                                          {category.name}
                                        </option>
                                      ))}
                                  </Select>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </Box>
                  </AccordionPanel>
                </Box>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
      </Container>

      {/* Category Management Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
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