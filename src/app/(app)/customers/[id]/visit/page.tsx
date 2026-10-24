import { notFound } from "next/navigation";
import { BackLink, Card, DoctorLine, Empty, Field, PageTitle, entries } from "@/components/ui";
import { DictationTextarea } from "@/components/dictation-textarea";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listVisits } from "@/server/services/visit-service";
import { listProjects } from "@/server/services/project-service";
import { saveVisitAction } from "../../actions";

export const metadata = { title: el.visit.title };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const [visits, projects] = await Promise.all([listVisits(id), listProjects(id)]);
  const active = projects.filter((p) => p.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.visit.title}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      <form action={saveVisitAction} className="card p-4 flex flex-col gap-4">
        <input type="hidden" name="doctorId" value={id} />
        <Field label={el.visit.contactMethod}>
          <select name="contactMethod" className="input" defaultValue="VISIT">
            {entries(el.enums.visitContactMethod).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label={el.visit.topic}>
          <select name="topic" className="input" defaultValue="GENERAL">
            {entries(el.enums.visitTopic).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={el.visit.outcome}>
            <select name="outcome" className="input" defaultValue="NONE">
              {entries(el.enums.visitOutcome).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label={el.visit.nextDate} hint="ΗΗ / ΜΜ / ΕΕΕΕ">
            <input type="date" name="nextActionDate" className="input" />
          </Field>
        </div>
        {active.length > 0 && (
          <Field label={el.projects.project}>
            <select name="projectId" className="input" defaultValue="">
              <option value="">{el.app.none}</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.code})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={el.visit.comment}>
          <DictationTextarea name="comment" placeholder={el.visit.commentPlaceholder} rows={4} />
        </Field>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button name="intent" value="newProject" className="btn-secondary">
            {el.visit.newProject}
          </button>
          <button name="intent" value="save" className="btn-primary">
            {el.app.save}
          </button>
        </div>
      </form>

      <Card title={el.visit.recent}>
        {visits.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {visits.slice(0, 8).map((v) => (
              <li key={v.id} className="py-2.5 text-sm flex gap-3">
                <span className="w-20 shrink-0 tabular-nums text-[var(--muted)]">{fmtDate(v.date)}</span>
                <span className="min-w-0">
                  <span className="font-medium">
                    {el.enums.visitContactMethod[v.contactMethod]} · {el.enums.visitTopic[v.topic]} → {el.enums.visitOutcome[v.outcome]}
                  </span>
                  {v.comment && <span className="block text-[var(--muted)]">{v.comment}</span>}
                  {v.nextActionDate && (
                    <span className="block text-xs text-brand-700">
                      {el.visit.nextDate.replace("4. ", "")}: {fmtDate(v.nextActionDate)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
