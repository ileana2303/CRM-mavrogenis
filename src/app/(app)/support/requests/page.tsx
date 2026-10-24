import Link from "next/link";
import { Card, Empty, Notice, PageTitle } from "@/components/ui";
import { OfferStatusBadge } from "@/components/project-badges";
import { el } from "@/lib/i18n/el";
import { fmtDateTime, fmtEur } from "@/lib/format";
import { requireUser } from "@/server/auth/current-user";
import { db } from "@/server/data";
import { listOfferRequests } from "@/server/services/offer-service";
import { doctorFullName } from "@/server/services/customer-service";

export const metadata = { title: el.supportArea.title };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ answered?: string }> }) {
  await requireUser(["SUPPORT", "MANAGER"]);
  const { answered } = await searchParams;
  const { pending, answered: done } = await listOfferRequests();
  const ids = [...new Set([...pending, ...done].map((o) => o.doctorId))];
  const doctors = await db().doctors.findByIds(ids);
  const users = await db().users.list();
  const dn = (id: string) => {
    const d = doctors.find((x) => x.id === id);
    return d ? doctorFullName(d) : "—";
  };
  const un = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{el.supportArea.title}</PageTitle>
      {answered && <Notice tone="green">{el.supportArea.answeredOk}</Notice>}

      <Card title={`${el.supportArea.pending} (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty>{el.supportArea.empty}</Empty>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {pending.map((o) => (
              <li key={o.id}>
                <Link href={`/support/requests/${o.id}`} className="flex items-center gap-3 py-3 hover:bg-brand-50 rounded-lg px-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {o.title} <span className="font-mono text-xs text-[var(--muted)]">{o.number}/V{o.version}</span>
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {el.customer.doctorPrefix} {dn(o.doctorId)} · {el.supportArea.requestedBy} {un(o.requestedBy)} · {fmtDateTime(o.requestedAt)}
                    </div>
                    {o.revisionReason && <div className="text-xs text-amber-800 mt-0.5">{el.revise.reason.replace("2. ", "")}: {o.revisionReason}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{fmtEur(o.total)}</div>
                    <span className="text-xs text-brand-700 font-semibold">{el.supportArea.price} ›</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={el.supportArea.answered}>
        {done.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {done.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{o.title}</span> <span className="font-mono text-xs text-[var(--muted)]">{o.number}/V{o.version}</span>
                  <span className="block text-[var(--muted)]">
                    {dn(o.doctorId)} · {fmtDateTime(o.answeredAt)}
                  </span>
                </div>
                <OfferStatusBadge status={o.status} />
                <span className="font-semibold tabular-nums">{fmtEur(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
