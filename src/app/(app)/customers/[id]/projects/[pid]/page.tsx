import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, Card, DoctorLine, Empty, Field, Notice, PageTitle } from "@/components/ui";
import { Select } from "@/components/select";
import { ActionForm } from "@/components/action-form";
import { projectTimelineAction, setProjectStateAction } from "../actions";
import { el } from "@/lib/i18n/el";
import { fmtDate, fmtEur } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProjectDetail, projectLookups } from "@/server/services/project-service";
import { TimelineButton } from "@/components/timeline-button";
import { Icon } from "@/components/icons";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.view };

/**
 * Project screen from getData PRJC (form _CRM_): header and the offers SoftOne links to it (VOPPOFFS).
 * The stage is changed here (PRJC.PRJSTATE); follow-up, close and offer request come next (SOON.projects).
 */
export default async function ProjectViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pid: string }>;
  searchParams: Promise<{ saved?: string; stage?: string; task?: string }>;
}) {
  const { id, pid } = await params;
  const { saved, stage, task } = await searchParams;
  if (SOON.projectDetail) return <ComingSoon title={metadata.title} backHref={`/customers/${id}/projects`} />;
  const [doctor, project, lookups] = await Promise.all([getDoctor(id), getProjectDetail(pid), projectLookups()]);
  if (!doctor || !project || project.doctorId !== id) notFound();
  const latest = project.offers.find((o) => !o.cancelled);

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}/projects`} />
      <PageTitle
        right={
          <div className="flex items-center gap-3">
            {project.state.name && <Badge tone="blue">{project.state.name}</Badge>}
            <TimelineButton id={project.id} load={projectTimelineAction} title={`${el.timeline.title} · ${project.title}`} className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap">
              <Icon.history size={18} />
              {el.timeline.title}
            </TimelineButton>
          </div>
        }
      >
        {project.title}
      </PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      {saved === "state" && <Notice tone="green">{el.projects.stateSaved}</Notice>}
      {saved === "offer" && <Notice tone="green">{el.projects.offerSaved}</Notice>}
      {saved === "offer" && stage === "failed" && <Notice tone="amber">{el.projects.offerStageFailed}</Notice>}
      {saved === "offer" && task === "failed" && <Notice tone="amber">{el.pending.taskCloseFailed}</Notice>}

      <Card>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {row(el.projects.projectCode, <span className="tabular-nums">{project.code}</span>)}
          {row(el.projects.type, project.category.name || "—")}
          {row(el.projects.stage, project.state.name || "—")}
          {row(el.projects.salesperson, project.salesman || "—")}
          {row(el.projects.createdAt, fmtDate(project.createdAt))}
          {row(el.projects.updatedAt, fmtDate(project.updatedAt))}
          {row(el.projects.lastOffer, latest ? fmtDate(latest.date) : "—")}
          {row(el.projects.offerValue, latest ? fmtEur(latest.net) : "—")}
        </dl>
        {!project.active && (
          <p className="mt-3">
            <Badge tone="gray">{el.projects.inactive}</Badge>
          </p>
        )}
        {project.notes && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{el.projects.notesField}</p>
            <p className="mt-0.5 whitespace-pre-line">{project.notes}</p>
          </div>
        )}
      </Card>

      <Card title={el.projects.changeState}>
        <ActionForm action={setProjectStateAction} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <input type="hidden" name="doctorId" value={id} />
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="currentStateId" value={project.state.id ?? ""} />
          <Field label={el.projects.stage} className="flex-1">
            <Select
              name="stateId"
              defaultValue={project.state.id ?? ""}
              ariaLabel={el.projects.stage}
              options={[
                ...(project.state.id ? [] : [{ value: "", label: el.customer.rankSelect }]),
                // a retired (inactive) current stage stays visible so the screen never shows a stage the list lacks
                ...(project.state.id && !lookups.states.some((s) => s.id === project.state.id)
                  ? [{ value: project.state.id, label: project.state.name ?? project.state.id }]
                  : []),
                ...lookups.states.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <button className="btn-primary sm:min-w-40">{el.app.save}</button>
        </ActionForm>
      </Card>

      <Card
        title={
          <span className="flex items-center justify-between gap-3">
            <span>{el.projects.offersTitle}</span>
            {!SOON.projectOffer && (
              <Link href={`/customers/${id}/projects/${project.id}/offers/new`} className="btn-primary normal-case tracking-normal text-sm">
                + {el.projects.newOffer}
              </Link>
            )}
          </span>
        }
      >
        {project.offers.length === 0 ? (
          <Empty>{el.projects.noOffers}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{el.offers.number}</th>
                <th>{el.offers.date}</th>
                <th>{el.projects.offerSeries}</th>
                <th className="text-right">{el.offers.value}</th>
                <th>{el.offers.status}</th>
              </tr>
            </thead>
            <tbody>
              {project.offers.map((o) => (
                <tr key={o.id} className={o.cancelled ? "opacity-60" : undefined}>
                  <td>
                    <span className="font-medium tabular-nums">{o.number}</span>
                    {o.remarks && <span className="block text-xs text-[var(--muted)] line-clamp-1">{o.remarks}</span>}
                  </td>
                  <td className="tabular-nums whitespace-nowrap">{fmtDate(o.date)}</td>
                  <td>{o.series}</td>
                  <td className="text-right tabular-nums font-semibold">{fmtEur(o.net)}</td>
                  <td>
                    {o.cancelled ? (
                      <Badge tone="gray">{el.projects.offerCancelled}</Badge>
                    ) : o.approved ? (
                      <Badge tone="green">{el.projects.offerApproved}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>    </div>
  );
}
