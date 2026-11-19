import { describe, expect, it } from 'vitest';
import { validateLogin, validateRegistration } from './validation';

const valid = { email: 'player@example.com', username: 'player_1', password: 'long-enough-1', confirmPassword: 'long-enough-1' };

describe('validateRegistration', () => {
  it('accepts valid input', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('flags each invalid field', () => {
    const errors = validateRegistration({ email: 'nope', username: 'a', password: 'short', confirmPassword: 'other' });
    expect(Object.keys(errors).sort()).toEqual(['confirmPassword', 'email', 'password', 'username'].sort());
  });
});

describe('validateLogin', () => {
  it('requires an email and a password', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' })).sort()).toEqual(['email', 'password'].sort());
  });
});
