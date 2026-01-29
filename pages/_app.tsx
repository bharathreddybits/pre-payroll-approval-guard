import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

function PrePayrollApprovalGuard({ Component, pageProps }: AppProps) {
  return (
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
    </AuthProvider>
  );
}

export default PrePayrollApprovalGuard;
