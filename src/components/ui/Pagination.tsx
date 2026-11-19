import { Button } from './Button';

interface PaginationProps {
  /** Zero-based. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4">
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 0}>
        Previous
      </Button>
      <p className="text-sm text-night-300">
        Page {page + 1} of {totalPages}
      </p>
      <Button
        variant="secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages - 1}
      >
        Next
      </Button>
    </nav>
  );
}
