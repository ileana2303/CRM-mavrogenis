import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Field, Notice, PageTitle } from "@/components/ui";
import { ReviseEditor } from "@/components/revise-editor";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProjectBundle } from "@/server/services/project-service";
import { reviseAction } from "../../actions";

export const metadata = { title: el.revise.title };

export default async function RevisePage({ params, searchParams }: { params: Promise<{ id: string; pid: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id, pid } = await params;
  const { error } = await searchParams;
  const [doctor, bundle] = await Promise.all([getDoctor(id), getProjectBundle(pid)]);
  if (!doctor || !bundle) notFound();
  const { project, latestOffer } = bundle;
  const back = `/customers/${id}/projects/${pid}`;

  if (!latestOffer) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href={back} />
        <PageTitle>{el.revise.title}</PageTitle>
        <Notice tone="amber">{el.revise.noOffer}</Notice>
        <Link href={back} className="btn-primary self-start">
          {el.app.back}
        </Link>
      </div>
    );
  }

  return (
    <form action={reviseAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={pid} />
      <BackLink href={back} />
      <PageTitle>{el.revise.title}</PageTitle>
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.projects.project}: <span className="font-semibold text-[var(--text)]">{project.title}</span> · {el.customer.doctorPrefix}{" "}
        <span className="font-semibold text-[var(--text)]">{doctorFullName(doctor)}</span> · {el.revise.offer}:{" "}
        <span className="font-mono font-semibold text-[var(--text)]">
          {latestOffer.number}/V{latestOffer.version}
        </span>{" "}
        → V{latestOffer.version + 1}
      </p>

      <ReviseEditor lines={project.lines} />

      <div className="card p-4 flex flex-col gap-4">
        <Field label={el.revise.notes}>
          <textarea name="notes" className="input" rows={2} defaultValue={project.notes} placeholder={el.projects.notesPlaceholder} />
        </Field>
        <Field label={el.revise.reason} required>
          <textarea name="reason" className="input" rows={3} placeholder={el.revise.reasonPlaceholder} required />
        </Field>
        {error === "reason" && <Notice tone="red">{el.revise.reasonRequired}</Notice>}
      </div>

      <div className="flex justify-end">
        <button className="btn-primary">{el.projects.requestOffer}</button>
      </div>
    </form>
  );
}
