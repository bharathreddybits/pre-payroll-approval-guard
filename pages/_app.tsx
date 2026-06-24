import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Userback } from '../components/Userback';
import '../styles/globals.css';

function PrePayrollApprovalGuard({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
          },
        }}
        richColors
        closeButton
      />
        <Userback />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default PrePayrollApprovalGuard;
