import { 
  Box, 
  Flex, 
  Link, 
  Text, 
  Container, 
  Button, 
  ButtonGroup,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { FiLogOut, FiDownload, FiTrash2 } from 'react-icons/fi';
import { useRef, type RefObject } from 'react';
import type { FocusableElement } from '@chakra-ui/utils';
import { clearMappings } from '../utils/transactionMappings';

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    isOpen: isExitOpen, 
    onOpen: onExitOpen, 
    onClose: onExitClose 
  } = useDisclosure();
  const {
    isOpen: isClearOpen,
    onOpen: onClearOpen,
    onClose: onClearClose
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        as={RouterLink}
        to={to}
        px={4}
        py={2}
        fontWeight="medium"
        color={isActive ? 'white' : 'green.100'}
        borderBottom="2px solid"
        borderColor={isActive ? 'white' : 'transparent'}
        _hover={{
          color: 'white',
          borderColor: 'green.100'
        }}
        transition="all 0.2s"
      >
        {children}
      </Link>
    );
  };

  const handleExit = () => {
    navigate('/treasurer-portal');
  };

  const handleClearCache = () => {
    // Clear all localStorage data
    localStorage.clear();
    clearMappings();
    onClearClose();
    
    toast({
      title: "Cache Cleared",
      description: "All stored mappings, categories, and settings have been cleared.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    // Reload the page to reflect cleared data
    window.location.reload();
  };

  return (
    <>
      <Box 
        as="nav" 
        bg="green.800" 
        position="sticky"
        top={0}
        zIndex={10}
        shadow="lg"
        width="100vw"
      >
        <Container maxW="100%" px={6}>
          <Flex py={4} align="center" justify="space-between" gap={8}>
            {/* Left section - Logo */}
            <Flex align="center" gap={4}>
              <img src="/treasurer-portal/logo.png" alt="EUMHC Logo" style={{ height: '32px' }} />
              <Text 
                fontSize="lg" 
                fontWeight="bold" 
                color="white"
                minW="fit-content"
              >
                EUMHC Treasurer
              </Text>
            </Flex>

            {/* Center section - Navigation */}
            <Flex gap={8} justify="center" flex={1}>
              <NavLink to="/treasurer-portal/transactions">Transactions</NavLink>
              <NavLink to="/treasurer-portal/yearly-summary">Yearly Summary</NavLink>
              <NavLink to="/treasurer-portal/budget-summary">Budget Summary</NavLink>
            </Flex>

            {/* Right section - Actions */}
            <Flex align="center" minW="fit-content">
              <ButtonGroup spacing={3}>
                <Button
                  leftIcon={<FiDownload />}
                  onClick={() => window.exportHandler?.openExportModal()}
                  colorScheme="green"
                  variant="solid"
                  size="md"
                  bg="green.600"
                  _hover={{ bg: 'green.500' }}
                >
                  Export
                </Button>
                <Button
                  leftIcon={<FiTrash2 />}
                  colorScheme="red"
                  variant="outline"
                  size="md"
                  color="red.200"
                  borderColor="red.200"
                  _hover={{ bg: 'red.900' }}
                  onClick={onClearOpen}
                >
                  Clear Cache
                </Button>
                <Button
                  leftIcon={<FiLogOut />}
                  colorScheme="green"
                  variant="outline"
                  size="md"
                  color="white"
                  borderColor="green.600"
                  _hover={{ bg: 'green.700' }}
                  onClick={onExitOpen}
                >
                  Exit
                </Button>
              </ButtonGroup>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Exit Confirmation Dialog */}
      <AlertDialog
        isOpen={isExitOpen}
        leastDestructiveRef={cancelRef as RefObject<FocusableElement>}
        onClose={onExitClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" bg="green.900" color="white" borderTopRadius="md">
              Confirm Exit
            </AlertDialogHeader>

            <AlertDialogBody pt={4}>
              Are you sure you want to exit? Any unsaved changes to budgets or categories will be lost.
            </AlertDialogBody>

            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={onExitClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => {
                  onExitClose();
                  handleExit();
                }}
              >
                Exit
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Clear Cache Confirmation Dialog */}
      <AlertDialog
        isOpen={isClearOpen}
        leastDestructiveRef={cancelRef as RefObject<FocusableElement>}
        onClose={onClearClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" bg="red.700" color="white" borderTopRadius="md">
              Clear Cache
            </AlertDialogHeader>

            <AlertDialogBody pt={4}>
              <Text mb={4}>
                This will clear all stored data, including:
              </Text>
              <Text as="ul" pl={4}>
                <Text as="li">• All transaction name/reference customizations</Text>
                <Text as="li">• All category assignments</Text>
                <Text as="li">• All custom categories</Text>
                <Text as="li">• All other settings</Text>
              </Text>
              <Text mt={4} fontWeight="bold" color="red.600">
                This action cannot be undone.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={onClearClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleClearCache}
              >
                Clear Cache
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}; 