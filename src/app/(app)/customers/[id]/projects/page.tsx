import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { StageBadge } from "@/components/project-badges";
import { el } from "@/lib/i18n/el";
import { fmtDate, fmtEur } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listProjects } from "@/server/services/project-service";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.title };

export default async function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.projects) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const projects = await listProjects(id);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle
        right={
          <Link href={`/customers/${id}/projects/new`} className="btn-primary">
            {el.projects.newProject}
          </Link>
        }
      >
        {el.projects.title}
      </PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      {projects.length === 0 ? (
        <div className="card">
          <Empty>{el.projects.empty}</Empty>
        </div>
      ) : (
        <>
          <div className="hidden md:block card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">{el.projects.no}</th>
                  <th>{el.projects.project}</th>
                  <th>{el.projects.stage}</th>
                  <th className="text-right">{el.projects.value}</th>
                  <th>{el.projects.offerDate}</th>
                  <th>{el.projects.open}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id}>
                    <td className="tabular-nums">{i + 1}</td>
                    <td>
                      <span className="font-medium">{p.title}</span>
                      <span className="block text-xs text-[var(--muted)]">{p.code}</span>
                    </td>
                    <td>
                      <StageBadge stage={p.stage} />
                    </td>
                    <td className="text-right tabular-nums">{p.value ? fmtEur(p.value) : "—"}</td>
                    <td>{fmtDate(p.lastOfferDate)}</td>
                    <td>
                      <Link href={`/customers/${id}/projects/${p.id}`} className="text-brand-700 font-semibold hover:underline">
                        {el.app.view}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden flex flex-col gap-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/customers/${id}/projects/${p.id}`} className="card p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {p.code} · {el.projects.offerDate}: {fmtDate(p.lastOfferDate)}
                    </div>
                    <div className="mt-1">
                      <StageBadge stage={p.stage} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{p.value ? fmtEur(p.value) : "—"}</div>
                    <div className="text-xs text-brand-700">{el.app.view}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
