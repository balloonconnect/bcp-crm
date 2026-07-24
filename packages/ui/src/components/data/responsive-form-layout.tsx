import * as React from "react";
import { cn } from "../../lib/cn";

export interface ResponsiveFormSection {
  id: string;
  title?: string;
  description?: string;
  /** Number of fields per row at `md`+. Stays 1 column below `md` regardless. */
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}

export interface ResponsiveFormLayoutProps {
  sections: ResponsiveFormSection[];
  className?: string;
}

const columnClass: Record<NonNullable<ResponsiveFormSection["columns"]>, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

/**
 * Every section is always a single column below `md` (768px) — form fields
 * never sit side by side on a phone, where that forces cramped inputs and
 * horizontal reflow. At `md`+, sections opt into 2 or 3 columns.
 */
export function ResponsiveFormLayout({ sections, className }: ResponsiveFormLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={section.title ? `${section.id}-title` : undefined}>
          {(section.title || section.description) && (
            <div className="mb-4">
              {section.title && (
                <h2 id={`${section.id}-title`} className="text-sm font-semibold">
                  {section.title}
                </h2>
              )}
              {section.description && (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
          )}
          <div className={cn("grid grid-cols-1 gap-4 sm:gap-5", columnClass[section.columns ?? 1])}>
            {section.children}
          </div>
        </section>
      ))}
    </div>
  );
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  /** Span every column in the current row — for a full-width textarea, e.g. */
  fullWidth?: boolean;
}

/** Paired with ResponsiveFormLayout: a label + control + error/hint, consistently spaced. */
export function FormField({ label, htmlFor, required, error, hint, children, fullWidth }: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "sm:col-span-full")}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<{
              id?: string;
              "aria-describedby"?: string;
              "aria-invalid"?: boolean;
              "aria-required"?: boolean;
            }>,
            {
              id: htmlFor,
              "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
              "aria-invalid": Boolean(error) || undefined,
              "aria-required": required || undefined,
            },
          )
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
