import { useEffect } from 'react';
import { ChakraProvider, createStandaloneToast, extendTheme } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { Transactions } from './pages/Transactions';
import { YearlySummary } from './pages/YearlySummary';
import { BudgetSummary } from './pages/BudgetSummary';
import { exportToSpreadsheet } from './utils/spreadsheet';

const queryClient = new QueryClient();
const { ToastContainer } = createStandaloneToast();

// Custom theme with dark green colors
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'white',
        minHeight: '100vh',
        margin: 0,
        padding: 0
      }
    }
  },
  colors: {
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    }
  }
});

const AppContent = () => {
  const location = useLocation();
  const isHome = location.pathname === '/treasurer-portal' || location.pathname === '/treasurer-portal/';

  useEffect(() => {
    window.exportToSpreadsheet = exportToSpreadsheet;
    
    return () => {
      delete window.exportToSpreadsheet;
    };
  }, []);

  return (
    <>
      {isHome ? (
        <Routes>
          <Route path="/treasurer-portal" element={<Home />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/treasurer-portal/transactions" element={<Transactions />} />
          <Route path="/treasurer-portal/yearly-summary" element={<YearlySummary />} />
          <Route path="/treasurer-portal/budget-summary" element={<BudgetSummary />} />
          <Route path="*" element={<Navigate to="/treasurer-portal" replace />} />
        </Routes>
      )}
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Router>
          <AppContent />
        </Router>
        <ToastContainer />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
