import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';

interface StakeControlsProps {
  value: string;
  onChange: (value: string) => void;
  onAdjust: (change: 'half' | 'double') => void;
  disabled: boolean;
  error?: string;
  hint?: string;
}

/** Stake field with halve and double buttons. The page checks limits and balance. */
export function StakeControls({
  value,
  onChange,
  onAdjust,
  disabled,
  error,
  hint,
}: StakeControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Stake (VC)"
        name="stake"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        error={error}
        hint={hint}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          aria-label="Halve stake"
          onClick={() => onAdjust('half')}
          disabled={disabled}
        >
          ½
        </Button>
        <Button
          variant="secondary"
          aria-label="Double stake"
          onClick={() => onAdjust('double')}
          disabled={disabled}
        >
          2×
        </Button>
      </div>
    </div>
  );
}
