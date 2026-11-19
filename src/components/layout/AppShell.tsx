import { Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Alert } from '../ui/Alert';
import { Footer } from './Footer';
import { Header } from './Header';

export function AppShell() {
  const { status, error } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-mint-500 focus:px-4 focus:py-2 focus:text-night-950"
      >
        Skip to content
      </a>
      <Header />
      {status === 'error' ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
          <Alert tone="warning" title="Server unavailable">
            {error}
          </Alert>
        </div>
      ) : null}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
