import { notFound } from "next/navigation";
import { BackLink, Field, PageTitle, Radios, entries } from "@/components/ui";
import { DictationTextarea } from "@/components/dictation-textarea";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProject } from "@/server/services/project-service";
import { followUpAction } from "../../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.followUp.title };

export default async function FollowUpPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  if (SOON.projects) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const [doctor, project] = await Promise.all([getDoctor(id), getProject(pid)]);
  if (!doctor || !project) notFound();

  return (
    <form action={followUpAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={pid} />
      <BackLink href={`/customers/${id}/projects/${pid}`} />
      <PageTitle right={<button className="btn-primary">{el.app.save}</button>}>{el.followUp.title}</PageTitle>
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.projects.project}: <span className="font-semibold text-[var(--text)]">{project.title}</span> · {el.projects.customer}:{" "}
        <span className="font-semibold text-[var(--text)]">
          {el.customer.doctorPrefix} {doctorFullName(doctor)}
        </span>
      </p>

      <div className="card p-4 flex flex-col gap-4">
        <div className="text-sm">
          <span className="label">{el.followUp.date}</span>
          <span className="font-semibold">{fmtDate(new Date().toISOString())}</span> <span className="text-[var(--muted)]">({el.followUp.auto})</span>
        </div>
        <Field label={el.followUp.contactMethod}>
          <Radios name="contactMethod" options={entries(el.enums.followUpContactMethod)} defaultValue="PHONE" />
        </Field>
        <Field label={el.followUp.result}>
          <Radios name="result" options={entries(el.enums.followUpResult)} defaultValue="WAITING" />
        </Field>
        <Field label={el.followUp.comment}>
          <DictationTextarea name="comment" placeholder={el.followUp.commentPlaceholder} rows={4} />
        </Field>
        <Field label={el.followUp.nextAction}>
          <Radios name="nextAction" options={entries(el.enums.nextAction)} defaultValue="FOLLOWUP" />
        </Field>
        <Field label={el.followUp.nextDate} hint={el.followUp.pickDate}>
          <input type="date" name="nextActionDate" className="input max-w-xs" />
        </Field>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary">{el.app.save}</button>
      </div>
    </form>
  );
}
