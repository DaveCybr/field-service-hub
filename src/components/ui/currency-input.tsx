import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  className?: string;
  error?: string;
  helperText?: string;
  prefix?: string;
  suffix?: string;
  allowNegative?: boolean;
  decimalPlaces?: number;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      label,
      placeholder = "0",
      disabled = false,
      required = false,
      min = 0,
      max,
      className,
      error,
      helperText,
      prefix = "Rp",
      suffix,
      allowNegative = false,
      decimalPlaces = 0,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // Format number to display with thousand separators
    const formatNumber = (num: number): string => {
      if (isNaN(num) || num === 0) return "";

      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(num);
    };

    // Parse formatted string back to number
    const parseNumber = (str: string): number => {
      // Remove all non-numeric characters except decimal point and minus
      const cleaned = str.replace(/[^\d.,-]/g, "");

      // Replace comma with dot for parsing (Indonesian format uses comma for decimals)
      const normalized = cleaned.replace(",", ".");

      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Update display value when value prop changes
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(value));
      }
    }, [value, isFocused, decimalPlaces]);

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number without formatting when focused
      if (value === 0) {
        setDisplayValue("");
      } else {
        setDisplayValue(value.toString());
      }
    };

    const handleBlur = () => {
      setIsFocused(false);

      let numValue = parseNumber(displayValue);

      // Apply constraints
      if (!allowNegative && numValue < 0) {
        numValue = 0;
      }
      if (min !== undefined && numValue < min) {
        numValue = min;
      }
      if (max !== undefined && numValue > max) {
        numValue = max;
      }

      onValueChange(numValue);
      setDisplayValue(formatNumber(numValue));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (isFocused) {
        // Allow typing numbers, decimal point, and minus (if allowed)
        const allowedChars = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

        if (allowedChars.test(inputValue) || inputValue === "") {
          setDisplayValue(inputValue);
        }
      } else {
        setDisplayValue(inputValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, decimal point
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        ".",
        ",",
      ];

      // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
      if (
        allowedKeys.includes(e.key) ||
        (e.key === "a" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "c" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "v" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "x" && (e.ctrlKey || e.metaKey)) ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        return;
      }

      // Allow minus only at the start and if negative is allowed
      if (e.key === "-" && allowNegative && displayValue === "") {
        return;
      }

      // Ensure that it's a number
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {prefix}
            </div>
          )}

          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              prefix && "pl-12",
              suffix && "pr-12",
              error && "border-destructive focus-visible:ring-destructive",
              "text-right font-mono"
            )}
          />

          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {suffix}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
