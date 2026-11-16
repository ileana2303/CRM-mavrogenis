import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, DoctorLine, Empty, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { fmtDate } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listProjectSummaries } from "@/server/services/project-service";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.title };

/**
 * A doctor's projects from api.crm.customers/projects (code, title, type, stage, active, dates). Value / offer date and the
 * project screens behind a row come once SoftOne returns them (SOON.projects); until then rows don't open.
 */
export default async function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.projectList) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const [doctor, projects] = await Promise.all([getDoctor(id), listProjectSummaries(id)]);
  if (!doctor) notFound();

  const stage = (p: (typeof projects)[number]) => (p.state.name ? <Badge tone="blue">{p.state.name}</Badge> : "—");
  // isActive = selectable in SoftOne (not open/closed): only a retired project gets a tag
  const retired = (active: boolean) => (active ? null : <Badge tone="gray">{el.projects.inactive}</Badge>);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} />
      <PageTitle
        right={
          SOON.projects ? null : (
            <Link href={`/customers/${id}/projects/new`} className="btn-primary">
              {el.projects.newProject}
            </Link>
          )
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
                  <th>{el.projects.type}</th>
                  <th>{el.projects.stage}</th>
                  <th>{el.projects.createdAt}</th>
                  <th>{el.projects.updatedAt}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id}>
                    <td className="tabular-nums">{i + 1}</td>
                    <td>
                      <span className="font-medium">{p.title}</span> {retired(p.active)}
                      <span className="block text-xs text-[var(--muted)]">{p.code}</span>
                    </td>
                    <td>{p.category.name || "—"}</td>
                    <td>{stage(p)}</td>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td>{fmtDate(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden flex flex-col gap-3">
            {projects.map((p) => (
              <li key={p.id} className="card p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {p.code} · {p.category.name || "—"} · {el.projects.updatedAt}: {fmtDate(p.updatedAt)}
                  </div>
                  {p.state.name && <div className="mt-1">{stage(p)}</div>}
                </div>
                {retired(p.active)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
