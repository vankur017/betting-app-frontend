import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/http';
import { useAuth } from '../../auth/auth-context';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { messageOf } from '../../lib/errors';
import { AuthCard } from './AuthCard';
import { PW_MIN_LENGTH, validateRegistration, type FieldErrors } from './validation';

export function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const update = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = { ...values, email: values.email.trim(), username: values.username.trim() };
    const clientErrors = validateRegistration(trimmed);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register({ email: trimmed.email, username: trimmed.username, password: trimmed.password });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(messageOf(error, 'Registration failed. Please try again.'));
      setErrors(error instanceof ApiError ? error.fieldErrors : {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="New accounts get a starter balance of virtual coins. Coins have no monetary value."
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <TextField label="Email" type="email" name="email" autoComplete="email" required value={values.email} onChange={update('email')} error={errors.email} />
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          required
          value={values.username}
          onChange={update('username')}
          error={errors.username}
          hint="3–20 letters, numbers, or underscores. Shown to other players."
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint={`At least ${PW_MIN_LENGTH} characters.`}
        />
        <TextField
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={submitting} fullWidth>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-night-300">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-mint-300 hover:text-mint-400">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
