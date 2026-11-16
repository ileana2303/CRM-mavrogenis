import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { OfferStatusBadge } from "@/components/project-badges";
import { el } from "@/lib/i18n/el";
import { ActionForm } from "@/components/action-form";
import { Select } from "@/components/select";
import { fmtDate, fmtEur } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listOffersForDoctor } from "@/server/services/offer-service";
import { setOfferClosedAction } from "../../actions";

export const metadata = { title: el.offers.title };

export default async function OffersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const offers = await listOffersForDoctor(id);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.offers.title}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      {offers.length === 0 ? (
        <div className="card">
          <Empty>{el.offers.empty}</Empty>
        </div>
      ) : (
        <div className="card overflow-x-auto max-w-full">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th className="w-10 hidden lg:table-cell">{el.offers.no}</th>
                <th>{el.offers.date}</th>
                <th>{el.offers.offerTitle}</th>
                <th className="text-right">{el.offers.value}</th>
                <th>{el.offers.status}</th>
                <th>{el.offers.closed}</th>
                <th>{el.offers.view}</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, i) => (
                <tr key={o.id}>
                  <td className="tabular-nums hidden lg:table-cell">{i + 1}</td>
                  <td className="whitespace-nowrap">{fmtDate(o.date)}</td>
                  <td>
                    <span className="font-medium">{o.title}</span>
                    <span className="block text-xs text-[var(--muted)] font-mono">
                      {o.number}/V{o.version}
                    </span>
                  </td>
                  <td className="text-right tabular-nums font-semibold">{fmtEur(o.total)}</td>
                  <td>
                    <OfferStatusBadge status={o.status} />
                  </td>
                  <td>
                    <ActionForm action={setOfferClosedAction} className="flex items-center gap-1">
                      <input type="hidden" name="doctorId" value={id} />
                      <input type="hidden" name="offerId" value={o.id} />
                      <Select
                        name="closed"
                        className="w-32"
                        defaultValue={o.closed ?? ""}
                        ariaLabel={el.offers.setClosed}
                        options={[
                          { value: "", label: "—" },
                          { value: "YES", label: el.app.yes },
                          { value: "NO", label: el.app.no },
                          { value: "PARTIAL", label: el.app.partial },
                        ]}
                      />
                      <button className="btn-ghost min-h-9 text-sm">OK</button>
                    </ActionForm>
                  </td>
                  <td>
                    <Link href={`/customers/${id}/projects/${o.projectId}`} className="text-brand-700 font-semibold hover:underline whitespace-nowrap">
                      {el.app.open}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
