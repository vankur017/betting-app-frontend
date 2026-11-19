// Client checks give fast feedback only. The server re-validates every field.
// Keep these limits in sync with the backend once its rules are final.
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const PW_MIN_LENGTH = 10;
export const PW_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  username: string;
  confirmPassword: string;
}

export function validateLogin(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegistration(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!USERNAME_PATTERN.test(values.username.trim())) {
    errors.username = 'Use 3–20 letters, numbers, or underscores.';
  }
  if (values.password.length < PW_MIN_LENGTH) {
    errors.password = `Use at least ${PW_MIN_LENGTH} characters.`;
  } else if (values.password.length > PW_MAX_LENGTH) {
    errors.password = `Use at most ${PW_MAX_LENGTH} characters.`;
  }
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'The passwords do not match.';
  return errors;
}
