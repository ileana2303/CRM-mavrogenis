import { db } from "../data";
import type { DateRange } from "../data/provider";
import type { DailyReport, DailyReportItem } from "../domain/types";
import { doctorFullName } from "./customer-service";

const today = () => new Date().toISOString().slice(0, 10);

export function defaultRange(): DateRange {
  const t = today();
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return { from: t, to: d.toISOString().slice(0, 10) };
}

/** Αναφορά Ημέρας for one salesperson. */
export async function dailyReport(userId: string, range: DateRange): Promise<DailyReport> {
  const errors: string[] = [];
  const safe = <T,>(label: string, p: Promise<T[]>) =>
    p.catch((e: unknown) => {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      return [] as T[];
    });
  const [visits, followUps, tasks, offers, projects] = await Promise.all([
    safe("visits", db().visits.listByUser(userId)),
    safe("followUps", db().projects.listFollowUpsByUser(userId, range)),
    safe("tasks", db().tasks.listByUser(userId)),
    safe("offers", db().offers.listByRequester(userId)),
    safe("projects", db().projects.listByUser(userId)),
  ]);
  const doctorIds = new Set<string>();
  [...visits, ...tasks, ...offers].forEach((x) => doctorIds.add(x.doctorId));
  projects.forEach((p) => doctorIds.add(p.doctorId));
  // names only – a SoftOne hiccup here must not take the whole report down
  const doctors = await db()
    .doctors.findByIds([...doctorIds])
    .catch((e: unknown) => {
      errors.push(`names: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    });
  const name = (id: string) => {
    const d = doctors.find((x) => x.id === id);
    return d ? doctorFullName(d) : "—";
  };
  const inRange = (d?: string) => !!d && d >= range.from && d <= range.to;
  const projectOf = (id?: string) => projects.find((p) => p.id === id);

  // Ραντεβού πελατών: next-action dates set on visits
  const appointments: DailyReportItem[] = visits
    .filter((v) => inRange(v.nextActionDate))
    .map((v) => ({
      kind: "APPOINTMENT" as const,
      date: v.nextActionDate!,
      doctorId: v.doctorId,
      doctorName: name(v.doctorId),
      projectId: v.projectId,
      title: v.comment || "Επόμενη ενέργεια",
      href: `/customers/${v.doctorId}`,
    }));

  // Follow-ups προσφορών: follow-up next actions + tasks coming from follow-ups
  const offerFollowUps: DailyReportItem[] = [
    ...followUps
      .filter((f) => inRange(f.nextActionDate))
      .map((f) => {
        const p = projectOf(f.projectId);
        return {
          kind: "OFFER_FOLLOWUP" as const,
          date: f.nextActionDate!,
          doctorId: p?.doctorId ?? "",
          doctorName: p ? name(p.doctorId) : "—",
          projectId: f.projectId,
          title: p ? `${p.title} (${p.code})` : "Follow-up",
          href: p ? `/customers/${p.doctorId}/projects/${p.id}` : "/dashboard",
        };
      }),
    ...tasks
      .filter((t) => t.status === "OPEN" && t.source === "FOLLOW_UP" && inRange(t.dueDate))
      .map((t) => ({
        kind: "OFFER_FOLLOWUP" as const,
        date: t.dueDate,
        doctorId: t.doctorId,
        doctorName: name(t.doctorId),
        projectId: t.projectId,
        title: t.title,
        href: t.projectId ? `/customers/${t.doctorId}/projects/${t.projectId}` : `/customers/${t.doctorId}/pending`,
      })),
  ];

  // Εκπρόθεσμες δεσμεύσεις: open tasks past due (regardless of range)
  const overdue: DailyReportItem[] = tasks
    .filter((t) => t.status === "OPEN" && t.dueDate < today())
    .map((t) => ({
      kind: "OVERDUE" as const,
      date: t.dueDate,
      doctorId: t.doctorId,
      doctorName: name(t.doctorId),
      projectId: t.projectId,
      title: t.title,
      href: `/customers/${t.doctorId}/pending`,
    }));

  // Εκκρεμείς προσφορές από τμήμα υποστήριξης: priced but not yet acknowledged, or still requested
  const pendingOffers: DailyReportItem[] = offers
    .filter((o) => o.status === "REQUESTED" || (o.status === "PRICED" && !o.acknowledgedAt))
    .map((o) => ({
      kind: "PENDING_OFFER" as const,
      date: (o.answeredAt ?? o.requestedAt).slice(0, 10),
      doctorId: o.doctorId,
      doctorName: name(o.doctorId),
      projectId: o.projectId,
      title: `${o.title} – ${o.number}/V${o.version} ${o.status === "PRICED" ? "(τιμολογήθηκε)" : "(σε αναμονή)"}`,
      href: `/customers/${o.doctorId}/projects/${o.projectId}`,
    }));

  const byDate = (a: DailyReportItem, b: DailyReportItem) => a.date.localeCompare(b.date);
  return {
    appointments: appointments.sort(byDate),
    offerFollowUps: offerFollowUps.sort(byDate),
    overdue: overdue.sort(byDate),
    pendingOffers: pendingOffers.sort(byDate),
    errors,
  };
}
