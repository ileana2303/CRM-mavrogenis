import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { ClosedBadge, OfferStatusBadge } from "@/components/project-badges";
import { el } from "@/lib/i18n/el";
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
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">{el.offers.no}</th>
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
                  <td className="tabular-nums">{i + 1}</td>
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
                    <form action={setOfferClosedAction} className="flex items-center gap-2">
                      <input type="hidden" name="doctorId" value={id} />
                      <input type="hidden" name="offerId" value={o.id} />
                      <ClosedBadge closed={o.closed} />
                      <select name="closed" className="input min-h-9 py-1 text-sm w-28" defaultValue={o.closed ?? ""} aria-label={el.offers.setClosed}>
                        <option value="">—</option>
                        <option value="YES">{el.app.yes}</option>
                        <option value="NO">{el.app.no}</option>
                        <option value="PARTIAL">{el.app.partial}</option>
                      </select>
                      <button className="btn-ghost min-h-9 text-sm">OK</button>
                    </form>
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
