import Link from "next/link";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import type { Session } from "@/server/auth/jwt";
import type { Task } from "@/server/domain/types";
import { myDay } from "@/server/services/task-service";
import { TaskTitle } from "./task-title";
import { TaskActions } from "./task-actions";

/**
 * «Σήμερα» and «Εκπρόθεσμες» of the logged-in salesperson: open Εκκρεμότητες, calls, emails and meetings dated today or
 * earlier, across customers (api.crm.actions/getPendings {prsn, toDate}). Each can be completed or followed up in place;
 * `back` is the page the row actions return to. Top of the Αναφορά Ημέρας.
 */
export async function MyDayLists({ session, back }: { session: Session; back: string }) {
  const { today, overdue, dueToday } = await myDay(session);
  const meId = session.s1Prsn ?? session.userId;
  const daysLate = (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={el.myDay.today} count={dueToday.length} empty={el.myDay.allClear} accent="bg-brand-500">
        {dueToday.map((t) => (
          <Item key={t.id} task={t} meId={meId} back={back} when={t.time ?? fmtDate(t.dueDate)} />
        ))}
      </Section>
      <Section title={el.myDay.overdue} count={overdue.length} empty={el.myDay.noneOverdue} accent="bg-danger-500">
        {overdue.map((t) => (
          <Item key={t.id} task={t} meId={meId} back={back} when={fmtDate(t.dueDate)} late={el.myDay.daysLate(daysLate(t.dueDate))} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, count, empty, accent, children }: { title: string; count: number; empty: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        <span aria-hidden className={`size-2.5 rounded-full ${accent}`} />
        {title}
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{count}</span>
      </h2>
      {count === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">{empty}</p> : <ul className="divide-y divide-[var(--line)]">{children}</ul>}
    </section>
  );
}

function Item({ task, meId, back, when, late }: { task: Task; meId: string; back: string; when: string; late?: string }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <TaskTitle task={task} meId={meId}>
          {task.doctorId ? (
            <Link href={`/customers/${task.doctorId}`} className="font-medium text-slate-700 hover:text-brand-700 hover:underline">
              {task.doctorName ?? `#${task.doctorId}`}
            </Link>
          ) : (
            <span className="text-[var(--muted)]">{el.myDay.noCustomer}</span>
          )}
        </TaskTitle>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-1 text-sm tabular-nums">
          <span className="text-slate-600">{when}</span>
          {late && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{late}</span>}
        </div>
      </div>
      <TaskActions task={task} back={back} />
    </li>
  );
}
