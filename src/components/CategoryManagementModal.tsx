import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Heading,
  Text,
  Flex,
  Button,
  Input,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  useToast,
} from '@chakra-ui/react';
import { useState, useCallback } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import type { Category, CategoryType } from '../types/transaction';
import { saveCategories } from '../utils/storage';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export const CategoryManagementModal = ({ 
  isOpen, 
  onClose, 
  categories,
  setCategories,
}: CategoryManagementModalProps) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const newCategoryType: CategoryType = selectedTabIndex === 0 ? 'INCOME' : 'EXPENSE';
  const toast = useToast();

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
  }, [newCategoryName, newCategoryType, setCategories, toast]);

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
  }, [setCategories, toast]);

  return (
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
          <Tabs 
            variant="unstyled" 
            index={selectedTabIndex} 
            onChange={setSelectedTabIndex}
          >
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
                      onClick={handleSaveCategory}
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
                      onClick={handleSaveCategory}
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
  );
}; 