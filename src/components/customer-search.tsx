"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { el } from "@/lib/i18n/el";
import { Icon } from "./icons";
import { LAST_SEARCH_COOKIE } from "@/lib/constants";

interface Row {
  id: string;
  name: string;
  mobile: string;
  address: string;
  afm: string;
}

/**
 * One search box that queries /api/customers/search while the user types (400 ms after the last key).
 * Enter still submits to /customers/results for a full page / deep link.
 */
const CACHE_KEY = "de-crm.search";

/** last answer, kept per tab so «Πίσω» shows it instantly instead of asking SoftOne again */
function readCache(): { q: string; rows: Row[] } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as { q: string; rows: Row[] }) : null;
  } catch {
    return null;
  }
}
function writeCache(q: string, rows: Row[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ q, rows }));
  } catch {
    /* private mode etc. */
  }
}

export function CustomerSearch({ initialQ = "" }: { initialQ?: string }) {
  const [q, setQ] = useState(initialQ);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  // term whose answer is already on screen (from the cache) – no request for it
  const served = useRef<string | null>(null);

  useEffect(() => {
    const term = initialQ.trim();
    if (term.length < 2) return;
    const cached = readCache();
    if (cached && cached.q === term) {
      served.current = term;
      setRows(cached.rows);
    }
  }, [initialQ]);

  // the term lives in the URL (?q=) and a cookie so «Πίσω» from a customer lands on the same list
  useEffect(() => {
    const term = q.trim();
    const url = term ? `/customers?q=${encodeURIComponent(term)}` : "/customers";
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, "", url);
    document.cookie = `${LAST_SEARCH_COOKIE}=${encodeURIComponent(term)}; path=/; max-age=86400; samesite=lax`;
  }, [q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRows(null);
      setError(null);
      setBusy(false);
      return;
    }
    if (served.current === term) return; // already answered (restored from the cache)
    served.current = null;
    const mine = ++seq.current;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" });
        const json = (await res.json()) as { results?: Row[]; error?: string };
        if (mine !== seq.current) return; // a newer query is in flight
        if (!res.ok || json.error) {
          setError(json.error ?? `HTTP ${res.status}`);
          setRows([]);
        } else {
          setError(null);
          setRows(json.results ?? []);
          writeCache(term, json.results ?? []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError" && mine === seq.current) setError(String(e));
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <form action="/customers/results" method="get" className="card p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--muted)]">{el.customer.searchFields}</p>
        <label className="relative block">
          <span className="sr-only">{el.customer.searchLabel}</span>
          <Icon.search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-11 pr-11 min-h-12 text-lg"
            placeholder={el.customer.searchPlaceholder}
            autoComplete="off"
            autoFocus
            enterKeyHint="search"
          />
          {busy && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" aria-label={el.app.loading} />}
          {!busy && q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost min-h-8 min-w-8 px-0 text-[var(--muted)]" aria-label={el.app.cancel}>
              ✕
            </button>
          )}
        </label>
        <p className="text-xs text-[var(--muted)]">{el.customer.searchHint}</p>
      </form>

      {error && (
        <div className="rounded-xl border px-3 py-2 text-sm bg-red-50 text-red-800 border-red-200">
          <span className="font-semibold">{el.app.error}</span>
          <pre className="mt-1 whitespace-pre-wrap text-xs font-mono">{error}</pre>
        </div>
      )}

      {rows && !error && rows.length === 0 && !busy && (
        <div className="card p-4">
          <p className="text-sm text-[var(--muted)] py-4 text-center">{el.customer.noResults}</p>
          <div className="flex justify-center">
            <Link href="/customers/new" className="btn-primary">
              {el.customer.createNew}
            </Link>
          </div>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => (
            <li key={d.id} className="card p-4 flex flex-col gap-2">
              <div>
                <Link href={`/customers/${d.id}`} className="font-semibold text-brand-800 hover:underline">
                  {d.name}
                </Link>
                <p className="text-sm text-[var(--muted)]">
                  {el.customer.mobile}: {d.mobile || "—"}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {el.customer.address}: {d.address || "—"}
                </p>
                {d.afm && <p className="text-xs text-[var(--muted)]">ΑΦΜ {d.afm}</p>}
              </div>
              <div className="flex gap-2 mt-auto pt-1">
                <Link href={`/customers/${d.id}`} className="btn-primary flex-1">
                  {el.app.open}
                </Link>
                <Link href={`/customers/${d.id}/edit`} className="btn-secondary flex-1">
                  {el.customer.edit}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
