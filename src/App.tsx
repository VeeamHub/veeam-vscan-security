import { useEffect, useRef } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
  Navigate
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/error/ErrorBoundary';
import { Toaster } from "@/components/ui/toaster";
import { VScanProvider, useVScan } from '@/store/vscan-context';
import { SSHProvider, useSSH } from '@/store/SSHContext';
import { queryClient } from '@/lib/query-client';

import Dashboard from './pages/dashboard';
import Scans from './pages/scans';
import Vulnerabilities from './pages/vulnerabilities';
import Settings from './pages/settings';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true
};

function ConnectionManager() {
  const { refreshStatus } = useVScan();
  const { checkSavedConnection } = useSSH();
  const checkTimeoutRef = useRef<number>();
  const initialized = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let isChecking = false;

    const checkConnections = async () => {
      if (!isMounted || isChecking) return;
      
      try {
        isChecking = true;
        await refreshStatus();
        
        if (!initialized.current) {
          await checkSavedConnection();
          initialized.current = true;
        }

      } catch (error) {
        console.error('Error checking connections:', error);
      } finally {
        isChecking = false;
        if (isMounted) {
          checkTimeoutRef.current = window.setTimeout(checkConnections, 30000);
        }
      }
    };
    
    const initialTimeout = setTimeout(checkConnections, 1000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [refreshStatus, checkSavedConnection]);

  return null;
}
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={<Layout />}
      errorElement={<ErrorBoundary />}
    >
      <Route errorElement={<ErrorBoundary />}>
        <Route index element={<Dashboard />} />
        <Route path="scans" element={<Scans />} />
        <Route path="vulnerabilities" element={<Vulnerabilities />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Route>
  ),
  {
    future: routerFutureFlags
  }
);

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <VScanProvider>
        <SSHProvider>
          <ConnectionManager />
          {children}
          <Toaster />
        </SSHProvider>
      </VScanProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}