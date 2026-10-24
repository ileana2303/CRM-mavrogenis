import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Badge, Notice, PageTitle } from "@/components/ui";
import { CheckInButtons } from "@/components/check-in-buttons";
import { el } from "@/lib/i18n/el";
import { requireUser } from "@/server/auth/current-user";
import { doctorFullName, getConsent, getDoctor } from "@/server/services/customer-service";
import { openCheckIn } from "@/server/services/checkin-service";
import { pendingForDoctor } from "@/server/services/task-service";
import { listProjects } from "@/server/services/project-service";

export const metadata = { title: el.hub.title };

export default async function HubPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const [consent, open, pending, projects] = await Promise.all([getConsent(id), openCheckIn(id, session), pendingForDoctor(id), listProjects(id)]);
  const active = projects.filter((p) => p.status === "ACTIVE").length;

  const tiles: Array<{ href: string; label: string; icon: string; meta?: React.ReactNode }> = [
    { href: `/customers/${id}/equipment`, label: el.hub.equipment, icon: "🩺" },
    { href: `/customers/${id}/visit`, label: el.hub.visit, icon: "📝" },
    { href: `/customers/${id}/projects`, label: el.hub.projects, icon: "💼", meta: active ? <Badge tone="blue">{active}</Badge> : null },
    { href: `/customers/${id}/offers`, label: el.hub.offers, icon: "📄" },
    { href: `/customers/${id}/history`, label: el.hub.history, icon: "📊" },
    { href: `/customers/${id}/kpis`, label: el.hub.kpis, icon: "📈" },
    {
      href: `/customers/${id}/pending`,
      label: el.hub.pending,
      icon: "⏰",
      meta: pending.counts.overdue ? <Badge tone="red">{pending.counts.overdue}</Badge> : pending.counts.open ? <Badge tone="amber">{pending.counts.open}</Badge> : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/customers" />
      <PageTitle
        right={
          <Link href={`/customers/${id}/edit`} className="btn-secondary">
            {el.customer.edit}
          </Link>
        }
      >
        {el.hub.title}
      </PageTitle>

      {saved && <Notice tone="green">{el.app.saved}</Notice>}

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
        <Info label={el.customer.phone} value={doctor.mobile} href={doctor.mobile ? `tel:${doctor.mobile}` : undefined} />
        <Info label={el.customer.email} value={doctor.email} href={doctor.email ? `mailto:${doctor.email}` : undefined} />
        <Info label={el.customer.afm} value={doctor.afm} />
        <Info label={el.customer.activityType} value={doctor.activityType ? el.enums.activityType[doctor.activityType] : ""} />
        <Info label={el.customer.rank} value={[doctor.rank ? el.enums.rank[doctor.rank] : "", doctor.hospital].filter(Boolean).join(" · ")} />
      </section>

      {session.role === "SALESPERSON" && <CheckInButtons doctorId={id} open={open ? { arrivedAt: open.arrivedAt } : null} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="tile">
            <span className="text-2xl" aria-hidden>
              {t.icon}
            </span>
            <span className="flex items-center gap-2 font-semibold text-brand-800 leading-tight">
              {t.label}
              {t.meta}
            </span>
          </Link>
        ))}
        <div className="tile opacity-70 cursor-not-allowed" aria-disabled>
          <span className="text-2xl" aria-hidden>
            🔧
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
