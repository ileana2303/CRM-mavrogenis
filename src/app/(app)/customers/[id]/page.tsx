import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LAST_SEARCH_COOKIE } from "@/lib/constants";
import { BackLink, Badge, Notice, PageTitle } from "@/components/ui";
import { CheckInButtons } from "@/components/check-in-buttons";
import { el } from "@/lib/i18n/el";
import { Icon, type IconName } from "@/components/icons";
import { requireUser } from "@/server/auth/current-user";
import { doctorFullName, getConsent, getDoctor } from "@/server/services/customer-service";
import { openCheckIn } from "@/server/services/checkin-service";
import { pendingForDoctor } from "@/server/services/task-service";
import { listProjectSummaries } from "@/server/services/project-service";
import { SOON } from "@/lib/features";
import { TimelineButton } from "@/components/timeline-button";
import { customerTimelineAction, logCallAction } from "../actions";
import { PhoneWithCallLog } from "@/components/call-log";

export const metadata = { title: el.hub.title };

export default async function HubPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  // «Πίσω» goes up to the customer list, reopening the last search (cookie) when there is one
  const lastQ = (await cookies()).get(LAST_SEARCH_COOKIE)?.value ?? "";
  const backHref = lastQ ? `/customers?q=${encodeURIComponent(lastQ)}` : "/customers";
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const [consent, openRes, pending, projects] = await Promise.all([
    getConsent(id),
    openCheckIn(id, session).then((r) => ({ open: r, error: null as string | null }), (e: unknown) => ({ open: null, error: e instanceof Error ? e.message : String(e) })),
    pendingForDoctor(id),
    SOON.projectList ? null : listProjectSummaries(id),
  ]);
  const open = openRes.open;
  // no open/closed flag in SoftOne yet (isActive = selectable in SoftOne), so the tile counts all projects
  const active = projects?.length ?? 0;

  const tiles: Array<{ href: string; label: string; icon: IconName; meta?: React.ReactNode; soon?: boolean }> = [
    { href: `/customers/${id}/equipment`, label: el.hub.equipment, icon: "stethoscope" },
    { href: `/customers/${id}/visit`, label: el.hub.visit, icon: "pen", soon: SOON.visits },
    { href: `/customers/${id}/projects`, label: el.hub.projects, icon: "briefcase", meta: active ? <Badge tone="blue">{active}</Badge> : null, soon: SOON.projectList },
    { href: `/customers/${id}/offers`, label: el.hub.offers, icon: "file" },
    { href: `/customers/${id}/history`, label: el.hub.history, icon: "chart", soon: SOON.history },
    { href: `/customers/${id}/kpis`, label: el.hub.kpis, icon: "trending", soon: SOON.kpis },
    {
      href: `/customers/${id}/pending`,
      label: el.hub.pending,
      icon: "alarm",
      meta: pending.counts.overdue ? <Badge tone="red">{pending.counts.overdue}</Badge> : pending.counts.open ? <Badge tone="amber">{pending.counts.open}</Badge> : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={backHref} />
      <PageTitle
        right={
          <div className="flex items-center gap-2">
            <TimelineButton
              id={id}
              load={customerTimelineAction}
              title={`${el.timeline.title} · ${doctorFullName(doctor)}`}
              className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Icon.history size={18} />
              {el.timeline.title}
            </TimelineButton>
            <Link href={`/customers/${id}/edit`} className="btn-secondary">
              <Icon.pen size={18} />
              {el.customer.edit}
            </Link>
          </div>
        }
      >
        {el.hub.title}
      </PageTitle>

      {saved && <Notice tone="green">{saved === "call" ? el.callLog.saved : el.app.saved}</Notice>}

      <section className="card p-4 grid gap-1 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-brand-800">
            {el.customer.doctorPrefix} {doctorFullName(doctor)}
          </h2>
          <Link href={`/customers/${id}/consent`} className="text-xs">
            {consent ? <Badge tone="green">GDPR ✓</Badge> : <Badge tone="amber">GDPR –</Badge>}
          </Link>
        </div>
        <Info label={el.customer.clinicAddress} value={[doctor.clinicAddress, doctor.postalCode, doctor.city].filter(Boolean).join(", ")} />
        {doctor.mobile ? (
          <div className="text-sm">
            <span className="text-[var(--muted)]">{el.customer.phone}: </span>
            <PhoneWithCallLog doctorId={id} phone={doctor.mobile} action={logCallAction} />
          </div>
        ) : (
          <Info label={el.customer.phone} value="" />
        )}
        <Info label={el.customer.email} value={doctor.email} href={doctor.email ? `mailto:${doctor.email}` : undefined} />
        <Info label={el.customer.afm} value={doctor.afm} />
        <Info label={el.customer.activityType} value={doctor.activityType ? el.enums.activityType[doctor.activityType] : ""} />
        <Info label={el.customer.rank} value={[doctor.rank ? el.enums.rank[doctor.rank] : "", (doctor.hospitals ?? []).map((h) => h.name).join(", ")].filter(Boolean).join(" · ")} />
      </section>

      {session.role === "SALESPERSON" && openRes.error && (
        <Notice tone="red">
          {el.customer.arrivalTitle}: {el.app.error} — <span className="font-mono text-xs">{openRes.error}</span>
        </Notice>
      )}
      {session.role === "SALESPERSON" && <CheckInButtons doctorId={id} open={open ? { arrivedAt: open.arrivedAt } : null} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Ic = Icon[t.icon];
          if (t.soon)
            return (
              <div key={t.href} className="tile opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none" aria-disabled>
                <span className="tile-icon from-gray-100 to-gray-200 text-gray-500">
                  <Ic size={24} />
                </span>
                <span className="font-semibold text-brand-800 leading-tight">
                  {t.label}
                  <span className="block text-xs font-normal text-[var(--muted)]">{el.app.comingSoon}</span>
                </span>
              </div>
            );
          return (
            <Link key={t.href} href={t.href} className="tile">
              <span className="tile-icon">
                <Ic size={24} />
              </span>
              <span className="flex items-center gap-2 font-semibold text-brand-800 leading-tight">
                {t.label}
                {t.meta}
              </span>
            </Link>
          );
        })}
        <div className="tile opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none" aria-disabled>
          <span className="tile-icon from-gray-100 to-gray-200 text-gray-500">
            <Icon.wrench size={24} />
          </span>
          <span className="font-semibold text-brand-800 leading-tight">
            {el.hub.service}
            <span className="block text-xs font-normal text-[var(--muted)]">{el.app.comingSoon}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, href }: { label: string; value?: string; href?: string }) {
  const v = value || "—";
  return (
    <div className="text-sm">
      <span className="text-[var(--muted)]">{label}: </span>
      {href && value ? (
        <a href={href} className="font-medium text-brand-700 underline-offset-2 hover:underline">
          {v}
        </a>
      ) : (
        <span className="font-medium">{v}</span>
      )}
    </div>
  );
}
