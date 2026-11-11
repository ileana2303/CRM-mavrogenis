import { notFound } from "next/navigation";
import { BackLink, Card, DoctorLine, Empty, Field, PageTitle, optionsFrom } from "@/components/ui";
import { DictationTextarea } from "@/components/dictation-textarea";
import { el } from "@/lib/i18n/el";
import { Select } from "@/components/select";
import { fmtDate } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listVisits } from "@/server/services/visit-service";
import { listProjects } from "@/server/services/project-service";
import { saveVisitAction, saveVisitThenProjectAction } from "../../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.visit.title };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.visits) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
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
          <Select name="contactMethod" defaultValue="VISIT" options={optionsFrom(el.enums.visitContactMethod)} />
        </Field>
        <Field label={el.visit.topic}>
          <Select name="topic" defaultValue="GENERAL" options={optionsFrom(el.enums.visitTopic)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={el.visit.outcome}>
            <Select name="outcome" defaultValue="NONE" options={optionsFrom(el.enums.visitOutcome)} />
          </Field>
          <Field label={el.visit.nextDate} hint="ΗΗ / ΜΜ / ΕΕΕΕ">
            <input type="date" name="nextActionDate" className="input" />
          </Field>
        </div>
        {active.length > 0 && (
          <Field label={el.projects.project}>
            <Select name="projectId" defaultValue="" options={[{ value: "", label: el.app.none }, ...active.map((p) => ({ value: p.id, label: p.title, hint: p.code }))]} />
          </Field>
        )}
        <Field label={el.visit.comment}>
          <DictationTextarea name="comment" placeholder={el.visit.commentPlaceholder} rows={4} />
        </Field>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button formAction={saveVisitThenProjectAction} className="btn-secondary">
            {el.visit.newProject}
          </button>
          <button className="btn-primary">
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
