import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, DoctorLine, Empty, Field, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { ActionForm } from "@/components/action-form";
import { fmtDate, todayIso } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { pendingForDoctor } from "@/server/services/task-service";
import { addTaskAction, toggleTaskAction } from "../../actions";

export const metadata = { title: el.pending.title };

type Filter = "open" | "overdue" | "done" | "all";

export default async function PendingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const filter = (["open", "overdue", "done", "all"].includes(sp.filter ?? "") ? sp.filter : "open") as Filter;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const { tasks, counts } = await pendingForDoctor(id);
  const shown = tasks.filter((t) => (filter === "all" ? true : filter === "open" ? t.status === "OPEN" : filter === "overdue" ? t.view === "OVERDUE" : t.view === "DONE"));

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.pending.title}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      <div className="grid grid-cols-3 gap-3">
        <Counter label={el.pending.open} value={counts.open} tone="text-brand-700" />
        <Counter label={el.pending.overdue} value={counts.overdue} tone="text-danger-600" />
        <Counter label={el.pending.done} value={counts.done} tone="text-ok-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--muted)] font-semibold mr-1">{el.pending.filters}:</span>
        {(
          [
            ["open", el.pending.open],
            ["overdue", el.pending.overdue],
            ["done", el.pending.done],
            ["all", el.pending.all],
          ] as const
        ).map(([f, l]) => (
          <Link key={f} href={`?filter=${f}`} className={`chip ${filter === f ? "bg-brand-600 text-white border-brand-600" : ""}`}>
            {filter === f ? "● " : "○ "}
            {l}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {shown.length === 0 ? (
          <Empty>{el.pending.empty}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{el.pending.action}</th>
                <th>{el.pending.due}</th>
                <th>{el.pending.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">
                    {t.projectId ? (
                      <Link href={`/customers/${id}/projects/${t.projectId}`} className="hover:underline">
                        {t.title}
                      </Link>
                    ) : (
                      t.title
                    )}
                  </td>
                  <td className="tabular-nums whitespace-nowrap">{fmtDate(t.dueDate)}</td>
                  <td>
                    {t.view === "OVERDUE" ? <Badge tone="red">{el.pending.statusOverdue}</Badge> : t.view === "DONE" ? <Badge tone="green">{el.pending.statusDone}</Badge> : <Badge tone="blue">{el.pending.statusOpen}</Badge>}
                  </td>
                  <td className="text-right">
                    <ActionForm action={toggleTaskAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="doctorId" value={id} />
                      <input type="hidden" name="filter" value={filter} />
                      <input type="hidden" name="op" value={t.status === "DONE" ? "reopen" : "done"} />
                      <button className="btn-ghost min-h-9 text-sm whitespace-nowrap">{t.status === "DONE" ? el.pending.reopen : `✓ ${el.pending.complete}`}</button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionForm action={addTaskAction} className="card p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
        <input type="hidden" name="doctorId" value={id} />
        <Field label={el.pending.newTitle}>
          <input name="title" className="input" required placeholder="Αποστολή προσφοράς OCT" />
        </Field>
        <Field label={el.pending.newDue}>
          <input name="dueDate" type="date" className="input" required defaultValue={todayIso()} />
        </Field>
        <button className="btn-secondary">{el.pending.add}</button>
      </ActionForm>
    </div>
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
