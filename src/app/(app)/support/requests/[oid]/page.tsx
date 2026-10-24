import { notFound } from "next/navigation";
import { BackLink, Card, Field, PageTitle } from "@/components/ui";
import { OfferStatusBadge } from "@/components/project-badges";
import { PriceEditor } from "./price-editor";
import { el } from "@/lib/i18n/el";
import { fmtDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth/current-user";
import { db } from "@/server/data";
import { getOffer } from "@/server/services/offer-service";
import { doctorFullName } from "@/server/services/customer-service";
import { priceOfferAction } from "../../actions";

export const metadata = { title: el.supportArea.price };

export default async function PriceRequestPage({ params }: { params: Promise<{ oid: string }> }) {
  await requireUser(["SUPPORT", "MANAGER"]);
  const { oid } = await params;
  const offer = await getOffer(oid);
  if (!offer) notFound();
  const [doctor, project, requester] = await Promise.all([db().doctors.findById(offer.doctorId), db().projects.findById(offer.projectId), db().users.findById(offer.requestedBy)]);

  return (
    <form action={priceOfferAction} className="flex flex-col gap-4">
      <input type="hidden" name="offerId" value={offer.id} />
      <BackLink href="/support/requests" />
      <PageTitle right={<OfferStatusBadge status={offer.status} />}>
        {offer.title} · {offer.number}/V{offer.version}
      </PageTitle>
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.customer.doctorPrefix} <span className="font-semibold text-[var(--text)]">{doctor ? doctorFullName(doctor) : "—"}</span> · {el.supportArea.requestedBy}{" "}
        <span className="font-semibold text-[var(--text)]">{requester?.fullName ?? "—"}</span> · {fmtDateTime(offer.requestedAt)}
        {project && (
          <>
            {" · "}
            {el.projects.projectCode} <span className="font-mono">{project.code}</span> · {el.enums.projectType[project.type]}
          </>
        )}
      </p>

      {(project?.notes || offer.revisionReason) && (
        <Card>
          {project?.notes && (
            <p className="text-sm">
              <span className="text-[var(--muted)]">{el.projects.notes.replace("4. ", "")}: </span>
              {project.notes}
            </p>
          )}
          {offer.revisionReason && (
            <p className="text-sm mt-1">
              <span className="text-[var(--muted)]">{el.revise.reason.replace("2. ", "")}: </span>
              {offer.revisionReason}
            </p>
          )}
        </Card>
      )}

      <PriceEditor lines={offer.lines} readOnly={offer.status !== "REQUESTED"} />

      {offer.status === "REQUESTED" && (
        <>
          <Field label={el.supportArea.notes}>
            <textarea name="supportNotes" className="input" rows={2} placeholder="Πχ. Ισχύς προσφοράς 30 ημέρες, παράδοση 4 εβδομάδες" />
          </Field>
          <div className="flex justify-end">
            <button className="btn-primary">{el.supportArea.priceAndReturn}</button>
          </div>
        </>
      )}
    </form>
  );
}
