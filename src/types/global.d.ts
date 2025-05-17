export {};

declare global {
  interface Window {
    exportToSpreadsheet?: () => Promise<void>;
  }
} 