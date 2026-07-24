import Link from "next/link";
import { Aperture } from "lucide-react";
import type { Route } from "next";
import { FOOTER_NAV, SITE } from "../../lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-soft/20 bg-ink px-4 py-14 text-paper sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-display text-lg">
              <Aperture className="h-5 w-5 text-safelight" aria-hidden="true" />
              {SITE.name}
            </Link>
            <p className="text-sm text-ink-faint">{SITE.description}</p>
          </div>

          {FOOTER_NAV.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-ink-faint">{group.title}</h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href as Route} className="text-sm text-ink-faint transition-colors hover:text-paper">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-ink-soft/20 pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Made for photography studios across India.</p>
        </div>
      </div>
    </footer>
  );
}
