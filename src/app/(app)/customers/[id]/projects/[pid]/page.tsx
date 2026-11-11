import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Card, Notice, PageTitle } from "@/components/ui";
import { ClosedBadge, OfferStatusBadge, StageBadge, StatusBadge } from "@/components/project-badges";
import { el } from "@/lib/i18n/el";
import { fmtDate, fmtEur } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProjectBundle } from "@/server/services/project-service";
import { markOfferSentAction, requestOfferAction } from "../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.view };

export default async function ProjectViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pid: string }>;
  searchParams: Promise<{ sent?: string; saved?: string }>;
}) {
  const { id, pid } = await params;
  if (SOON.projects) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const sp = await searchParams;
  const [doctor, bundle] = await Promise.all([getDoctor(id), getProjectBundle(pid)]);
  if (!doctor || !bundle || bundle.project.doctorId !== id) notFound();
  const { project, events, offers, latestOffer } = bundle;
  const base = `/customers/${id}/projects/${pid}`;
  const closed = project.status === "CLOSED";
  const pricedPending = latestOffer?.status === "PRICED" && !latestOffer.acknowledgedAt;
  const requested = latestOffer?.status === "REQUESTED";

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}/projects`} />
      <PageTitle right={<StatusBadge status={project.status} />}>
        {el.projects.project}: {project.title}
      </PageTitle>
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.projects.customer}: <span className="font-semibold text-[var(--text)]">{el.customer.doctorPrefix} {doctorFullName(doctor)}</span> · {el.projects.projectCode}:{" "}
        <span className="font-mono">{project.code}</span>
      </p>

      {sp.sent && <Notice tone="green">{el.projects.requestSent}</Notice>}
      {sp.saved && <Notice tone="green">{el.app.saved}</Notice>}
      {requested && <Notice tone="amber">{el.projects.offerPending} ({latestOffer!.number}/V{latestOffer!.version})</Notice>}
      {pricedPending && (
        <form action={markOfferSentAction} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-accent-500">
          <input type="hidden" name="offerId" value={latestOffer!.id} />
          <div className="flex-1 text-sm">
            <span className="font-semibold">
              {latestOffer!.number}/V{latestOffer!.version} {el.enums.offerStatus.PRICED.toLowerCase()}: {fmtEur(latestOffer!.total)}
            </span>
            {latestOffer!.supportNotes && <span className="block text-[var(--muted)]">{latestOffer!.supportNotes}</span>}
          </div>
          <button className="btn-accent">{el.offers.markSent}</button>
        </form>
      )}

      <section className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label={el.projects.createdAt} value={fmtDate(project.createdAt)} />
        <Stat label={el.projects.offerValue} value={project.value ? fmtEur(project.value) : "—"} />
        <Stat label={el.projects.stage} value={<StageBadge stage={project.stage} />} />
        <Stat label={el.projects.lastOffer} value={fmtDate(project.lastOfferDate)} />
      </section>

      {project.lines.length > 0 && (
        <Card title={el.projects.lines.replace("3. ", "")}>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{el.projects.no}</th>
                  <th>{el.projects.productCode}</th>
                  <th className="text-right">{el.projects.qty}</th>
                  <th className="text-right">{el.projects.floorPrice}</th>
                  <th className="text-right">{el.projects.discount}</th>
                  <th className="text-right">{el.projects.specialDiscount}</th>
                  <th className="text-right">{el.projects.offerPrice}</th>
                  {closed && <th>{el.close.closing}</th>}
                </tr>
              </thead>
              <tbody>
                {project.lines.map((l) => (
                  <tr key={l.lineNo}>
                    <td>{l.lineNo}</td>
                    <td className="font-mono">{l.productCode}</td>
                    <td className="text-right">{l.qty}</td>
                    <td className="text-right tabular-nums">{fmtEur(l.floorPrice)}</td>
                    <td className="text-right">{l.discountPct}%</td>
                    <td className="text-right">{l.specialDiscountPct}%</td>
                    <td className="text-right font-semibold tabular-nums">{fmtEur(l.offerPrice)}</td>
                    {closed && (
                      <td>
                        {l.won === true ? el.app.yes : l.won === false ? el.app.no : "—"}
                        {l.competitor && (
                          <span className="block text-xs text-[var(--muted)]">
                            {l.competitor} {l.competitorModel} {l.competitorPrice ? fmtEur(l.competitorPrice) : ""}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {project.notes && <p className="text-sm text-[var(--muted)] mt-3">{project.notes}</p>}
        </Card>
      )}

      {!closed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link href={`${base}/follow-up`} className="btn-secondary">
            {el.projects.followUp}
          </Link>
          {latestOffer ? (
            <Link href={`${base}/revise`} className="btn-secondary">
              {el.projects.revise}
            </Link>
          ) : (
            <form action={requestOfferAction} className="contents">
              <input type="hidden" name="projectId" value={project.id} />
              <button className="btn-secondary w-full" disabled={project.lines.length === 0}>
                {el.projects.requestOffer}
              </button>
            </form>
          )}
          <Link href={`${base}/close`} className="btn-danger">
            {el.projects.close}
          </Link>
        </div>
      )}
      {closed && <Notice tone="blue">{el.projects.closed}</Notice>}

      <Card title={el.projects.timeline}>
        <ol className="relative border-l-2 border-brand-100 ml-2 flex flex-col gap-4 py-1">
          {events.map((e) => (
            <li key={e.id} className="pl-5 relative">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-brand-500" />
              <div className="text-xs text-[var(--muted)] tabular-nums">{fmtDate(e.date)}</div>
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-[var(--muted)]">{e.description}</div>
            </li>
          ))}
        </ol>
      </Card>

      {offers.length > 0 && (
        <Card title={el.hub.offers}>
          <ul className="divide-y divide-[var(--line)]">
            {offers.map((o) => (
              <li key={o.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="font-mono font-semibold">
                  {o.number}/V{o.version}
                </span>
                <span className="text-[var(--muted)]">{fmtDate(o.date)}</span>
                <OfferStatusBadge status={o.status} />
                <span className="ml-auto font-semibold tabular-nums">{fmtEur(o.total)}</span>
                <ClosedBadge closed={o.closed} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
