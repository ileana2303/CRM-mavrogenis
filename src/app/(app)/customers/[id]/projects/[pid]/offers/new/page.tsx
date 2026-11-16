import { notFound } from "next/navigation";
import { NewOfferForm } from "@/components/new-offer-form";
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
    <NewOfferForm
      action={createProjectOfferAction}
      doctorId={id}
      projectId={project.id}
      backHref={back}
      doctorName={doctorFullName(doctor)}
      projectTitle={project.title}
      projectCode={project.code}
    />
  );
}
