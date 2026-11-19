import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useAuth } from './auth-context';

export function RequireAuth() {
  const { status, error, refresh } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingState label="Checking your session" />;
  if (status === 'error') {
    return (
      <ErrorState
        message={error ?? 'We could not check your session.'}
        onRetry={() => void refresh()}
      />
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
