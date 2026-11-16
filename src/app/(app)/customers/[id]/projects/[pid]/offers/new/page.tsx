import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Field, PageTitle } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { OfferLinesEditor } from "@/components/offer-lines-editor";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProjectDetail } from "@/server/services/project-service";
import { createProjectOfferAction } from "../../../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.newOffer };

/**
 * «Νέα προσφορά» inside a project → setData SALDOC form _CRM_: SERIES = S1_OFFER_SERIES, TRDR = the doctor,
 * PRJC = this project, SALESMAN = session PRSN, lines → ITELINES. SoftOne numbers it and adds VAT / totals.
 */
export default async function NewProjectOfferPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const back = `/customers/${id}/projects/${pid}`;
  if (SOON.projectOffer) return <ComingSoon title={metadata.title} backHref={back} />;
  const [doctor, project] = await Promise.all([getDoctor(id), getProjectDetail(pid)]);
  if (!doctor || !project || project.doctorId !== id) notFound();

  return (
    <ActionForm action={createProjectOfferAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <input type="hidden" name="projectId" value={project.id} />
      <BackLink href={back} />
      <PageTitle
        right={
          <div className="flex items-center gap-2 shrink-0">
            <Link href={back} className="btn-ghost">
              {el.app.cancel}
            </Link>
            <button className="btn-primary">{el.app.save}</button>
          </div>
        }
      >
        {el.projects.newOffer}
      </PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.projects.project}: <span className="font-semibold text-[var(--text)]">{project.title}</span> · {project.code}
      </p>

      <OfferLinesEditor doctorId={id} projectId={project.id} />

      <Field label={el.projects.offerComments}>
        <textarea name="comments" className="input" rows={3} />
      </Field>
    </ActionForm>
  );
}
