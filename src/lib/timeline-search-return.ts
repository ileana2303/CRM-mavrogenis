import type { TimelineSearchHit } from "@/server/domain/types";

export const TIMELINE_SEARCH_SESSION_KEY = "de-crm.timeline-search";
const LIST_SCROLL_ID = "timeline-search-list-scroll";

export type TimelineSearchSnapshot = {
  q1: string;
  q2: string;
  /** Dashboard Φίλτρα `from` / `to` (YYYY-MM-DD) when the list was loaded */
  dateFrom: string;
  dateTo: string;
  rows: TimelineSearchHit[];
  page: number;
  totalCount: number;
  searched: boolean;
  listOpen: boolean;
  detailKey: string | null;
  listScroll: number;
};

export type DashboardFilterDates = { dateFrom: string; dateTo: string };

/** URL `from`/`to`, else dashboard Φίλτρα defaults passed from the server (today → +7d). */
export function dashboardFilterDates(
  search?: URLSearchParams | Pick<URLSearchParams, "get">,
  fallback?: DashboardFilterDates,
): DashboardFilterDates {
  const p =
    search ??
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams());
  const urlFrom = (p.get("from") ?? "").trim();
  const urlTo = (p.get("to") ?? "").trim();
  return {
    dateFrom: urlFrom || (fallback?.dateFrom ?? ""),
    dateTo: urlTo || (fallback?.dateTo ?? ""),
  };
}

export function hitKey(hit: TimelineSearchHit): string {
  return `${hit.unit}-${hit.id}`;
}

function readStore(): TimelineSearchSnapshot | null {
  try {
    const raw = sessionStorage.getItem(TIMELINE_SEARCH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as TimelineSearchSnapshot) : null;
  } catch {
    return null;
  }
}

export function writeTimelineSearchSnapshot(data: TimelineSearchSnapshot) {
  try {
    sessionStorage.setItem(TIMELINE_SEARCH_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* private mode etc. */
  }
}

function applyTimelineParams(p: URLSearchParams, snapshot: Pick<TimelineSearchSnapshot, "q1" | "q2" | "listOpen" | "detailKey">) {
  for (const k of ["ts1", "ts2", "tsList", "tsDetail"]) p.delete(k);
  const q1 = snapshot.q1.trim();
  const q2 = snapshot.q2.trim();
  if (q1) p.set("ts1", q1);
  if (q2) p.set("ts2", q2);
  if (snapshot.listOpen) p.set("tsList", "1");
  if (snapshot.detailKey) p.set("tsDetail", snapshot.detailKey);
}

function dashboardPathFromParams(p: URLSearchParams): string {
  const qs = p.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

/** Stable key for «open results list» + filters in the dashboard URL (keeps from/to/user). */
export function buildDashboardReturnHref(snapshot: Pick<TimelineSearchSnapshot, "q1" | "q2" | "listOpen" | "detailKey">): string {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  applyTimelineParams(p, snapshot);
  return dashboardPathFromParams(p);
}

/** Keep the address bar in sync when the user edits or clears the search fields. */
export function replaceDashboardTimelineParams(snapshot: Pick<TimelineSearchSnapshot, "q1" | "q2" | "listOpen" | "detailKey">) {
  if (typeof window === "undefined" || window.location.pathname !== "/dashboard") return;
  const p = new URLSearchParams(window.location.search);
  applyTimelineParams(p, snapshot);
  const url = dashboardPathFromParams(p);
  const cur = window.location.pathname + window.location.search;
  if (cur !== url) window.history.replaceState(null, "", url);
}

export type TimelineSearchUrlFlags = {
  q1: string;
  q2: string;
  hasList: boolean;
  listOpen: boolean;
  hasDetail: boolean;
  detailKey: string | null;
};

export function timelineSearchFromSearchParams(p: URLSearchParams): TimelineSearchUrlFlags | null {
  const q1 = p.get("ts1") ?? "";
  const q2 = p.get("ts2") ?? "";
  const hasList = p.has("tsList");
  const hasDetail = p.has("tsDetail");
  if (!q1 && !q2 && !hasList && !hasDetail) return null;
  return {
    q1,
    q2,
    hasList,
    listOpen: p.get("tsList") === "1",
    hasDetail,
    detailKey: p.get("tsDetail") || null,
  };
}

export function snapshotFromLocation(): TimelineSearchUrlFlags | null {
  if (typeof window === "undefined") return null;
  return timelineSearchFromSearchParams(new URLSearchParams(window.location.search));
}

const normQ = (s: string) => s.trim();

/** First paint on /dashboard – avoids racing effects that clear session before restore. */
export function readInitialTimelineSearchBootstrap(fallback?: DashboardFilterDates): {
  snap: TimelineSearchSnapshot | null;
  detailHitId: string | null;
} {
  if (typeof window === "undefined" || window.location.pathname !== "/dashboard") {
    return { snap: null, detailHitId: null };
  }
  const urlFlags = snapshotFromLocation();
  const snap = loadTimelineSearchRestore(urlFlags, fallback);
  if (!snap) return { snap: null, detailHitId: null };
  return { snap, detailHitId: snap.detailKey };
}

function datesMatchStore(store: TimelineSearchSnapshot, dateFrom: string, dateTo: string): boolean {
  return (store.dateFrom ?? "") === dateFrom && (store.dateTo ?? "") === dateTo;
}

function emptyListPatch(): Pick<TimelineSearchSnapshot, "rows" | "page" | "totalCount" | "searched"> {
  return { rows: [], page: 1, totalCount: 0, searched: false };
}

export function loadTimelineSearchRestore(
  urlFlags: TimelineSearchUrlFlags | null = snapshotFromLocation(),
  fallback?: DashboardFilterDates,
): TimelineSearchSnapshot | null {
  const { dateFrom, dateTo } = dashboardFilterDates(undefined, fallback);
  const fromStore = readStore();
  if (!urlFlags && !fromStore) return null;
  if (!fromStore) {
    if (!urlFlags) return null;
    return {
      q1: urlFlags.q1,
      q2: urlFlags.q2,
      dateFrom,
      dateTo,
      rows: [],
      page: 1,
      totalCount: 0,
      searched: false,
      listOpen: urlFlags.hasList ? urlFlags.listOpen : false,
      detailKey: urlFlags.hasDetail ? urlFlags.detailKey : null,
      listScroll: 0,
    };
  }
  if (!urlFlags) {
    const ok = datesMatchStore(fromStore, dateFrom, dateTo);
    return {
      ...fromStore,
      dateFrom,
      dateTo,
      ...(ok ? {} : emptyListPatch()),
    };
  }
  const urlQ1 = urlFlags.q1;
  const urlQ2 = urlFlags.q2;
  const storeMatches =
    normQ(fromStore.q1) === normQ(urlQ1) &&
    normQ(fromStore.q2) === normQ(urlQ2) &&
    datesMatchStore(fromStore, dateFrom, dateTo);
  return {
    ...fromStore,
    q1: urlQ1,
    q2: urlQ2,
    dateFrom,
    dateTo,
    listOpen: urlFlags.hasList ? urlFlags.listOpen : fromStore.listOpen,
    detailKey: urlFlags.hasDetail ? urlFlags.detailKey : fromStore.detailKey,
    rows: storeMatches ? fromStore.rows : [],
    page: storeMatches ? fromStore.page : 1,
    totalCount: storeMatches ? fromStore.totalCount : 0,
    searched: storeMatches ? fromStore.searched : false,
    listScroll: storeMatches ? fromStore.listScroll : 0,
  };
}

export function readListScrollTop(): number {
  return typeof document !== "undefined" ? (document.getElementById(LIST_SCROLL_ID)?.scrollTop ?? 0) : 0;
}

export const timelineSearchListScrollId = LIST_SCROLL_ID;

/** Only allow returning to the dashboard with our search params (no open redirects). */
export function safeDashboardBackHref(raw: string | null | undefined): string | null {
  if (!raw?.startsWith("/dashboard")) return null;
  if (raw.includes("://") || raw.startsWith("//")) return null;
  return raw;
}

export function withBackQuery(path: string, back: string): string {
  const [base, qs] = path.split("?");
  const p = new URLSearchParams(qs ?? "");
  p.set("back", back);
  return `${base}?${p.toString()}`;
}