import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { TaskTitle } from "@/components/task-title";
import { TaskActions } from "@/components/task-actions";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/server/auth/current-user";
import { myDay } from "@/server/services/task-service";
import type { Task } from "@/server/domain/types";

export const metadata = { title: el.myDay.title };

const BACK = "/my-day";

/**
 * «Η μέρα μου»: the salesperson's open Εκκρεμότητες, calls, emails and meetings dated today or earlier, across all
 * customers (api.crm.actions/getPendings {prsn, toDate}). Each one can be completed or followed up right here.
 */
export default async function MyDayPage() {
  const session = await requireUser();
  const { today, overdue, dueToday } = await myDay(session);
  const daysLate = (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{el.myDay.title}</PageTitle>
      <p className="-mt-2 text-sm text-[var(--muted)]">{el.myDay.note}</p>

      <div className="grid grid-cols-2 gap-3">
        <Counter label={el.myDay.overdue} value={overdue.length} tone="text-danger-600" />
        <Counter label={el.myDay.today} value={dueToday.length} tone="text-brand-700" />
      </div>

      <Section title={el.myDay.today} count={dueToday.length} empty={el.myDay.allClear} accent="bg-brand-500">
        {dueToday.map((t) => (
          <Item key={t.id} task={t} meId={session.s1Prsn ?? session.userId} when={t.time ?? fmtDate(t.dueDate)} />
        ))}
      </Section>

      <Section title={el.myDay.overdue} count={overdue.length} empty={el.myDay.noneOverdue} accent="bg-danger-500">
        {overdue.map((t) => (
          <Item
            key={t.id}
            task={t}
            meId={session.s1Prsn ?? session.userId}
            when={fmtDate(t.dueDate)}
            late={el.myDay.daysLate(daysLate(t.dueDate))}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, count, empty, accent, children }: { title: string; count: number; empty: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        <span aria-hidden className={`size-2 rounded-full ${accent}`} />
        {title}
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{count}</span>
      </h2>
      {count === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">{empty}</p> : <ul className="divide-y divide-[var(--line)]">{children}</ul>}
    </section>
  );
}

function Item({ task, meId, when, late }: { task: Task; meId: string; when: string; late?: string }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <TaskTitle task={task} meId={meId}>
        {task.doctorId ? (
          <Link href={`/customers/${task.doctorId}`} className="font-medium text-slate-700 hover:text-brand-700 hover:underline">
            {task.doctorName ?? `#${task.doctorId}`}
          </Link>
        ) : (
          <span className="text-[var(--muted)]">{el.myDay.noCustomer}</span>
        )}
      </TaskTitle>
      <div className="flex shrink-0 flex-col items-end gap-1 pl-12 sm:pl-0">
        <div className="flex items-center gap-2 text-sm tabular-nums">
          {late && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{late}</span>}
          <span className="text-slate-600">{when}</span>
        </div>
        <TaskActions task={task} back={BACK} />
      </div>
    </li>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
