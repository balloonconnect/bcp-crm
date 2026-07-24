import * as React from "react";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
}

/**
 * A native `<select>` rather than a custom Radix listbox — deliberately.
 * Native selects get the platform's own mobile picker UI for free
 * (important for this design system's mobile-first mandate) without
 * pulling in another Radix package for what onboarding/CRM forms need:
 * a plain, accessible single-choice dropdown.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
));
Select.displayName = "Select";
