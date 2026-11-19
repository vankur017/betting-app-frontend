import { ApiError } from '../api/http';

export function messageOf(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return error instanceof ApiError ? error.message : fallback;
}
