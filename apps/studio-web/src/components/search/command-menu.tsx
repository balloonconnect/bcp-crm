"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, Star, Sparkles, Save } from "lucide-react";
import { apiGet, apiPost, apiFetch } from "../../lib/api-client";

interface SearchResultItem { entityType: string; entityId: string; title: string; subtitle: string | null; score: number; url: string }
interface QuickAction { label: string; entityType: string }
interface SearchResponse { results: SearchResultItem[]; quickActions: QuickAction[] }
interface SavedSearchRecord { id: string; name: string; query: string }

/**
 * "Keyboard shortcut" (Cmd/Ctrl+K) opens this from anywhere in the
 * app; on a narrow viewport it renders full-screen instead of a
 * centered modal — "Mobile full-screen search" as a real breakpoint
 * behavior, not a separate component. Debounced live search doubles
 * as the "Fuzzy search" entry point (tolerant substring matching, per
 * `PostgresSearchProvider`), with recent/saved searches shown when the
 * input is empty and quick actions always available alongside results.
 */
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [quickActions, setQuickActions] = React.useState<QuickAction[]>([]);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [savedSearches, setSavedSearches] = React.useState<SavedSearchRecord[]>([]);
  const [naturalLanguageMode, setNaturalLanguageMode] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-menu", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-menu", handleOpenEvent);
    };
  }, []);

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      void apiGet<string[]>("/search/recent").then((res) => res.ok && res.data && setRecentSearches(res.data));
      void apiGet<SavedSearchRecord[]>("/search/saved").then((res) => res.ok && res.data && setSavedSearches(res.data));
    } else {
      setQuery(""); setResults([]); setNaturalLanguageMode(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]); setQuickActions([]);
      return;
    }
    const timeout = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(q: string) {
    const endpoint = naturalLanguageMode ? "/search/natural-language" : "/search";
    const res = await apiPost<SearchResponse>(endpoint, { query: q });
    if (res.ok && res.data) {
      setResults(res.data.results);
      setQuickActions(res.data.quickActions);
    }
  }

  function handleSelect(url: string) {
    setOpen(false);
    router.push(url as never);
  }

  async function handleSaveSearch() {
    if (!query.trim()) return;
    const name = window.prompt("Name this saved search:", query);
    if (!name) return;
    await apiPost("/search/saved", { name, query });
    const res = await apiGet<SavedSearchRecord[]>("/search/saved");
    if (res.ok && res.data) setSavedSearches(res.data);
  }

  async function handleDeleteSavedSearch(id: string) {
    await apiFetch(`/search/saved/${id}`, { method: "DELETE" });
    const res = await apiGet<SavedSearchRecord[]>("/search/saved");
    if (res.ok && res.data) setSavedSearches(res.data);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-0 sm:p-6 sm:pt-24">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-lg sm:border sm:border-border sm:shadow-lg">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={naturalLanguageMode ? "Ask in plain language…" : "Search leads, clients, events…"}
            className="h-9 flex-1 bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={() => setNaturalLanguageMode((v) => !v)} title="Natural-language search" className={`rounded-md p-1.5 ${naturalLanguageMode ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </button>
          {query && <button type="button" onClick={() => void handleSaveSearch()} title="Save this search" className="rounded-md p-1.5 text-muted-foreground"><Save className="h-4 w-4" aria-hidden="true" /></button>}
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <>
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground"><Clock className="h-3 w-3" aria-hidden="true" />Recent</p>
                  {recentSearches.map((q, i) => (
                    <button key={i} type="button" onClick={() => setQuery(q)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">{q}</button>
                  ))}
                </div>
              )}
              {savedSearches.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground"><Star className="h-3 w-3" aria-hidden="true" />Saved</p>
                  {savedSearches.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      <button type="button" onClick={() => setQuery(s.query)} className="flex-1 text-left">{s.name}</button>
                      <button type="button" onClick={() => void handleDeleteSavedSearch(s.id)} className="text-xs text-muted-foreground">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {quickActions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 px-2">
                  {quickActions.map((a) => <span key={a.entityType} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{a.label}</span>)}
                </div>
              )}
              {results.map((r) => (
                <button key={`${r.entityType}-${r.entityId}`} type="button" onClick={() => handleSelect(r.url)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
                  <span>
                    <span className="font-medium">{r.title}</span>
                    {r.subtitle && <span className="ml-2 text-xs text-muted-foreground">{r.subtitle}</span>}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{r.entityType}</span>
                </button>
              ))}
              {results.length === 0 && <p className="p-3 text-sm text-muted-foreground">No results for &quot;{query}&quot;.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
