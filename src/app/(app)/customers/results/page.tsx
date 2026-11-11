import Link from "next/link";
import { BackLink, Card, Empty, Notice, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { doctorFullName, searchDoctors } from "@/server/services/customer-service";

export const metadata = { title: el.customer.results };

type SP = { q?: string; firstName?: string; lastName?: string; afm?: string; mobile?: string };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const q = await searchParams;
  let results: Awaited<ReturnType<typeof searchDoctors>> = [];
  let error: string | null = null;
  try {
    results = await searchDoctors(q);
  } catch (e) {
    // SoftOne (or the local store) failed: show the message instead of the blank Next error screen
    error = e instanceof Error ? e.message : String(e);
  }
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers?${qs}`} />
      <PageTitle
        right={
          <Link href="/customers/new" className="btn-secondary">
            {el.customer.createNew}
          </Link>
        }
      >
        {el.customer.results}
      </PageTitle>

      {error && (
        <Notice tone="red">
          <span className="font-semibold">{el.app.error}</span>
          <pre className="mt-1 whitespace-pre-wrap text-xs font-mono">{error}</pre>
        </Notice>
      )}

      {results.length === 0 ? (
        <Card>
          <Empty>{el.customer.noResults}</Empty>
          <div className="flex justify-center">
            <Link href="/customers/new" className="btn-primary">
              {el.customer.createNew}
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {results.map((d) => (
            <li key={d.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/customers/${d.id}`} className="font-semibold text-brand-800 hover:underline">
                    {doctorFullName(d)}
                  </Link>
                  <p className="text-sm text-[var(--muted)]">
                    {el.customer.mobile}: {d.mobile || "—"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {el.customer.address}: {[d.clinicAddress, d.city].filter(Boolean).join(", ") || "—"}
                  </p>
                  {d.afm && <p className="text-xs text-[var(--muted)]">ΑΦΜ {d.afm}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-auto pt-1">
                <Link href={`/customers/${d.id}`} className="btn-primary flex-1">
                  {el.app.open}
                </Link>
                <Link href={`/customers/${d.id}/edit`} className="btn-secondary flex-1">
                  {el.customer.edit}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
