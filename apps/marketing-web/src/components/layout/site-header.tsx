"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, Aperture } from "lucide-react";
import type { Route } from "next";
import { Button, cn } from "@bcp/ui";
import { PRIMARY_NAV } from "../../lib/content";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-soft/20 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg text-paper" onClick={() => setMobileOpen(false)}>
          <Aperture className="h-5 w-5 text-safelight" aria-hidden="true" />
          BCP Studio OS
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {PRIMARY_NAV.map((link) => (
            <Link key={link.href} href={link.href as Route} className="text-sm text-ink-faint transition-colors hover:text-paper">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" className="text-paper hover:bg-charcoal hover:text-paper">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="bg-safelight text-ink hover:bg-safelight/90">
            <Link href="/book-demo">Book a demo</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center text-paper lg:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      <div className={cn("overflow-hidden border-t border-ink-soft/20 bg-ink transition-[max-height] duration-300 lg:hidden", mobileOpen ? "max-h-[28rem]" : "max-h-0 border-t-0")}>
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-4">
          {PRIMARY_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-touch-target items-center rounded-md px-2 text-sm text-ink-faint hover:bg-charcoal hover:text-paper"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-ink-soft/20 pt-4">
            <Button asChild variant="outline" className="border-ink-soft/40 text-paper hover:bg-charcoal">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Log in
              </Link>
            </Button>
            <Button asChild className="bg-safelight text-ink hover:bg-safelight/90">
              <Link href="/book-demo" onClick={() => setMobileOpen(false)}>
                Book a demo
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
