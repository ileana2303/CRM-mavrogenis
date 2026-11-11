/**
 * Features whose SoftOne endpoints are not built yet. Their screens show «Σύντομα διαθέσιμο» and never call
 * SoftOne; the provider methods behind them throw NotImplemented. Set a flag to false once the endpoint exists.
 */
export const SOON = {
  visits: true, // visits.* – Καταγραφή επίσκεψης
  projects: true, // projects.*, offers.create/update – Έργα / προσφορές έργου
  history: true, // stats.doctorHistory – Ιστορικό πελάτη
  kpis: true, // stats.target / stats.turnover (+ visits, projects) – KPIs
  checkInLog: true, // checkIns.list – Αφίξεις (manager)
} as const;
