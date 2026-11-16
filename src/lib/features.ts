/**
 * Features whose SoftOne endpoints are not built yet. Their screens show «Σύντομα διαθέσιμο» and never call
 * SoftOne; the provider methods behind them throw NotImplemented. Set a flag to false once the endpoint exists.
 */
export const SOON = {
  visits: true, // visits.* – Καταγραφή επίσκεψης
  projectCreate: false, // projects.createForDoctor – «Νέο Project» (setData PRJC, form _CRM_)
  projectList: false, // projects.summariesByDoctor – a doctor's project list (api.crm.customers/projects)
  projectOffer: false, // offers.createForProject – «Νέα προσφορά» inside a project (setData SALDOC _CRM_)
  projectDetail: false, // projects.detail – project screen (getData PRJC _CRM_): header + offers, stage change
  projects: true, // old project screens: close / revise / follow-up, offers.create/update, project events
  history: true, // stats.doctorHistory – Ιστορικό πελάτη
  kpis: true, // stats.target / stats.turnover (+ visits, projects) – KPIs
  checkInLog: true, // checkIns.list – Αφίξεις (manager)
} as const;
