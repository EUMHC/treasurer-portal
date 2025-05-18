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
  Box,
  HStack,
  Icon,
  Radio,
  RadioGroup,
  Button,
  ModalFooter,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiFileText, FiDownload } from 'react-icons/fi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal = ({ isOpen, onClose }: ExportModalProps) => {
  const [exportFormat, setExportFormat] = useState<'spreadsheet' | 'backup'>('spreadsheet');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            colorScheme="green" 
            onClick={() => {
              window.exportHandler?.handleExport(exportFormat);
              onClose();
            }}
            leftIcon={<Icon as={exportFormat === 'spreadsheet' ? FiFileText : FiDownload} />}
          >
            Export
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 