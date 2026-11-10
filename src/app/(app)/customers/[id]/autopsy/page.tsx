import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Badge, Card, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listAutopsies } from "@/server/services/autopsy-service";

export const metadata = { title: el.autopsy.title };

export default async function AutopsyListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const autopsies = await listAutopsies(id);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle
        right={
          <Link href={`/customers/${id}/autopsy/new`} className="btn-primary">
            {el.autopsy.new}
          </Link>
        }
      >
        {el.autopsy.title}
      </PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      <p className="text-sm text-[var(--muted)] -mt-2">{el.autopsy.intro}</p>

      <Card title={el.autopsy.previous}>
        {autopsies.length === 0 ? (
          <Empty>
            {el.autopsy.empty}
            <br />
            <Link href={`/customers/${id}/autopsy/new`} className="btn-secondary mt-3 inline-flex">
              {el.autopsy.new}
            </Link>
          </Empty>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {autopsies.map((a) => (
              <li key={a.id} className="py-3 grid gap-2 sm:grid-cols-[120px_1fr]">
                <div className="text-sm">
                  <div className="font-semibold tabular-nums">{fmtDate(a.date)}</div>
                  {a.userName && (
                    <div className="text-xs text-[var(--muted)]">
                      {el.autopsy.by} {a.userName}
                    </div>
                  )}
                  {(a.code || a.s1Id) && (
                    <div className="mt-1">
                      <Badge tone="blue">{a.code ?? `#${a.s1Id}`}</Badge>
                    </div>
                  )}
                </div>
                <div className="text-sm min-w-0">
                  {a.comments && <p className="whitespace-pre-line">{a.comments}</p>}
                  <div className="mt-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {el.autopsy.equipmentSummary} · {a.equipment.length} {el.autopsy.items}
                    </span>
                    {a.equipment.length === 0 ? (
                      <p className="text-[var(--muted)]">{el.autopsy.noEquipment}</p>
                    ) : (
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {a.equipment.map((e, i) => (
                          <li key={i} className="badge bg-brand-50 text-brand-800">
                            {el.enums.equipmentCategory[e.category]}
                            {(e.manufacturer || e.model) && ` – ${[e.manufacturer, e.model].filter(Boolean).join(" ")}`}
                            {e.purchaseYear ? ` (${e.purchaseYear})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
