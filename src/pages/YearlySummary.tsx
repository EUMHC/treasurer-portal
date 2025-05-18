import { Box, Heading, Container, VStack, Table, Thead, Tbody, Tr, Th, Td, Text, HStack, Select, Flex, Grid } from '@chakra-ui/react';
import { Navigation } from '../components/Navigation';
import { calculateYearlySummary, formatCurrency, getMonthName, getAvailableAcademicYears, formatAcademicYear } from '../utils/summaryCalculations';
import { getCategories } from '../utils/storage';
import { useState, useMemo } from 'react';
import type { Category } from '../types/transaction';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Sector,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import type { ActiveShape } from 'recharts/types/util/types';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';

// Updated color palette for better differentiation
const COLORS = [
  '#38A169', // green.500
  '#E53E3E', // red.500
  '#3182CE', // blue.500
  '#D69E2E', // yellow.500
  '#805AD5', // purple.500
  '#DD6B20', // orange.500
  '#319795', // teal.500
  '#D53F8C', // pink.500
  '#718096', // gray.500
  '#00B5D8', // cyan.500
  '#9F7AEA', // purple.400
  '#F6AD55', // orange.300
];

interface PieChartData {
  name: string;
  value: number;
}

type CustomActiveShape = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: PieChartData;
  percent: number;
  value: number;
};

export const YearlySummary = () => {
  const availableYears = useMemo(() => getAvailableAcademicYears(), []);
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear());
  const categories = getCategories() as Category[];
  
  const summary = useMemo(() => calculateYearlySummary(selectedYear), [selectedYear]);
  const months = Object.keys(summary)
    .filter(key => key !== 'yearTotals')
    .sort((a, b) => a.localeCompare(b));

  // Filter categories by type and active status
  const incomeCategories = categories.filter(category => 
    category.id && summary.yearTotals.activeCategories.income.has(category.id)
  );
  
  const expenseCategories = categories.filter(category => 
    category.id && summary.yearTotals.activeCategories.expenses.has(category.id)
  );

  // Prepare data for line chart with running balance
  interface MonthData {
    name: string;
    Income: number;
    Expenses: number;
    Balance: number;
    RunningBalance: number;
  }

  const lineChartData = months.map((month, index) => {
    const monthData: MonthData = {
      name: getMonthName(month),
      Income: summary[month]?.totalIncome || 0,
      Expenses: summary[month]?.totalExpenses || 0,
      Balance: summary[month]?.netChange || 0,
      RunningBalance: 0, // Will be set below
    };

    // Calculate running balance
    monthData.RunningBalance = months
      .slice(0, index + 1)
      .reduce((acc, m) => acc + (summary[m]?.netChange || 0), 0);

    return monthData;
  });


  // Prepare data for pie charts with sorting and uncategorized amounts
  const incomePieData = useMemo(() => {
    // Calculate total uncategorized income
    const uncategorizedIncome = Object.entries(summary.yearTotals.income)
      .reduce((total, [categoryId, amount]) => {
        if (categoryId === 'unassigned') {
          return total + amount;
        }
        return total;
      }, 0);

    const categorizedData = incomeCategories
      .map(category => ({
        name: category.name,
        value: summary.yearTotals.income[category.id] || 0,
      }))
      .filter(item => item.value > 0);

    // Add uncategorized if there is any
    const allData = uncategorizedIncome > 0 
      ? [...categorizedData, { name: 'Uncategorized', value: uncategorizedIncome }]
      : categorizedData;

    return allData.sort((a, b) => b.value - a.value);
  }, [incomeCategories, summary.yearTotals.income]);

  const expensesPieData = useMemo(() => {
    // Calculate total uncategorized expenses
    const uncategorizedExpenses = Object.entries(summary.yearTotals.expenses)
      .reduce((total, [categoryId, amount]) => {
        if (categoryId === 'unassigned') {
          return total + amount;
        }
        return total;
      }, 0);

    const categorizedData = expenseCategories
      .map(category => ({
        name: category.name,
        value: summary.yearTotals.expenses[category.id] || 0,
      }))
      .filter(item => item.value > 0);

    // Add uncategorized if there is any
    const allData = uncategorizedExpenses > 0 
      ? [...categorizedData, { name: 'Uncategorized', value: uncategorizedExpenses }]
      : categorizedData;

    return allData.sort((a, b) => b.value - a.value);
  }, [expenseCategories, summary.yearTotals.expenses]);

  const renderActiveShape = (props: CustomActiveShape) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
      </g>
    );
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
                  <Heading size="lg" color="white">Yearly Summary</Heading>
                  <Text color="green.100" fontSize="sm">
                    Comprehensive breakdown of income and expenses for {formatAcademicYear(selectedYear)}
                  </Text>
                </VStack>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  width="auto"
                  borderColor="green.100"
                  _hover={{ borderColor: "green.50" }}
                  color="white"
                  bg="green.800"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{formatAcademicYear(year)}</option>
                  ))}
                </Select>
              </Flex>
              
              <HStack spacing={12} justify="space-between" mt={6}>
                <Box>
                  <Text color="white" fontSize="sm">Total Income</Text>
                  <Text color="white" fontSize="2xl" fontWeight="bold">
                    {formatCurrency(summary.yearTotals.totalIncome)}
                  </Text>
                </Box>
                <Box>
                  <Text color="white" fontSize="sm">Total Expenses</Text>
                  <Text color="white" fontSize="2xl" fontWeight="bold">
                    {formatCurrency(summary.yearTotals.totalExpenses)}
                  </Text>
                </Box>
                <Box>
                  <Text color="white" fontSize="sm">Net Change</Text>
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold"
                    color={summary.yearTotals.netChange >= 0 ? "green.200" : "red.200"}
                  >
                    {formatCurrency(summary.yearTotals.netChange)}
                  </Text>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={6} px={4}>
        <VStack spacing={6} align="stretch" width="100%">
          {/* Monthly Income vs Expenses Line Chart */}
          <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden" width="100%">
            <Box bg="green.800" p={4}>
              <Text fontSize="lg" fontWeight="semibold" color="white">Monthly Income, Expenses & Balance</Text>
            </Box>
            <Box p={6} height="400px">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Income" 
                    stroke="#38A169" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Expenses" 
                    stroke="#E53E3E" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="RunningBalance"
                    fill="#3182CE"
                    stroke="#3182CE"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Running Balance"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Box>


          {/* Income Table */}
          {incomeCategories.length > 0 && (
            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
              <Box bg="green.800" p={4}>
                <Text fontSize="lg" fontWeight="semibold" color="white">Income Breakdown</Text>
              </Box>
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead bg="green.50">
                    <Tr>
                      <Th borderBottom="2px" borderColor="green.100" color="green.700">Category</Th>
                      {months.map(month => (
                        <Th 
                          key={month} 
                          borderBottom="2px" 
                          borderColor="green.100"
                          textAlign="right"
                          color="green.700"
                        >
                          {getMonthName(month)}
                        </Th>
                      ))}
                      <Th 
                        borderBottom="2px" 
                        borderColor="green.100"
                        textAlign="right"
                        color="green.700"
                      >
                        Total
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {incomeCategories.map(category => (
                      <Tr key={`income-${category.id}`}>
                        <Td borderBottom="1px" borderColor="green.50">
                          {category.name}
                        </Td>
                        {months.map(month => (
                          <Td 
                            key={month} 
                            isNumeric 
                            color="green.700"
                            borderBottom="1px" 
                            borderColor="green.50"
                          >
                            {formatCurrency(summary[month]?.income[category.id] || 0)}
                          </Td>
                        ))}
                        <Td 
                          isNumeric 
                          color="green.700" 
                          fontWeight="semibold"
                          borderBottom="1px" 
                          borderColor="green.50"
                        >
                          {formatCurrency(summary.yearTotals.income[category.id] || 0)}
                        </Td>
                      </Tr>
                    ))}
                    {/* Add Uncategorized row */}
                    <Tr>
                      <Td borderBottom="1px" borderColor="green.50" fontStyle="italic">
                        Uncategorized
                      </Td>
                      {months.map(month => (
                        <Td 
                          key={month} 
                          isNumeric 
                          color="green.700"
                          borderBottom="1px" 
                          borderColor="green.50"
                          fontStyle="italic"
                        >
                          {formatCurrency(summary[month]?.income['unassigned'] || 0)}
                        </Td>
                      ))}
                      <Td 
                        isNumeric 
                        color="green.700" 
                        fontWeight="semibold"
                        borderBottom="1px" 
                        borderColor="green.50"
                        fontStyle="italic"
                      >
                        {formatCurrency(summary.yearTotals.income['unassigned'] || 0)}
                      </Td>
                    </Tr>
                    <Tr bg="green.50">
                      <Td fontWeight="semibold" color="green.800">Total Income</Td>
                      {months.map(month => (
                        <Td 
                          key={month} 
                          isNumeric 
                          color="green.800"
                          fontWeight="semibold"
                        >
                          {formatCurrency(summary[month]?.totalIncome || 0)}
                        </Td>
                      ))}
                      <Td 
                        isNumeric 
                        color="green.800"
                        fontWeight="semibold"
                      >
                        {formatCurrency(summary.yearTotals.totalIncome)}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Expenses Table */}
          {expenseCategories.length > 0 && (
            <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
              <Box bg="green.800" p={4}>
                <Text fontSize="lg" fontWeight="semibold" color="white">Expenses Breakdown</Text>
              </Box>
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead bg="red.50">
                    <Tr>
                      <Th borderBottom="2px" borderColor="red.100" color="red.700">Category</Th>
                      {months.map(month => (
                        <Th 
                          key={month} 
                          borderBottom="2px" 
                          borderColor="red.100"
                          textAlign="right"
                          color="red.700"
                        >
                          {getMonthName(month)}
                        </Th>
                      ))}
                      <Th 
                        borderBottom="2px" 
                        borderColor="red.100"
                        textAlign="right"
                        color="red.700"
                      >
                        Total
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {expenseCategories.map(category => (
                      <Tr key={`expense-${category.id}`}>
                        <Td borderBottom="1px" borderColor="red.50">
                          {category.name}
                        </Td>
                        {months.map(month => (
                          <Td 
                            key={month} 
                            isNumeric 
                            color="red.600"
                            borderBottom="1px" 
                            borderColor="red.50"
                          >
                            {formatCurrency(summary[month]?.expenses[category.id] || 0)}
                          </Td>
                        ))}
                        <Td 
                          isNumeric 
                          color="red.600" 
                          fontWeight="semibold"
                          borderBottom="1px" 
                          borderColor="red.50"
                        >
                          {formatCurrency(summary.yearTotals.expenses[category.id] || 0)}
                        </Td>
                      </Tr>
                    ))}
                    {/* Add Uncategorized row */}
                    <Tr>
                      <Td borderBottom="1px" borderColor="red.50" fontStyle="italic">
                        Uncategorized
                      </Td>
                      {months.map(month => (
                        <Td 
                          key={month} 
                          isNumeric 
                          color="red.600"
                          borderBottom="1px" 
                          borderColor="red.50"
                          fontStyle="italic"
                        >
                          {formatCurrency(summary[month]?.expenses['unassigned'] || 0)}
                        </Td>
                      ))}
                      <Td 
                        isNumeric 
                        color="red.600" 
                        fontWeight="semibold"
                        borderBottom="1px" 
                        borderColor="red.50"
                        fontStyle="italic"
                      >
                        {formatCurrency(summary.yearTotals.expenses['unassigned'] || 0)}
                      </Td>
                    </Tr>
                    <Tr bg="red.50">
                      <Td fontWeight="semibold" color="red.800">Total Expenses</Td>
                      {months.map(month => (
                        <Td 
                          key={month} 
                          isNumeric 
                          color="red.800"
                          fontWeight="semibold"
                        >
                          {formatCurrency(summary[month]?.totalExpenses || 0)}
                        </Td>
                      ))}
                      <Td 
                        isNumeric 
                        color="red.800"
                        fontWeight="semibold"
                      >
                        {formatCurrency(summary.yearTotals.totalExpenses)}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

                    {/* Category Distribution Pie Charts */}
                    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6} width="100%">
            {/* Income Distribution */}
            {incomePieData.length > 0 && (
              <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
                <Box bg="green.800" p={4}>
                  <Text fontSize="lg" fontWeight="semibold" color="white">Income Distribution</Text>
                </Box>
                <Flex p={6} height="400px" direction="row" align="center">
                  <Box flex="1" height="100%">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomePieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          activeShape={renderActiveShape as ActiveShape<PieSectorDataItem>}
                        >
                          {incomePieData.map((entry, _index) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={COLORS[_index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload?.[0]?.payload) {
                              const data = payload[0].payload as PieChartData;
                              return (
                                <Box 
                                  bg="white" 
                                  p={3} 
                                  borderRadius="md" 
                                  boxShadow="md"
                                  border="1px"
                                  borderColor="gray.200"
                                >
                                  <Text fontWeight="bold" color="gray.700">
                                    {data.name}
                                  </Text>
                                  <Text color="gray.600">
                                    {formatCurrency(data.value)}
                                  </Text>
                                  <Text color="gray.500" fontSize="sm">
                                    {((data.value / summary.yearTotals.totalIncome) * 100).toFixed(1)}%
                                  </Text>
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <VStack align="start" spacing={2} pl={4} flex="1">
                    {incomePieData.map((entry, _index) => (
                      <HStack key={entry.name} spacing={2}>
                        <Box w="3" h="3" borderRadius="full" bg={COLORS[_index % COLORS.length]} />
                        <Text fontSize="sm" color="gray.700">
                          {entry.name} ({((entry.value / summary.yearTotals.totalIncome) * 100).toFixed(1)}%)
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Flex>
              </Box>
            )}

            {/* Expenses Distribution */}
            {expensesPieData.length > 0 && (
              <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
                <Box bg="green.800" p={4}>
                  <Text fontSize="lg" fontWeight="semibold" color="white">Expenses Distribution</Text>
                </Box>
                <Flex p={6} height="400px" direction="row" align="center">
                  <Box flex="1" height="100%">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          activeShape={renderActiveShape as ActiveShape<PieSectorDataItem>}
                        >
                          {expensesPieData.map((entry, _index) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={COLORS[_index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload?.[0]?.payload) {
                              const data = payload[0].payload as PieChartData;
                              return (
                                <Box 
                                  bg="white" 
                                  p={3} 
                                  borderRadius="md" 
                                  boxShadow="md"
                                  border="1px"
                                  borderColor="gray.200"
                                >
                                  <Text fontWeight="bold" color="gray.700">
                                    {data.name}
                                  </Text>
                                  <Text color="gray.600">
                                    {formatCurrency(data.value)}
                                  </Text>
                                  <Text color="gray.500" fontSize="sm">
                                    {((data.value / summary.yearTotals.totalExpenses) * 100).toFixed(1)}%
                                  </Text>
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <VStack align="start" spacing={2} pl={4} flex="1">
                    {expensesPieData.map((entry, _index) => (
                      <HStack key={entry.name} spacing={2}>
                        <Box w="3" h="3" borderRadius="full" bg={COLORS[_index % COLORS.length]} />
                        <Text fontSize="sm" color="gray.700">
                          {entry.name} ({((entry.value / summary.yearTotals.totalExpenses) * 100).toFixed(1)}%)
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Flex>
              </Box>
            )}
          </Grid>

          {/* Net Change Table */}
          <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
            <Box bg="green.800" p={4}>
              <Text fontSize="lg" fontWeight="semibold" color="white">Monthly Net Change</Text>
            </Box>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead bg="grey.50">
                  <Tr>
                    <Th borderBottom="2px" borderColor="grey.100" color="grey.700">Month</Th>
                    <Th 
                      borderBottom="2px" 
                      borderColor="grey.100"
                      textAlign="right"
                      color="green.700"
                    >
                      Net Change
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {months.map(month => (
                    <Tr key={month}>
                      <Td borderBottom="1px" borderColor="green.50">
                        {getMonthName(month)}
                      </Td>
                      <Td 
                        isNumeric 
                        borderBottom="1px" 
                        borderColor="green.50"
                        color={(summary[month]?.netChange || 0) >= 0 ? "green.700" : "red.600"}
                        fontWeight="medium"
                      >
                        {formatCurrency(summary[month]?.netChange || 0)}
                      </Td>
                    </Tr>
                  ))}
                  <Tr bg="grey.50">
                    <Td fontWeight="semibold" color="grey.800">Total Net Change</Td>
                    <Td 
                      isNumeric 
                      fontWeight="semibold"
                      color={summary.yearTotals.netChange >= 0 ? "green.700" : "red.600"}
                    >
                      {formatCurrency(summary.yearTotals.netChange)}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>

        </VStack>
      </Container>
    </>
  );
}; 