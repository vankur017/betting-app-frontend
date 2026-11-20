import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { env } from '../../config/env';
import { messageOf } from '../../lib/errors';
import { formatDateTime, humanize } from '../../lib/format';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      setError(messageOf(err, 'Sign out failed. Please try again.'));
      setSigningOut(false);
    }
  }

  const rows: Array<[string, string]> = [
    ['Username', user.username],
    ['Email', user.email],
    ['Role', humanize(user.role)],
    ['Account status', humanize(user.status)],
    ['Member since', formatDateTime(user.createdAt)],
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Profile" description="Your account details." />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <dl className="divide-y divide-white/5 panel">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:justify-between">
            <dt className="text-sm text-night-300">{label}</dt>
            <dd className="text-sm font-medium break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {env.authEnabled ? (
        <div>
          <Button variant="secondary" loading={signingOut} onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
