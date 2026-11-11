/**
 * Loading skeletons. Every route has a loading.tsx that renders the skeleton matching its real layout,
 * so the page does not jump when the data (often a SoftOne round-trip) arrives.
 * Server components only – no client JS.
 */
import type { ReactNode } from "react";

/** One shimmering block. */
export function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Announces loading once to screen readers; the bones themselves are hidden. */
function Page({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Φόρτωση…</span>
      {children}
    </div>
  );
}

function Header({ back = true, action = false, doctor = false }: { back?: boolean; action?: boolean; doctor?: boolean }) {
  return (
    <>
      {back && <Bone className="h-5 w-16" />}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Bone className="h-7 md:h-8 w-64 max-w-[60%]" />
        {action && <Bone className="h-11 w-36 rounded-xl" />}
      </div>
      {doctor && <Bone className="h-4 w-72 max-w-[80%] -mt-2" />}
    </>
  );
}

function FieldBone({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Bone className="h-4 w-28" />
      <Bone className="h-11 w-full rounded-xl" />
    </div>
  );
}

function CardBone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-4 md:p-5 ${className}`}>{children}</div>;
}

function FilterBone() {
  return (
    <CardBone>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <FieldBone />
        <FieldBone />
        <FieldBone />
        <Bone className="h-11 w-full rounded-xl" />
      </div>
    </CardBone>
  );
}

function Rows({ n = 6, cols = 5 }: { n?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 px-4 py-3 border-b border-[var(--line)]">
        {Array.from({ length: cols }, (_, i) => (
          <Bone key={i} className={`h-3 flex-1 ${i === 0 ? "max-w-40" : "max-w-24"}`} />
        ))}
      </div>
      {Array.from({ length: n }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0 border-[var(--line)]">
          {Array.from({ length: cols }, (_, i) => (
            <Bone key={i} className={`h-4 flex-1 ${i === 0 ? "max-w-56" : "max-w-28"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ---- page layouts --------------------------------------------------------------

/** Generic fallback: title + two text cards. */
export function GenericSkeleton() {
  return (
    <Page>
      <Header />
      <CardBone>
        <div className="flex flex-col gap-3">
          <Bone className="h-5 w-1/3" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
        </div>
      </CardBone>
      <CardBone>
        <div className="flex flex-col gap-3">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
      </CardBone>
    </Page>
  );
}

/** Customer hub: info card, arrival bar, 4-column tile grid. */
export function HubSkeleton() {
  return (
    <Page>
      <Header action />
      <CardBone>
        <div className="flex justify-between mb-3">
          <Bone className="h-6 w-80 max-w-[70%]" />
          <Bone className="h-5 w-14 rounded-full" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {range(6).map((i) => (
            <Bone key={i} className="h-4 w-4/5" />
          ))}
        </div>
      </CardBone>
      <CardBone className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-11 w-24 rounded-xl" />
      </CardBone>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {range(8).map((i) => (
          <div key={i} className="card p-4 min-h-28 flex flex-col justify-between gap-3">
            <Bone className="size-11 rounded-xl" />
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Page>
  );
}

/** Form pages: title, doctor line, card(s) of fields, buttons. */
export function FormSkeleton({ fields = 6, doctor = true, cards = 1 }: { fields?: number; doctor?: boolean; cards?: number }) {
  return (
    <Page>
      <Header doctor={doctor} />
      {range(cards).map((c) => {
        const n = c === 0 ? fields : 2;
        return (
          <CardBone key={c}>
            <div className="grid sm:grid-cols-2 gap-4">
              {range(n).map((i) => (
                <FieldBone key={i} wide={i === n - 1 && n % 2 === 1} />
              ))}
            </div>
          </CardBone>
        );
      })}
      <div className="flex justify-end gap-2">
        <Bone className="h-11 w-32 rounded-xl" />
        <Bone className="h-11 w-36 rounded-xl" />
      </div>
    </Page>
  );
}

/** Table pages (offers, history, pending, projects, check-ins). */
export function TableSkeleton({ doctor = true, filter = false, rows = 6, cols = 5 }: { doctor?: boolean; filter?: boolean; rows?: number; cols?: number }) {
  return (
    <Page>
      <Header doctor={doctor} action />
      {filter && <FilterBone />}
      <Rows n={rows} cols={cols} />
    </Page>
  );
}

/** Card lists (search results, support requests). */
export function ListSkeleton({ items = 6, back = true }: { items?: number; back?: boolean }) {
  return (
    <Page>
      <Header back={back} />
      <div className="flex flex-col gap-3">
        {range(items).map((i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <Bone className="size-11 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Bone className="h-4 w-2/5" />
              <Bone className="h-3 w-3/5" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </Page>
  );
}

/** Customer search: title + search card. */
export function SearchSkeleton() {
  return (
    <Page>
      <Header back={false} action />
      <CardBone>
        <Bone className="h-12 w-full rounded-xl mb-4" />
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldBone />
          <FieldBone />
        </div>
      </CardBone>
    </Page>
  );
}

/** Equipment: machine cards with a 3-column field grid + add button. */
export function EquipmentSkeleton() {
  return (
    <Page>
      <Header doctor action />
      {range(2).map((i) => (
        <CardBone key={i}>
          <div className="flex items-start gap-3 mb-4">
            <Bone className="size-9 rounded-xl" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="size-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {range(6).map((j) => (
              <FieldBone key={j} />
            ))}
          </div>
        </CardBone>
      ))}
      <Bone className="h-14 w-full rounded-2xl" />
    </Page>
  );
}

/** KPIs: filter card, 4 stat tiles, two chart blocks. */
export function KpiSkeleton({ back = false }: { back?: boolean }) {
  return (
    <Page>
      <Header back={back} />
      <FilterBone />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {range(4).map((i) => (
          <div key={i} className="kpi">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-20 mt-1" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {range(2).map((i) => (
          <CardBone key={i}>
            <Bone className="h-4 w-32 mb-4" />
            <Bone className="h-48 w-full rounded-xl" />
          </CardBone>
        ))}
      </div>
    </Page>
  );
}

/** Detail pages (project, support request): stats row + content cards. */
export function DetailSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <Page>
      <Header action doctor />
      {stats > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {range(stats).map((i) => (
            <div key={i} className="kpi">
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-24 mt-1" />
            </div>
          ))}
        </div>
      )}
      <CardBone>
        <Bone className="h-5 w-40 mb-4" />
        <div className="flex flex-col gap-3">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-11/12" />
          <Bone className="h-4 w-3/4" />
        </div>
      </CardBone>
      <Rows n={3} cols={4} />
    </Page>
  );
}

/** Daily report: date filter card + timeline list. */
export function ReportSkeleton() {
  return (
    <Page>
      <Header back={false} />
      <FilterBone />
      <CardBone>
        <div className="flex flex-col gap-4">
          {range(5).map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-4 w-14" />
              <Bone className="h-4 flex-1 max-w-md" />
              <Bone className="h-5 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </CardBone>
    </Page>
  );
}
