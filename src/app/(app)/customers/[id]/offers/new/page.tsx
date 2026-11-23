import { notFound } from "next/navigation";
import { NewOfferForm } from "@/components/new-offer-form";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { createProjectOfferAction } from "../../projects/actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.newOffer };

/**
 * «Νέα προσφορά» without a project, from the customer's offers list → setData SALDOC form _CRM_: SERIES = S1_OFFER_SERIES,
 * TRDR = the doctor, SALESMAN = session PRSN, no PRJC. Same form and SoftOne `calculate` as the project offer.
 */
export default async function NewCustomerOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = `/customers/${id}/offers`;
  if (SOON.projectOffer) return <ComingSoon title={metadata.title} backHref={back} />;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  return <NewOfferForm action={createProjectOfferAction} doctorId={id} projectId="" backHref={back} doctorName={doctorFullName(doctor)} />;
}
