import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { fmtEur } from "@/lib/format";
import { doctorFullName, doctorHistory, getDoctor, turnoverPerVisit } from "@/server/services/customer-service";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.history.title };

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.history) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const { rows, total } = await doctorHistory(id);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.history.title}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      {rows.length === 0 ? (
        <div className="card">
          <Empty>{el.history.empty}</Empty>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{el.history.year}</th>
                <th className="text-right">{el.history.offersValue}</th>
                <th className="text-right">{el.history.turnover}</th>
                <th className="text-right">{el.history.visits}</th>
                <th className="text-right">{el.history.turnoverPerVisit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td className="font-semibold">{r.year}</td>
                  <td className="text-right tabular-nums">{fmtEur(r.offersValue)}</td>
                  <td className="text-right tabular-nums">{fmtEur(r.turnover)}</td>
                  <td className="text-right tabular-nums">{r.visits}</td>
                  <td className="text-right tabular-nums">{fmtEur(turnoverPerVisit(r.turnover, r.visits))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-brand-50/60 font-bold">
                <td>{el.app.total}</td>
                <td className="text-right tabular-nums">{fmtEur(total.offersValue)}</td>
                <td className="text-right tabular-nums">{fmtEur(total.turnover)}</td>
                <td className="text-right tabular-nums">{total.visits}</td>
                <td className="text-right tabular-nums">{fmtEur(turnoverPerVisit(total.turnover, total.visits))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
