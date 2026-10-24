import { notFound } from "next/navigation";
import { BackLink, Field, Notice, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { fmtDate, fmtEur } from "@/lib/format";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { getProject } from "@/server/services/project-service";
import { closeProjectAction } from "../../actions";

export const metadata = { title: el.close.title };

export default async function ClosePage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const [doctor, project] = await Promise.all([getDoctor(id), getProject(pid)]);
  if (!doctor || !project) notFound();
  const back = `/customers/${id}/projects/${pid}`;

  return (
    <form action={closeProjectAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={pid} />
      <BackLink href={back} />
      <PageTitle>{el.close.title}</PageTitle>

      <div className="card p-4 text-sm flex flex-col gap-1">
        <div>
          {el.projects.project}: <b>{project.title}</b> • {el.customer.doctorPrefix}: <b>{doctorFullName(doctor)}</b> • {el.projects.projectCode}: <b className="font-mono">{project.code}</b>
        </div>
        <div className="text-[var(--muted)]">
          {el.projects.lastOffer}: {fmtDate(project.lastOfferDate)} | {el.close.value}: {fmtEur(project.value)} | {el.projects.status}:{" "}
          {project.status === "ACTIVE" ? el.close.statusActive : el.close.statusDone}
        </div>
      </div>

      {project.status === "CLOSED" && <Notice tone="blue">{el.projects.closed}</Notice>}

      <div className="flex flex-col gap-3">
        {project.lines.map((l) => (
          <div key={l.lineNo} className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--muted)]">
                  {el.projects.no} {l.lineNo} · {el.projects.productCode}
                </span>
                <div className="font-mono font-semibold">{l.productCode}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--muted)]">{el.close.value}</span>
                <div className="font-bold tabular-nums">{fmtEur(l.offerPrice)}</div>
              </div>
            </div>
            <Field label={el.close.closing}>
              <select name={`won_${l.lineNo}`} className="input" defaultValue={l.won === true ? "YES" : "NO"}>
                <option value="YES">{el.app.yes}</option>
                <option value="NO">{el.app.no}</option>
              </select>
            </Field>
            <Field label={el.close.competitor}>
              <input name={`competitor_${l.lineNo}`} className="input" defaultValue={l.competitor ?? ""} placeholder="OMMALITE" />
            </Field>
            <Field label={el.close.competitorModel}>
              <input name={`competitorModel_${l.lineNo}`} className="input" defaultValue={l.competitorModel ?? ""} placeholder="Ultra" />
            </Field>
            <Field label={el.close.competitorPrice}>
              <input name={`competitorPrice_${l.lineNo}`} type="number" min={0} step="0.01" className="input" defaultValue={l.competitorPrice ?? ""} placeholder="32000" />
            </Field>
            <Field label={el.close.comments} className="sm:col-span-2 lg:col-span-4">
              <input name={`comments_${l.lineNo}`} className="input" defaultValue={l.closeComments ?? ""} placeholder="Του έδωσε και εγγύηση 5 έτη" />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button className="btn-danger">{el.close.confirm}</button>
      </div>
    </form>
  );
}
