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
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { FiLogOut, FiDownload } from 'react-icons/fi';
import { useRef, type RefObject } from 'react';
import type { FocusableElement } from '@chakra-ui/utils';

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement | null>(null);

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
    navigate('/');
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
              <NavLink to="/transactions">Transactions</NavLink>
              <NavLink to="/yearly-summary">Yearly Summary</NavLink>
              <NavLink to="/budget-summary">Budget Summary</NavLink>
            </Flex>

            {/* Right section - Exit */}
            <Flex align="center" minW="fit-content">
              <ButtonGroup spacing={3}>
                <Button
                  leftIcon={<FiDownload />}
                  onClick={() => window.exportToSpreadsheet?.()}
                  colorScheme="green"
                  variant="solid"
                  size="md"
                  bg="green.600"
                  _hover={{ bg: 'green.500' }}
                >
                  Export
                </Button>
                <Button
                  leftIcon={<FiLogOut />}
                  colorScheme="green"
                  variant="outline"
                  size="md"
                  color="white"
                  borderColor="green.600"
                  _hover={{ bg: 'green.700' }}
                  onClick={onOpen}
                >
                  Exit
                </Button>
              </ButtonGroup>
            </Flex>
          </Flex>
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
              Confirm Exit
            </AlertDialogHeader>

            <AlertDialogBody pt={4}>
              Are you sure you want to exit? Any unsaved changes to budgets or categories will be lost.
            </AlertDialogBody>

            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => {
                  onClose();
                  handleExit();
                }}
              >
                Exit
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}; 