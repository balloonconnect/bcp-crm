"use client";

import { Search } from "lucide-react";

/** The visible search entry point in the toolbar — dispatches the same open event the global `CommandMenu` (mounted once in the root layout) listens for, so there's exactly one modal instance regardless of how many places in the UI can trigger it. */
export function SearchTriggerButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-menu"))}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
    </button>
  );
}
