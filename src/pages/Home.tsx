import { Box, VStack, Heading, Text, Image, Button, HStack, Divider, Stat, StatLabel, StatNumber, StatGroup } from '@chakra-ui/react';
import { FileUpload } from '../components/FileUpload';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getCategories } from '../utils/storage';
import { FiArrowRight } from 'react-icons/fi';

export const Home = () => {
  const navigate = useNavigate();
  const transactions = getTransactions();
  const categories = getCategories();
  
  // Calculate statistics
  const stats = {
    total: transactions.length,
    categorized: transactions.filter(t => t.category).length,
    totalCategories: categories.length
  };

  const handleUploadSuccess = () => {
    navigate('/treasurer-portal/transactions');
  };

  const handleContinue = () => {
    navigate('/treasurer-portal/transactions');
  };

  return (
    <Box 
      minH="100vh" 
      w="100vw"
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      bg="green.700"
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      overflowY="auto"
    >
      <VStack 
        spacing={8} 
        maxW="600px" 
        w="90%" 
        p={8} 
        bg="green.800" 
        borderRadius="lg" 
        boxShadow="xl"
        m="auto"
        border="1px solid"
        borderColor="green.600"
      >
        <Image 
          src="/treasurer-portal/logo.png" 
          alt="EUMHC Logo" 
          boxSize="150px"
          fallback={
            <Box 
              w="150px" 
              h="150px" 
              bg="green.900" 
              borderRadius="full" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              border="2px solid"
              borderColor="green.600"
            >
              <Text color="white">EUMHC</Text>
            </Box>
          }
        />
        <Heading size="xl" textAlign="center" color="white">
          EUMHC Treasurer Sheet Generator
        </Heading>
        
        <VStack spacing={4} w="100%">
          {stats.total > 0 && (
            <>
              <Button
                leftIcon={<FiArrowRight />}
                colorScheme="green"
                size="lg"
                width="100%"
                onClick={handleContinue}
                bg="green.600"
                _hover={{ bg: 'green.500' }}
              >
                Continue with Saved Data
              </Button>

              <StatGroup 
                textAlign="center" 
                color="white" 
                bg="green.700" 
                p={3} 
                borderRadius="md" 
                border="1px" 
                borderColor="green.600"
                w="100%"
              >
                <Stat>
                  <StatLabel color="green.100">Transactions</StatLabel>
                  <StatNumber>{stats.total}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color="green.100">Categories</StatLabel>
                  <StatNumber>{stats.totalCategories}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color="green.100">Categorized</StatLabel>
                  <StatNumber>{((stats.categorized / stats.total) * 100).toFixed(0)}%</StatNumber>
                </Stat>
              </StatGroup>
              
              <HStack w="100%" my={2}>
                <Divider borderColor="green.600" />
                <Text color="green.100" fontSize="sm" whiteSpace="nowrap">or import new data</Text>
                <Divider borderColor="green.600" />
              </HStack>
            </>
          )}
          
          <Text textAlign="center" color="green.100">
            {stats.total > 0 ? 'Import new transaction data' : 'Import your transaction data to get started'}
          </Text>
          
          <Box w="100%">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};