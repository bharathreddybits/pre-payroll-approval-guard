import type { AppProps } from 'next/app';
import '../styles/globals.css';

function PrePayrollApprovalGuard({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default PrePayrollApprovalGuard;
