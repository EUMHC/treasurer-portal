import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  HStack,
  Button,
  useToast,
  Icon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Navigation } from '../components/Navigation';
import { FiSave, FiArrowUpRight, FiArrowDownRight, FiTrash2 } from 'react-icons/fi';
import { getTransactions, getCategories, getBudgetedAmounts, saveBudgetedAmounts } from '../utils/storage';
import type { Transaction, Category } from '../types/transaction';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { FocusableElement } from '@chakra-ui/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type BudgetData = {
  [categoryId: string]: number;
};

type CategorySummary = {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  variance: number;
  type: 'INCOME' | 'EXPENSE';
};

export const BudgetSummary = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetedAmounts, setBudgetedAmounts] = useState<BudgetData>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Load initial data
    const loadedCategories = getCategories();
    const loadedTransactions = getTransactions();
    const loadedBudgetedAmounts = getBudgetedAmounts();

    setCategories(loadedCategories);
    setTransactions(loadedTransactions);
    setBudgetedAmounts(loadedBudgetedAmounts || {});
  }, []);

  const categorySummaries = useMemo(() => {
    const summaries: CategorySummary[] = categories.map(category => {
      // Calculate actual amount from transactions
      const actualAmount = transactions
        .filter(t => t.category === category.id)
        .reduce((sum, t) => {
          if (category.type === 'INCOME') {
            return sum + (t.creditAmount || 0);
          } else {
            return sum + (t.debitAmount || 0);
          }
        }, 0);

      const budgeted = budgetedAmounts[category.id] || 0;
      const variance = category.type === 'INCOME' 
        ? actualAmount - budgeted 
        : budgeted - actualAmount;

      return {
        categoryId: category.id,
        categoryName: category.name,
        budgeted,
        actual: actualAmount,
        variance,
        type: category.type,
      };
    });

    // Sort by type (INCOME first) and then by name
    return summaries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'INCOME' ? -1 : 1;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });
  }, [categories, transactions, budgetedAmounts]);

  const handleBudgetChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBudgetedAmounts(prev => ({
      ...prev,
      [categoryId]: numValue
    }));
  };

  const handleSaveBudget = () => {
    saveBudgetedAmounts(budgetedAmounts);
    toast({
      title: "Budget saved",
      description: "Your budgeted amounts have been saved successfully",
      status: "success",
      duration: 3000,
    });
  };

  const handleClearBudget = () => {
    setBudgetedAmounts({});
    saveBudgetedAmounts({});
    onClose();
    toast({
      title: "Budget cleared",
      description: "All budgeted amounts have been cleared",
      status: "info",
      duration: 3000,
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
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
                  <Heading size="lg" color="white">Budget Summary</Heading>
                  <Text color="green.100" fontSize="sm">
                    Compare budgeted amounts with actual spending. Budgeted values will persist across different transaction imports.
                  </Text>
                </VStack>
                <HStack>
                  <Button
                    leftIcon={<Icon as={FiTrash2} />}
                    colorScheme="red"
                    variant="outline"
                    size="md"
                    color="white"
                    borderColor="red.400"
                    _hover={{ bg: 'red.900' }}
                    onClick={onOpen}
                  >
                    Clear Budget
                  </Button>
                  <Button
                    leftIcon={<Icon as={FiSave} />}
                    colorScheme="green"
                    variant="outline"
                    color="white"
                    borderColor="green.100"
                    _hover={{ bg: 'green.800' }}
                    onClick={handleSaveBudget}
                  >
                    Save Budget
                  </Button>
                </HStack>
              </Flex>
            </Box>

            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden" mb={4}>
              <Box overflowX="auto">
                <Heading size="md" p={4} bg="green.900" color="white">Income Categories</Heading>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm">Category</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Budgeted</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Actual</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Variance</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" width="150px">Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorySummaries
                      .filter(summary => summary.type === 'INCOME')
                      .map((summary, index) => (
                        <Tr 
                          key={summary.categoryId}
                          bg={index % 2 === 0 ? 'white' : 'gray.50'}
                        >
                          <Td py={3} fontWeight="medium">
                            <Text>{summary.categoryName}</Text>
                          </Td>
                          <Td isNumeric py={3}>
                            <Input
                              type="number"
                              value={budgetedAmounts[summary.categoryId] || ''}
                              onChange={(e) => handleBudgetChange(summary.categoryId, e.target.value)}
                              size="sm"
                              textAlign="right"
                              width="120px"
                              borderColor="gray.200"
                              _hover={{ borderColor: "green.400" }}
                              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px var(--chakra-colors-green-500)" }}
                            />
                          </Td>
                          <Td isNumeric py={3} fontWeight="medium">
                            {formatAmount(summary.actual)}
                          </Td>
                          <Td 
                            isNumeric 
                            py={3} 
                            color={summary.variance >= 0 ? 'green.600' : 'red.600'}
                            fontWeight="bold"
                          >
                            {formatAmount(summary.variance)}
                          </Td>
                          <Td py={3}>
                            <HStack spacing={2} justify="center">
                              <Icon 
                                as={summary.variance >= 0 ? FiArrowUpRight : FiArrowDownRight} 
                                color={summary.variance >= 0 ? 'green.500' : 'red.500'}
                              />
                              <Text 
                                fontSize="sm" 
                                color={summary.variance >= 0 ? 'green.600' : 'red.600'}
                                fontWeight="medium"
                              >
                                {Math.abs(Math.round((summary.variance / (summary.budgeted || 1)) * 100))}% {summary.variance >= 0 ? 'above' : 'below'}
                              </Text>
                            </HStack>
                          </Td>
                        </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>

            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden" mb={4}>
              <Heading size="md" p={4} bg="green.900" color="white">Income Variance from Budget</Heading>
              <Box p={6} height={`${Math.max(200, (categorySummaries.filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0)).length * 50) + 40)}px`}>
                <Bar 
                  data={{
                    labels: categorySummaries
                      .filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0))
                      .map(s => s.categoryName),
                    datasets: [
                      {
                        label: 'Variance from Budget',
                        data: categorySummaries
                          .filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance),
                        backgroundColor: categorySummaries
                          .filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance >= 0 
                            ? 'rgba(56, 161, 105, 0.6)'
                            : 'rgba(229, 62, 62, 0.6)'
                          ),
                        borderColor: categorySummaries
                          .filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance >= 0 
                            ? 'rgba(56, 161, 105, 1)' 
                            : 'rgba(229, 62, 62, 1)'
                          ),
                        borderWidth: 1,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y' as const,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      title: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw as number;
                            const formattedValue = new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP'
                            }).format(Math.abs(value));
                            return value >= 0 
                              ? `Above budget by ${formattedValue}`
                              : `Below budget by ${formattedValue}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          font: {
                            size: 14,
                            weight: 'bold'
                          },
                        },
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          callback: function(tickValue: number | string) {
                            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
                            return `£${value.toLocaleString()}`;
                          }
                        }
                      },
                    },
                  }}
                  height={Math.max(200, categorySummaries.filter(s => s.type === 'INCOME' && (s.budgeted !== 0 || s.actual !== 0)).length * 40)}
                />
              </Box>
            </Box>

            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden" mb={4}>
              <Box overflowX="auto">
                <Heading size="md" p={4} bg="green.900" color="white">Expense Categories</Heading>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm">Category</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Budgeted</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Actual</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" isNumeric>Variance</Th>
                      <Th bg="green.50" py={4} color="gray.700" borderBottom="2px" borderColor="green.800" fontSize="sm" width="150px">Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorySummaries
                      .filter(summary => summary.type === 'EXPENSE')
                      .map((summary, index) => (
                        <Tr 
                          key={summary.categoryId}
                          bg={index % 2 === 0 ? 'white' : 'gray.50'}
                        >
                          <Td py={3} fontWeight="medium">
                            <Text>{summary.categoryName}</Text>
                          </Td>
                          <Td isNumeric py={3}>
                            <Input
                              type="number"
                              value={budgetedAmounts[summary.categoryId] || ''}
                              onChange={(e) => handleBudgetChange(summary.categoryId, e.target.value)}
                              size="sm"
                              textAlign="right"
                              width="120px"
                              borderColor="gray.200"
                              _hover={{ borderColor: "green.400" }}
                              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px var(--chakra-colors-green-500)" }}
                            />
                          </Td>
                          <Td isNumeric py={3} fontWeight="medium">
                            {formatAmount(summary.actual)}
                          </Td>
                          <Td 
                            isNumeric 
                            py={3} 
                            color={summary.variance >= 0 ? 'green.600' : 'red.600'}
                            fontWeight="bold"
                          >
                            {formatAmount(summary.variance)}
                          </Td>
                          <Td py={3}>
                            <HStack spacing={2} justify="center">
                              <Icon 
                                as={summary.variance >= 0 ? FiArrowUpRight : FiArrowDownRight} 
                                color={summary.variance >= 0 ? 'green.500' : 'red.500'}
                              />
                              <Text 
                                fontSize="sm" 
                                color={summary.variance >= 0 ? 'green.600' : 'red.600'}
                                fontWeight="medium"
                              >
                                {Math.abs(Math.round((summary.variance / (summary.budgeted || 1)) * 100))}% {summary.variance >= 0 ? 'under' : 'over'}
                              </Text>
                            </HStack>
                          </Td>
                        </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>

            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
              <Heading size="md" p={4} bg="green.900" color="white">Expense Variance from Budget</Heading>
              <Box p={6} height={`${Math.max(200, (categorySummaries.filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0)).length * 50) + 40)}px`}>
                <Bar 
                  data={{
                    labels: categorySummaries
                      .filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0))
                      .map(s => s.categoryName),
                    datasets: [
                      {
                        label: 'Variance from Budget',
                        data: categorySummaries
                          .filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance),
                        backgroundColor: categorySummaries
                          .filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance >= 0 
                            ? 'rgba(56, 161, 105, 0.6)'
                            : 'rgba(229, 62, 62, 0.6)'
                          ),
                        borderColor: categorySummaries
                          .filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0))
                          .map(s => s.variance >= 0 
                            ? 'rgba(56, 161, 105, 1)' 
                            : 'rgba(229, 62, 62, 1)'
                          ),
                        borderWidth: 1,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y' as const,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      title: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw as number;
                            const formattedValue = new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP'
                            }).format(Math.abs(value));
                            return value >= 0 
                              ? `Under budget by ${formattedValue}`
                              : `Over budget by ${formattedValue}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          font: {
                            size: 14,
                            weight: 'bold'
                          },
                        },
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          callback: function(tickValue: number | string) {
                            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
                            return `£${value.toLocaleString()}`;
                          }
                        }
                      },
                    },
                  }}
                  height={Math.max(200, categorySummaries.filter(s => s.type === 'EXPENSE' && (s.budgeted !== 0 || s.actual !== 0)).length * 40)}
                />
              </Box>
            </Box>
          </VStack>
        </Container>
      </Box>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef as RefObject<FocusableElement>}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" bg="green.900" color="white" borderTopRadius="md">
              Clear Budget Values
            </AlertDialogHeader>

            <AlertDialogBody pt={4}>
              Are you sure you want to clear all budgeted values? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleClearBudget}
              >
                Clear Budget
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}; 