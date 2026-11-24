"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { el } from "@/lib/i18n/el";
import { athensDate, athensDatePlus, TZ } from "@/lib/athens";
import { fmtEur, fmtTime } from "@/lib/format";
import type { TimelineSearchHit } from "@/server/domain/types";
import { TYPED_REQUEST_DEBOUNCE_MS } from "@/lib/constants";
import {
  buildDashboardReturnHref,
  hitKey,
  dashboardFilterDates,
  loadTimelineSearchRestore,
  readInitialTimelineSearchBootstrap,
  readListScrollTop,
  replaceDashboardTimelineParams,
  TIMELINE_SEARCH_SESSION_KEY,
  timelineSearchFromSearchParams,
  timelineSearchListScrollId,
  writeTimelineSearchSnapshot,
  type TimelineSearchSnapshot,
} from "@/lib/timeline-search-return";
import { Icon } from "./icons";
import { InputClearButton } from "./input-clear";
import { Modal } from "./modal";
import { TimelineSearchDetailModal } from "./timeline-search-detail-modal";

type PageJson = { rows: TimelineSearchHit[]; page: number; pageSize: number; totalCount: number; error?: string };

const IMAGE_ICON: Record<string, { bubble: string; icon: (p: { size?: number }) => ReactNode }> = {
  "1": { bubble: "bg-violet-100 text-violet-700", icon: Icon.inbox },
  "2": { bubble: "bg-brand-100 text-brand-700", icon: Icon.file },
  "3": { bubble: "bg-amber-100 text-amber-700", icon: Icon.trending },
  "4": { bubble: "bg-slate-100 text-slate-700", icon: Icon.file },
  "5": { bubble: "bg-emerald-100 text-emerald-700", icon: Icon.briefcase },
};

const CRM_ICON = { bubble: "bg-sky-100 text-sky-700", icon: Icon.calendar };

const dayFmt = new Intl.DateTimeFormat("el-GR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

function dayLabel(day: string, sample: string): string {
  if (day === athensDatePlus(0)) return el.timeline.today;
  if (day === athensDatePlus(-1)) return el.timeline.yesterday;
  return dayFmt.format(new Date(sample));
}

function rowIcon(hit: TimelineSearchHit) {
  if (hit.unit === "crm") return CRM_ICON;
  return IMAGE_ICON[hit.image ?? "4"] ?? IMAGE_ICON["4"];
}

function RemarksPreview({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const short = text.length > 160 && !open;
  return (
    <p className="mt-1 text-xs text-[var(--muted)] whitespace-pre-line">
      {short ? `${text.slice(0, 160)}… ` : text}
      {short && (
        <button type="button" className="font-semibold text-brand-700 underline" onClick={() => setOpen(true)}>
          {el.timelineSearch.more}
        </button>
      )}
    </p>
  );
}

function groupByDay(rows: TimelineSearchHit[]) {
  const out: Array<{ day: string; items: TimelineSearchHit[] }> = [];
  for (const hit of rows) {
    const day = athensDate(new Date(hit.at));
    const last = out[out.length - 1];
    if (last?.day === day) last.items.push(hit);
    else out.push({ day, items: [hit] });
  }
  return out;
}

function TimelineSearchResults({
  days,
  hasMore,
  loadingMore,
  onSelect,
  onLoadMore,
}: {
  days: Array<{ day: string; items: TimelineSearchHit[] }>;
  hasMore: boolean;
  loadingMore: boolean;
  onSelect: (hit: TimelineSearchHit) => void;
  onLoadMore: () => void;
}) {
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = document.getElementById("timeline-search-sentinel");
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "120px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, onLoadMore]);

  if (days.length === 0) {
    return <p className="text-sm text-center text-[var(--muted)] py-8">{el.timelineSearch.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map(({ day, items }) => (
        <div key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{dayLabel(day, items[0].at)}</h3>
          <ul className="flex flex-col gap-2">
            {items.map((hit) => {
              const ic = rowIcon(hit);
              return (
                <li key={`${hit.unit}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(hit)}
                    className="w-full text-left rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 hover:bg-brand-50/50 flex gap-3 items-start"
                  >
                    <span className={`grid shrink-0 size-10 place-items-center rounded-full ${ic.bubble}`}>{ic.icon({ size: 18 })}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold truncate">{hit.trdrName ?? hit.trdrCode ?? hit.trdr}</span>
                        <span className="text-xs text-[var(--muted)] tabular-nums">{fmtTime(hit.at)}</span>
                      </span>
                      <span className="block text-sm text-brand-800">
                        {[hit.category ?? hit.typeName, hit.code].filter(Boolean).join(" · ")}
                      </span>
                      {hit.prjcName && <span className="block text-xs text-[var(--muted)] truncate">{hit.prjcName}</span>}
                      {hit.docTotal !== undefined && (
                        <span className="block text-sm font-semibold tabular-nums text-slate-800">{fmtEur(hit.docTotal, true)}</span>
                      )}
                      {hit.remarks && <RemarksPreview text={hit.remarks} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {hasMore && (
        <div id="timeline-search-sentinel" className="flex justify-center py-2">
          <button type="button" className="btn-secondary text-sm" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? el.app.loading : el.timelineSearch.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

function resolveDetailHit(rows: TimelineSearchHit[], detailKey: string | null): TimelineSearchHit | null {
  if (!detailKey || rows.length === 0) return null;
  return rows.find((r) => hitKey(r) === detailKey) ?? null;
}

export function TimelineSearch({ filterFrom, filterTo }: { filterFrom: string; filterTo: string }) {
  const searchParams = useSearchParams();
  const filterFallback = useMemo(() => ({ dateFrom: filterFrom, dateTo: filterTo }), [filterFrom, filterTo]);
  const dates = useMemo(
    () => dashboardFilterDates(searchParams, filterFallback),
    [searchParams, filterFallback],
  );
  const { dateFrom, dateTo } = dates;
  const boot = useMemo(() => readInitialTimelineSearchBootstrap(filterFallback), [filterFallback]);
  const bootSnap = boot.snap;

  const [q1, setQ1] = useState(bootSnap?.q1 ?? "");
  const [q2, setQ2] = useState(bootSnap?.q2 ?? "");
  const [rows, setRows] = useState<TimelineSearchHit[]>(bootSnap?.rows ?? []);
  const [page, setPage] = useState(bootSnap?.page ?? 1);
  const [totalCount, setTotalCount] = useState(bootSnap?.totalCount ?? 0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(bootSnap?.listOpen ?? false);
  const [searched, setSearched] = useState(bootSnap?.searched ?? false);
  const [detailHit, setDetailHit] = useState<TimelineSearchHit | null>(() =>
    bootSnap ? resolveDetailHit(bootSnap.rows, bootSnap.detailKey) : null,
  );
  const seq = useRef(0);
  /** skip one fetch when rows were restored from session for the same filters */
  const restoredFetch = useRef<string | null>(
    bootSnap && bootSnap.rows.length > 0 ? `${bootSnap.q1.trim()}|${bootSnap.q2.trim()}|${dateFrom}|${dateTo}` : null,
  );
  const pendingListScroll = useRef<number | null>(bootSnap && bootSnap.listScroll > 0 ? bootSnap.listScroll : null);
  const urlSyncReady = useRef(!!bootSnap);
  const skipInitialRestore = useRef(!!bootSnap);
  const appliedUrlSig = useRef<string | null>(null);
  const urlRestoreSig = useMemo(() => {
    const f = timelineSearchFromSearchParams(searchParams);
    if (!f) return "";
    return `${f.q1}|${f.q2}|${f.hasList ? (f.listOpen ? "1" : "0") : "-"}|${f.hasDetail ? f.detailKey : "-"}`;
  }, [searchParams]);

  const filters = useMemo(() => ({ q1: q1.trim(), q2: q2.trim() }), [q1, q2]);
  const active = filters.q1.length >= 2 || filters.q2.length >= 2;

  const searchSig = useCallback(
    (q1v: string, q2v: string) => `${q1v.trim()}|${q2v.trim()}|${dateFrom}|${dateTo}`,
    [dateFrom, dateTo],
  );

  const applyRestore = useCallback((snap: TimelineSearchSnapshot) => {
    const sig = searchSig(snap.q1, snap.q2);
    setQ1(snap.q1);
    setQ2(snap.q2);
    if (snap.rows.length > 0) {
      restoredFetch.current = sig;
      setRows(snap.rows);
      setPage(snap.page);
      setTotalCount(snap.totalCount);
      setSearched(snap.searched);
    }
    setListOpen(!!snap.listOpen);
    if (snap.listScroll > 0) pendingListScroll.current = snap.listScroll;
    setDetailHit(resolveDetailHit(snap.rows, snap.detailKey));
  }, [searchSig]);

  useEffect(() => {
    if (skipInitialRestore.current) {
      skipInitialRestore.current = false;
      appliedUrlSig.current = urlRestoreSig;
      urlSyncReady.current = true;
      return;
    }
    if (!urlRestoreSig) {
      appliedUrlSig.current = "";
      urlSyncReady.current = true;
      return;
    }
    if (appliedUrlSig.current === urlRestoreSig) return;
    appliedUrlSig.current = urlRestoreSig;
    const snap = loadTimelineSearchRestore(timelineSearchFromSearchParams(searchParams), filterFallback);
    if (snap) applyRestore(snap);
    urlSyncReady.current = true;
  }, [urlRestoreSig, searchParams, applyRestore, filterFallback]);

  const buildSnapshot = useCallback(
    (opts?: Partial<Pick<TimelineSearchSnapshot, "listScroll">>): TimelineSearchSnapshot => ({
      q1,
      q2,
      dateFrom,
      dateTo,
      rows,
      page,
      totalCount,
      searched,
      listOpen: listOpen || !!detailHit,
      detailKey: detailHit ? hitKey(detailHit) : null,
      listScroll: opts?.listScroll ?? readListScrollTop(),
    }),
    [q1, q2, dateFrom, dateTo, rows, page, totalCount, searched, listOpen, detailHit],
  );

  useEffect(() => {
    if (!urlSyncReady.current) return;
    if (!filters.q1 && !filters.q2 && !listOpen && !detailHit) {
      try {
        sessionStorage.removeItem(TIMELINE_SEARCH_SESSION_KEY);
      } catch {
        /* private mode etc. */
      }
      return;
    }
    writeTimelineSearchSnapshot(buildSnapshot());
  }, [buildSnapshot, filters.q1, filters.q2, listOpen, detailHit]);

  useEffect(() => {
    if (!urlSyncReady.current) return;
    replaceDashboardTimelineParams({
      q1,
      q2,
      listOpen: active && listOpen,
      detailKey: active && detailHit ? hitKey(detailHit) : null,
    });
  }, [q1, q2, listOpen, detailHit, active]);

  useEffect(() => {
    if (!listOpen || pendingListScroll.current == null) return;
    const node = document.getElementById(timelineSearchListScrollId);
    if (!node) return;
    node.scrollTop = pendingListScroll.current;
    pendingListScroll.current = null;
  }, [listOpen, rows]);

  const getDashboardBackHref = useCallback(() => {
    const snapshot = buildSnapshot();
    writeTimelineSearchSnapshot(snapshot);
    return buildDashboardReturnHref(snapshot);
  }, [buildSnapshot]);

  const datesKey = `${dateFrom}|${dateTo}`;
  const lastDatesKey = useRef(datesKey);
  useEffect(() => {
    if (lastDatesKey.current === datesKey) return;
    lastDatesKey.current = datesKey;
    restoredFetch.current = null;
  }, [datesKey]);

  const hasMore = active && rows.length < totalCount;
  const days = useMemo(() => groupByDay(rows), [rows]);

  const fetchPage = useCallback(
    async (pageNum: number, signal: AbortSignal) => {
      const p = new URLSearchParams();
      if (filters.q1) p.set("q1", filters.q1);
      if (filters.q2) p.set("q2", filters.q2);
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo) p.set("dateTo", dateTo);
      p.set("page", String(pageNum));
      const res = await fetch(`/api/timeline/search?${p}`, { signal, cache: "no-store" });
      const json = (await res.json()) as PageJson;
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    [filters.q1, filters.q2, dateFrom, dateTo],
  );

  useEffect(() => {
    if (!active) {
      setRows([]);
      setTotalCount(0);
      setPage(1);
      setError(null);
      setBusy(false);
      setListOpen(false);
      setSearched(false);
      setDetailHit(null);
      restoredFetch.current = null;
      return;
    }
    const sig = searchSig(filters.q1, filters.q2);
    if (restoredFetch.current === sig) {
      restoredFetch.current = null;
      setSearched(true);
      setBusy(false);
      return;
    }
    setSearched(false);
    setPage(1);
    const mine = ++seq.current;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const json = await fetchPage(1, ctrl.signal);
        if (mine !== seq.current) return;
        setRows(json.rows);
        setTotalCount(json.totalCount);
        setPage(json.page);
      } catch (e) {
        if ((e as Error).name !== "AbortError" && mine === seq.current) setError(String(e));
      } finally {
        if (mine === seq.current) {
          setBusy(false);
          setSearched(true);
        }
      }
    }, TYPED_REQUEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [active, fetchPage, searchSig, filters.q1, filters.q2, dateFrom, dateTo]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void (async () => {
      setLoadingMore(true);
      try {
        const nextPage = page + 1;
        const json = await fetchPage(nextPage, new AbortController().signal);
        setRows((prev) => [...prev, ...json.rows]);
        setPage(json.page);
        setTotalCount(json.totalCount);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [fetchPage, hasMore, loadingMore, page]);

  const openList = () => {
    if (active && !busy) setListOpen(true);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      openList();
    }
  };

  const showResultsBar = active && (busy || error || searched);

  return (
    <section className="card p-4 flex flex-col gap-3" aria-labelledby="timeline-search-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="timeline-search-heading" className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] min-w-0">
          {el.timelineSearch.title}
        </h2>
        {showResultsBar && !busy && totalCount > 0 && (
          <button
            type="button"
            className="btn-primary text-sm shrink-0 hidden sm:inline-flex items-center justify-center gap-2 min-h-11"
            onClick={() => setListOpen(true)}
          >
            <span>{el.timelineSearch.viewResults}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">{totalCount}</span>
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="label">{el.timelineSearch.q1Label}</span>
          <div className="relative">
            <Icon.search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              onKeyDown={onSearchKey}
              className="input pl-10 pr-10 min-h-11"
              placeholder={el.timelineSearch.q1Placeholder}
              autoComplete="off"
            />
            {busy && q1 && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" aria-hidden />
            )}
            {!busy && q1 && <InputClearButton onClick={() => setQ1("")} />}
          </div>
        </label>
        <label className="block">
          <span className="label">{el.timelineSearch.q2Label}</span>
          <div className="relative">
            <Icon.search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              onKeyDown={onSearchKey}
              className="input pl-10 pr-10 min-h-11"
              placeholder={el.timelineSearch.q2Placeholder}
              autoComplete="off"
            />
            {busy && q2 && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" aria-hidden />
            )}
            {!busy && q2 && <InputClearButton onClick={() => setQ2("")} />}
          </div>
        </label>
      </div>

      {showResultsBar && !busy && (error || searched) && (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {!error && totalCount === 0 && <span className="text-[var(--muted)]">{el.timelineSearch.empty}</span>}
          {!error && totalCount > 0 && (
            <button
              type="button"
              className="btn-primary w-full min-h-12 justify-center gap-2 sm:hidden"
              onClick={() => setListOpen(true)}
            >
              <span>{el.timelineSearch.viewResultsShort}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">{totalCount}</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border px-3 py-2 text-sm bg-red-50 text-red-800 border-red-200">
          <span className="font-semibold">{el.app.error}</span>
          <pre className="mt-1 whitespace-pre-wrap text-xs font-mono">{error}</pre>
        </div>
      )}

      <Modal open={listOpen} onClose={() => setListOpen(false)} title={el.timelineSearch.resultsTitle} width="44rem">
        <div id={timelineSearchListScrollId} className="overflow-y-auto px-5 pb-6 pt-1 max-h-[min(75dvh,720px)]">
          {busy && rows.length === 0 ? (
            <p className="text-sm text-center text-[var(--muted)] py-8" aria-busy>
              {el.app.loading}
            </p>
          ) : (
            <TimelineSearchResults days={days} hasMore={hasMore} loadingMore={loadingMore} onSelect={setDetailHit} onLoadMore={loadMore} />
          )}
        </div>
      </Modal>

      <TimelineSearchDetailModal
        hit={detailHit}
        open={!!detailHit}
        onClose={() => setDetailHit(null)}
        getDashboardBackHref={getDashboardBackHref}
      />
    </section>
  );
}