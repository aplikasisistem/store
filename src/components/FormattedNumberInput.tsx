import React, { useState, useEffect, useRef } from 'react';
import { formatNumberWithDots, parseNumberFromDots } from '../utils/numberFormat';

interface FormattedNumberInputProps {
  value?: number | undefined | null;
  onChange: (val: number) => void;
  allowDecimal?: boolean;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  allowDecimal = false,
  prefix,
  suffix,
  placeholder = '',
  className = '',
  inputClassName = '',
  disabled = false,
  min,
  max,
  autoFocus = false,
  id,
  onKeyDown,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === undefined || value === null || value === 0) return '';
    return formatNumberWithDots(value, allowDecimal);
  });

  const isInternalChangeRef = useRef(false);

  // Sync with external value changes when not triggered by user typing
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (value === undefined || value === null || value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatNumberWithDots(value, allowDecimal));
    }
  }, [value, allowDecimal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    if (!rawInput.trim()) {
      isInternalChangeRef.current = true;
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Filter characters
    let sanitized = '';
    if (allowDecimal) {
      // Allow digits, commas, dots
      sanitized = rawInput.replace(/[^0-9,.]/g, '');
      // If user typed dot as decimal, keep single decimal delimiter
      const commaCount = (sanitized.match(/,/g) || []).length;
      const dotCount = (sanitized.match(/\./g) || []).length;
      
      // If user typed comma or dot at the end, allow it while typing
      const endsWithDecimal = sanitized.endsWith(',') || sanitized.endsWith('.');
      
      const parsed = parseNumberFromDots(sanitized);
      isInternalChangeRef.current = true;

      if (endsWithDecimal && (commaCount + dotCount === 1)) {
        // e.g. "100," or "100."
        const intOnly = sanitized.slice(0, -1).replace(/\D/g, '');
        const formattedInt = intOnly ? Number(intOnly).toLocaleString('id-ID') : '0';
        setDisplayValue(`${formattedInt},`);
      } else {
        setDisplayValue(formatNumberWithDots(sanitized, true));
      }

      let finalNum = parsed;
      if (min !== undefined && finalNum < min) finalNum = min;
      if (max !== undefined && finalNum > max) finalNum = max;
      onChange(finalNum);
      return;
    }

    // Integer only: strip all non-digits
    const cleanDigits = rawInput.replace(/\D/g, '');
    if (!cleanDigits) {
      isInternalChangeRef.current = true;
      setDisplayValue('');
      onChange(0);
      return;
    }

    let pureNumber = Number(cleanDigits);
    if (min !== undefined && pureNumber < min) pureNumber = min;
    if (max !== undefined && pureNumber > max) pureNumber = max;

    isInternalChangeRef.current = true;
    setDisplayValue(formatNumberWithDots(cleanDigits, false));
    onChange(pureNumber);
  };

  return (
    <div className={`relative flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition ${className}`}>
      {prefix && (
        <span className="pl-3 pr-1 text-slate-500 text-xs font-bold select-none shrink-0">
          {prefix}
        </span>
      )}

      <input
        id={id}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full py-2 px-3 bg-transparent text-slate-900 text-xs font-bold focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`}
      />

      {suffix && (
        <span className="pr-3 pl-1 text-slate-500 text-xs font-semibold select-none shrink-0">
          {suffix}
        </span>
      )}
    </div>
  );
};
