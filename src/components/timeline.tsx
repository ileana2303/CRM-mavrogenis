import type { ReactNode } from "react";
import { el } from "@/lib/i18n/el";
import { athensDate, athensDatePlus, TZ } from "@/lib/athens";
import { fmtEur, fmtTime } from "@/lib/format";
import type { TimelineEntry, TimelineKind } from "@/server/domain/types";
import { Icon } from "./icons";

/** colour + icon per type – one look for the task chain (modal) and the project timeline (card) */
const KIND: Record<TimelineKind, { icon: (p: { size?: number }) => ReactNode; bubble: string }> = {
  TASK: { icon: Icon.clipboard, bubble: "bg-amber-100 text-amber-700" },
  CALL: { icon: Icon.phone, bubble: "bg-emerald-100 text-emerald-700" },
  EMAIL: { icon: Icon.mail, bubble: "bg-sky-100 text-sky-700" },
  MEETING: { icon: Icon.users, bubble: "bg-violet-100 text-violet-700" },
  OFFER: { icon: Icon.file, bubble: "bg-brand-100 text-brand-700" },
  OTHER: { icon: Icon.calendar, bubble: "bg-slate-100 text-slate-600" },
};

/** the timeline's coloured round icon, for list rows (pending list, «Η μέρα μου») */
export function KindIcon({ kind, size = 36 }: { kind: TimelineKind; size?: number }) {
  const k = KIND[kind];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${k.bubble}`} style={{ width: size, height: size }} title={el.timeline.kinds[kind]}>
      {k.icon({ size: Math.round(size * 0.48) })}
    </span>
  );
}

const STATUS_TONE: Record<number, string> = {
  1: "bg-brand-50 text-brand-700 ring-brand-200",
  2: "bg-brand-50 text-brand-700 ring-brand-200",
  3: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  4: "bg-red-50 text-red-700 ring-red-200",
};

const dayFmt = new Intl.DateTimeFormat("el-GR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

function dayLabel(day: string, sample: string): string {
  if (day === athensDatePlus(0)) return el.timeline.today;
  if (day === athensDatePlus(-1)) return el.timeline.yesterday;
  return dayFmt.format(new Date(sample));
}

/**
 * Vertical timeline, newest first, grouped by day (Athens). Pure markup – usable from server pages and client modals.
 * `currentId` marks the entry the user came from (the Εκκρεμότητα whose chain is shown).
 */
export function Timeline({ entries, currentId }: { entries: TimelineEntry[]; currentId?: string }) {
  const days: Array<{ day: string; items: TimelineEntry[] }> = [];
  for (const e of entries) {
    const day = athensDate(new Date(e.at));
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(e);
    else days.push({ day, items: [e] });
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map(({ day, items }) => (
        <section key={day}>
          <h3 className="mb-2 pl-[52px] text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{dayLabel(day, items[0].at)}</h3>
          <ol className="relative flex flex-col gap-3">
            {/* the rail behind the icons */}
            <span aria-hidden className="absolute left-[19px] top-5 bottom-5 w-0.5 rounded-full bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
            {items.map((e) => {
              const k = KIND[e.kind];
              const current = e.id === currentId;
              const name = e.label ?? el.timeline.kinds[e.kind];
              const status = e.status !== undefined && Number.isInteger(e.status) ? el.timeline.actStatus[e.status] : undefined;
              return (
                <li key={e.id} className="relative grid grid-cols-[40px_1fr] gap-3">
                  <span className={`relative z-[1] grid size-10 place-items-center rounded-full ring-4 ring-white ${k.bubble}`}>{k.icon({ size: 19 })}</span>
                  <div
                    className={`min-w-0 rounded-2xl border px-4 py-3 transition-colors ${
                      current ? "border-brand-200 bg-brand-50/60 shadow-[0_8px_24px_-16px_rgba(30,80,160,0.5)]" : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-slate-900">{name}</span>
                        {e.code && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">{e.code}</span>}
                        {current && <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">{el.timeline.current}</span>}
                      </div>
                      <span className="shrink-0 pt-0.5 text-sm tabular-nums text-[var(--muted)]">{fmtTime(e.at)}</span>
                    </div>
                    {(status || e.amount !== undefined) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {status && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[e.status!] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>{status}</span>
                        )}
                        {e.amount !== undefined && (
                          <span className="text-sm tabular-nums">
                            {e.amountBasis && <span className="text-[var(--muted)]">{el.timeline.amountBasis[e.amountBasis]}: </span>}
                            <span className="font-semibold text-brand-800">{fmtEur(e.amount, true)}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {e.comments && <p className="mt-1.5 whitespace-pre-line break-words text-sm text-slate-700">{e.comments}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
