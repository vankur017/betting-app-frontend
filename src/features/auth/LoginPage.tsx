import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/http';
import { useAuth } from '../../auth/auth-context';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { messageOf } from '../../lib/errors';
import { safeRedirectPath } from '../../lib/navigation';
import { AuthCard } from './AuthCard';
import { validateLogin, type FieldErrors } from './validation';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirectPath((location.state as { from?: unknown } | null)?.from);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = { email: email.trim(), password };
    const clientErrors = validateLogin(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // Same message for unknown email and wrong password, so accounts cannot be probed.
      setFormError(
        error instanceof ApiError && error.status === 401
          ? 'Email or password is incorrect.'
          : messageOf(error, 'Sign in failed. Please try again.'),
      );
      setErrors(error instanceof ApiError ? error.fieldErrors : {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Your virtual coins are waiting.">
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} fullWidth>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-night-300">
        New here?{' '}
        <Link to="/register" className="font-semibold text-mint-300 hover:text-mint-400">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
