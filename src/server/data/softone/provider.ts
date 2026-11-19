/**
 * SoftOne adapter. Implemented against the JS endpoints that exist today (docs/SOFTONE-API.md);
 * every other method throws NotImplemented so misconfiguration is loud.
 *
 * The per-user SoftOne clientID is taken from the CRM session cookie (login is per user).
 */
import { redirect } from "next/navigation";
import { getSession } from "../../auth/session";
import type { CheckIn, Doctor, MachineCatalog, MachineRef, ProjectSummary, Task, User } from "../../domain/types";
import type { DataProvider, DoctorSearch } from "../provider";
import { S1Client, S1Error, s1ConfigFromEnv } from "./client";
import { CRM_FORM, arrivalToSetData, departureToSetData, doctorToSetData, rowToCheckIn, rowToConsent, rowToTask, taskPatchToSetData, taskToSetData, NEXT_ACTION_OBJECT, ACTION_OBJECT, nextActionToSetData, callLogToSetData, rowToTimelineEntry, rowToDocTimelineEntry, type S1TimelineRow, type S1PendingArrivalRow, type S1PendingRow, doctorUpdateDelta, rowToDoctor, rowToEquipment, rowToHospital, machinesToSetData, rowToOffer, rowToProduct, type S1CustomerRow, type S1HospitalRow, type S1ProjectRow, rowToProjectSummary, projectToSetData, prjcToDetail, projectOfferToSetData, calcToOffer, type S1OfferRow, type S1ProductRow, dashboardToReport, type S1DashboardResponse } from "./mappers";

class NotImplemented extends Error {
  constructor(what: string) {
    super(`SoftOneProvider.${what}: the SoftOne endpoint is not built yet (see docs/SOFTONE-API.md)`);
  }
}
const todo = (what: string) => async (): Promise<never> => {
  throw new NotImplemented(what);
};

export const s1 = new S1Client(s1ConfigFromEnv());
const offerSeries = () => Number(process.env.S1_OFFER_SERIES ?? 7015);
const arrivalSeries = () => Number(process.env.S1_ARRIVAL_SERIES ?? 2001);
const taskSeries = () => Number(process.env.S1_TASK_SERIES ?? 3000);
const nextActionSeries = {
  CALL: () => Number(process.env.S1_CALL_SERIES ?? 1000),
  EMAIL: () => Number(process.env.S1_EMAIL_SERIES ?? 1003),
  MEETING: () => Number(process.env.S1_MEETING_SERIES ?? 2003),
};
/** statuses shown in the CRM: everything except 4 Ακυρώθηκε */
const TASK_STATUSES = "0,1,2,3,5,6";
/** not done, not cancelled */
const OPEN_STATUSES = "0,1,2,5,6";
const pendingSeries = () => ({ arrival: arrivalSeries(), email: nextActionSeries.EMAIL() });

async function clientId(): Promise<string> {
  const s = await getSession();
  if (!s?.s1ClientId) redirect("/login?expired=1");
  return s.s1ClientId;
}

/** PRSN of the logged-in SoftOne user (api.crm/me) – the salesman identity for ACTPRSN. */
async function sessionPrsn(): Promise<string> {
  const s = await getSession();
  const prsn = s?.s1Prsn ?? s?.userId;
  if (!prsn) redirect("/login?expired=1");
  return prsn;
}

/** Runs a JS call; an expired SoftOne session sends the user back to login. */
async function js<T>(script: string, fn: string, params: Record<string, unknown>) {
  const cid = await clientId();
  try {
    return await s1.js<T>(cid, script, fn, params);
  } catch (e) {
    if (e instanceof S1Error && /login|credentials|clientid/i.test(e.message)) redirect("/login?expired=1");
    throw e;
  }
}

/** Single doctor – read only through the owner's endpoint api.crm.customers/getData. */
async function customerById(id: string): Promise<Doctor | null> {
  if (!/^\d+$/.test(id)) return null;
  try {
    const res = await js<S1CustomerRow[]>("api.crm.customers", "getData", { trdr: Number(id) });
    const row = res.data?.[0];
    return row ? rowToDoctor(row) : null;
  } catch (e) {
    if (e instanceof S1Error && /no data/i.test(e.message)) return null;
    throw e;
  }
}

/** api.crm/bootstrap master row: { id, code, name, isActive, mark? } */
type S1MasterRow = { id: string | number; code?: string; name?: string; isActive?: string | number; mark?: string | number; markId?: string | number };
/** selectable rows as refs; sorted by name unless `keepOrder` (a pipeline like prjState keeps SoftOne's order) */
const toRefs = (rows: S1MasterRow[] | undefined, keepOrder = false): MachineRef[] =>
  (rows ?? [])
    .filter((r) => String(r.isActive ?? "1") !== "0")
    .map((r) => {
      const mark = r.markId ?? r.mark;
      return { id: String(r.id), code: String(r.code ?? r.id), name: r.name ?? "", ...(mark !== undefined && mark !== null && mark !== "" ? { markId: String(mark) } : {}) };
    })
    .sort((a, b) => (keepOrder ? 0 : a.name.localeCompare(b.name, "el")));

// master data is the same for every user → short in-memory cache
// api.crm/bootstrap: the master lists (machine catalog, project states / categories, …), cached 5 min
type S1Bootstrap = {
  machine?: { categories?: S1MasterRow[]; marks?: S1MasterRow[]; models?: S1MasterRow[] };
  prjc?: { prjState?: S1MasterRow[]; prjCategory?: S1MasterRow[] };
};
let bootstrapCache: { at: number; data: S1Bootstrap } | null = null;
const CATALOG_TTL = 5 * 60_000;
async function bootstrap(): Promise<S1Bootstrap> {
  if (bootstrapCache && Date.now() - bootstrapCache.at < CATALOG_TTL) return bootstrapCache.data;
  const data = (await js<never>("api.crm", "bootstrap", {})) as unknown as S1Bootstrap;
  bootstrapCache = { at: Date.now(), data };
  return data;
}
/** id → name for every row, inactive included: an old project may still point at a retired state */
const nameById = (rows: S1MasterRow[] | undefined) => new Map((rows ?? []).map((r) => [String(r.id), r.name ?? ""]));

export const softOneProvider: DataProvider = {
  name: "softone",

  users: {
    // Users are authenticated by SoftOne itself (auth-service → s1.login + api.crm/me).
    findByUsername: todo("users.findByUsername"),
    // no single-user endpoint: api.crm/users is small, so look the PRSN up in it
    async findById(id) {
      return (await softOneProvider.users.list()).find((u) => u.id === id) ?? null;
    },
    // api.crm/users → PRSN rows { prsn, name, crmRole, manager, isActive }; the PRSN id is the user id in the CRM
    async list(): Promise<User[]> {
      const res = await js<Array<{ prsn: string | number; name?: string; crmRole?: number | string; manager?: string | number; isActive?: string | number }>>("api.crm", "users", {});
      return (res.data ?? [])
        .filter((u) => String(u.isActive ?? "1") !== "0")
        .map((u) => ({
          id: String(u.prsn),
          username: "",
          passwordHash: "",
          fullName: u.name ?? "",
          role: String(u.crmRole) === "2" ? "MANAGER" : String(u.crmRole) === "3" ? "SUPPORT" : "SALESPERSON",
          salesPersonCode: String(u.prsn),
          managerId: u.manager !== undefined && u.manager !== null ? String(u.manager) : undefined,
        }));
    },
  },

  doctors: {
    async timeline(doctorId) {
      if (!/^\d+$/.test(doctorId)) throw new Error(`Μη έγκυρος πελάτης: ${doctorId}`);
      const res = await js<S1TimelineRow[]>("api.crm.customers", "getTimeline", { trdr: Number(doctorId) });
      // AMNT here is the document total (VAT included); the project timeline sends the net value
      return (res.data ?? []).map((r) => rowToDocTimelineEntry(r, "TOTAL"));
    },
    async search(q: DoctorSearch) {
      // S1_DOCTORS_ONLY=0 searches all customers – useful until CCCISDOCTOR is set on the doctors
      const params: Record<string, unknown> = { page: 1, pageSize: 60 };
      if (process.env.S1_DOCTORS_ONLY !== "0") params.isDoctor = 1;
      // api.crm.customers/list filters: name (NAME LIKE), afm, mobilePhone (TRDEXTRA.VARCHAR03), phone02
      // simple search: q over all fields (owner's endpoint, 2026-11-10); the separate fields stay as a fallback
      if (q.q?.trim()) params.q = q.q.trim();
      const name = [q.lastName, q.firstName].filter((s) => s && s.trim()).join(" ");
      if (name) params.name = name;
      if (q.afm?.trim()) params.afm = q.afm.trim();
      if (q.mobile?.trim()) params.mobilePhone = q.mobile.trim();
      if (!params.q && !params.name && !params.afm && !params.mobilePhone) return [];
      const res = await js<S1CustomerRow[]>("api.crm.customers", "list", params);
      return (res.data ?? []).map(rowToDoctor);
    },
    findById: customerById,
    async findByIds(ids) {
      // at most 4 getData calls in flight – a full parallel burst makes SoftOne answer HTTP 503
      const queue = [...new Set(ids)];
      const out: Doctor[] = [];
      const worker = async () => {
        for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
          const d = await customerById(id);
          if (d) out.push(d);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
      return out;
    },
    // Create/update go through the standard CUSTOMER object (setData) – decided 2026-10-25.
    async create(d) {
      const cid = await clientId();
      const session = await getSession();
      const payload = doctorToSetData(d);
      if (session?.s1Salesman) payload.CUSTOMER[0].SALESMAN = Number(session.s1Salesman); // decided 2026-11-10: owner = logged-in PRSN
      const res = await s1.setData(cid, "CUSTOMER", payload, undefined, CRM_FORM);
      const id = String(res.id);
      return (await customerById(id)) ?? { ...d, id };
    },
    async update(id, patch) {
      const cid = await clientId();
      const current = await customerById(id);
      if (!current) throw new S1Error(`CUSTOMER ${id} not found`);
      const delta = doctorUpdateDelta(patch, current); // header delta + full detail only if the links changed
      if (Object.keys(delta).length) await s1.setData(cid, "CUSTOMER", delta, Number(id), CRM_FORM);
      return (await customerById(id)) ?? current;
    },
    // Συγκατάθεση: signature PNG → api.crm.customers/setSignature { trdr, data (base64), size, name } – decided 2026-11-10.
    // Channels (email/sms/phone/viber) have no SoftOne field yet; the hybrid provider keeps them locally.
    async saveConsent(c) {
      const base64 = c.signaturePng.replace(/^data:image\/\w+;base64,/, "");
      const size = Buffer.from(base64, "base64").length;
      await js("api.crm.customers", "setSignature", { trdr: Number(c.doctorId), data: base64, size, name: c.signerName });
      return { ...c, id: `s1-${c.doctorId}` };
    },
    // read: the `signatures` array of api.crm.customers/getData (decided 2026-11-10)
    async getConsent(doctorId) {
      if (!/^\d+$/.test(doctorId)) return null;
      const res = await js<S1CustomerRow[]>("api.crm.customers", "getData", { trdr: Number(doctorId) });
      const row = res.data?.[0];
      return row ? rowToConsent(row) : null;
    },
  },

  equipment: {
    // read: machines[] of api.crm.customers/getData (owner, 2026-11-11); names from the bootstrap catalog
    async listByDoctor(doctorId) {
      if (!/^\d+$/.test(doctorId)) return [];
      const [res, catalog] = await Promise.all([
        js<S1CustomerRow[]>("api.crm.customers", "getData", { trdr: Number(doctorId) }),
        softOneProvider.stats.machineCatalog(),
      ]);
      return (res.data?.[0]?.machines ?? []).map((m, i) => rowToEquipment(m, doctorId, i, catalog));
    },
    // write: setData CUSTOMER / _CRM_ / CCCTRDMACHINES, line deltas against what SoftOne has now
    async replaceForDoctor(doctorId, rows) {
      const cid = await clientId();
      const current = await softOneProvider.equipment.listByDoctor(doctorId);
      const payload = machinesToSetData(rows, current);
      if (payload) await s1.setData(cid, "CUSTOMER", payload, Number(doctorId), CRM_FORM);
      return softOneProvider.equipment.listByDoctor(doctorId);
    },
  },
  visits: { listByDoctor: todo("visits.listByDoctor"), listByUser: todo("visits.listByUser"), listAll: todo("visits.listAll"), create: todo("visits.create") },
  projects: {
    listByDoctor: todo("projects.listByDoctor"),
    // api.crm.customers/projects {trdr, page, pageSize} → { totalCount, data: [{ prjc, code, name, isActive, prjState, prjCategory, insDate, updDate }] }
    // prjState / prjCategory = ids into api.crm/bootstrap prjc.{prjState, prjCategory} (owner, 2026-11-16)
    async createForDoctor(p, salesmanId) {
      const cid = await clientId();
      const res = await s1.setData(cid, "PRJC", projectToSetData(p, salesmanId), undefined, CRM_FORM);
      if (!res.id) throw new S1Error("setData PRJC returned no id");
      return { id: String(res.id) };
    },
    // getData PRJC form _CRM_ key = prjc: header + VOPPOFFS (owner, 2026-11-16: "everything is there")
    async detail(id) {
      const cid = await clientId();
      try {
        const res = await s1.getData(cid, "PRJC", Number(id), undefined, CRM_FORM);
        return prjcToDetail(res.data ?? {});
      } catch (e) {
        if (e instanceof S1Error && /login|credentials|clientid/i.test(e.message)) redirect("/login?expired=1");
        throw e;
      }
    },
    async setState(id, stateId) {
      const cid = await clientId();
      await s1.setData(cid, "PRJC", { PRJC: [{ PRJSTATE: Number(stateId) }] }, Number(id), CRM_FORM);
    },
    async summariesByDoctor(doctorId) {
      const prjc = (await bootstrap()).prjc ?? {};
      const lookups = { states: nameById(prjc.prjState), categories: nameById(prjc.prjCategory) };
      const out: ProjectSummary[] = [];
      for (let page = 1; ; page++) {
        const res = await js<S1ProjectRow[]>("api.crm.customers", "projects", { trdr: Number(doctorId), page, pageSize: 100 });
        const rows = res.data ?? [];
        out.push(...rows.map((r) => rowToProjectSummary(r, lookups)));
        if (rows.length === 0 || out.length >= Number(res.totalCount ?? 0)) return out;
      }
    },
    async timeline(projectId) {
      if (!/^\d+$/.test(projectId)) throw new Error(`Μη έγκυρο project: ${projectId}`);
      const res = await js<S1TimelineRow[]>("api.crm.projects", "getTimeline", { prjc: Number(projectId) });
      // AMNT here is the net value; the customer timeline sends the total
      return (res.data ?? []).map((r) => rowToDocTimelineEntry(r, "NET"));
    },
    listByUser: todo("projects.listByUser"),
    listAll: todo("projects.listAll"),
    findById: todo("projects.findById"),
    create: todo("projects.create"),
    update: todo("projects.update"),
    nextSequence: todo("projects.nextSequence"),
    listEvents: todo("projects.listEvents"),
    addEvent: todo("projects.addEvent"),
    listFollowUps: todo("projects.listFollowUps"),
    listFollowUpsByUser: todo("projects.listFollowUpsByUser"),
    addFollowUp: todo("projects.addFollowUp"),
  },
  offers: {
    // Decided 2026-11-10: the doctor's tab shows offers of ALL series (read); the CRM writes only to series 7015.
    async listByDoctor(doctorId) {
      const res = await js<S1OfferRow[]>("api.crm.offers", "list", { trdr: Number(doctorId), page: 1, pageSize: 200 });
      return (res.data ?? []).map(rowToOffer).sort((a, b) => b.date.localeCompare(a.date));
    },
    async createForProject(o, salesmanId) {
      const cid = await clientId();
      const res = await s1.setData(cid, "SALDOC", projectOfferToSetData(o, offerSeries(), salesmanId), undefined, CRM_FORM);
      if (!res.id) throw new S1Error("setData SALDOC returned no id");
      return { id: String(res.id) };
    },
    async calculateForProject(o, salesmanId) {
      const cid = await clientId();
      const res = await s1.calculate(cid, "SALDOC", projectOfferToSetData(o, offerSeries(), salesmanId), CRM_FORM);
      return calcToOffer(res.data ?? {}, o.lines.length);
    },
    async listByProject(projectId) {
      const res = await js<S1OfferRow[]>("api.crm.offers", "list", { cccproject: Number(projectId), series: offerSeries(), page: 1, pageSize: 50 });
      return (res.data ?? []).map(rowToOffer).sort((a, b) => b.version - a.version);
    },
    async listByRequester(userId) {
      const res = await js<S1OfferRow[]>("api.crm.offers", "list", { cccrequestedby: Number(userId), series: offerSeries(), page: 1, pageSize: 200 });
      return (res.data ?? []).map(rowToOffer);
    },
    async listAll() {
      const res = await js<S1OfferRow[]>("api.crm.offers", "list", { series: offerSeries(), page: 1, pageSize: 500 });
      return (res.data ?? []).map(rowToOffer);
    },
    async findById(id) {
      try {
        const res = await js<S1OfferRow[]>("api.crm.offers", "getData", { findoc: Number(id) });
        return res.data?.[0] ? rowToOffer(res.data[0]) : null;
      } catch (e) {
        if (e instanceof S1Error && /no data/i.test(e.message)) return null;
        throw e;
      }
    },
    // setData SALDOC (series 7015) – enabled once the CCC fields exist on FINDOC/MTRLINES
    create: todo("offers.create"),
    update: todo("offers.update"),
  },
  // Εκκρεμότητες + calls/emails/meetings – api.crm.actions/getPendings (extended by him 2026-11-19)
  tasks: {
    async listByDoctor(doctorId): Promise<Task[]> {
      return (await this.pendingsByDoctor(doctorId)).tasks;
    },
    // with trdr and no prsn: every salesperson's items for the customer (his decision 2026-11-19), plus the customer's
    // projects as a top-level `projects` array – the picker for a new Εκκρεμότητα.
    async pendingsByDoctor(doctorId) {
      const prsn = await sessionPrsn();
      const [res, boot] = await Promise.all([
        js<S1PendingRow[]>("api.crm.actions", "getPendings", { trdr: Number(doctorId), actStatus: TASK_STATUSES }),
        bootstrap(),
      ]);
      const lookups = { states: nameById(boot.prjc?.prjState), categories: nameById(boot.prjc?.prjCategory) };
      const projectRows = (res as { projects?: S1ProjectRow[] }).projects ?? [];
      return {
        tasks: (res.data ?? []).map((r) => rowToTask(r, doctorId, prsn, pendingSeries())).filter((t): t is Task => !!t),
        projects: projectRows.map((r) => rowToProjectSummary(r, lookups)),
      };
    },
    // without trdr: the logged-in salesperson's open items across customers, dated up to `toDate` («Η μέρα μου»)
    async listByUser(userId, toDate): Promise<Task[]> {
      const prsn = await sessionPrsn();
      const res = await js<S1PendingRow[]>("api.crm.actions", "getPendings", { prsn: Number(prsn), actStatus: OPEN_STATUSES, ...(toDate ? { toDate } : {}) });
      return (res.data ?? []).map((r) => rowToTask(r, "", userId, pendingSeries())).filter((t): t is Task => !!t);
    },
    async create(t) {
      const cid = await clientId();
      const prsn = await sessionPrsn();
      const res = await s1.setData(cid, "SOTASK", taskToSetData(t, prsn, taskSeries()));
      return { ...t, id: String(res.id) };
    },
    // header delta on the item's own object (ACTSTATUS 3 on a SOCALL goes through SOCALL)
    async update(id, patch, kind = "TASK") {
      const cid = await clientId();
      await s1.setData(cid, ACTION_OBJECT[kind], taskPatchToSetData(patch), Number(id));
      return { id, doctorId: "", userId: "", title: "", dueDate: "", status: "OPEN", source: "MANUAL", ...patch } as Task;
    },
    // Επόμενη ενέργεια = SOCALL 1000 / SOEMAIL 1003 / SOMEETING 2003 (his mapping 2026-11-19)
    async createNextAction(a) {
      const cid = await clientId();
      const prsn = await sessionPrsn();
      const res = await s1.setData(cid, NEXT_ACTION_OBJECT[a.kind], nextActionToSetData(a, prsn, nextActionSeries[a.kind]()));
      return { id: String(res.id) };
    },
    // Καταγραφή κλήσης = a done SOCALL in the same call series (1000)
    async logCall(c) {
      const cid = await clientId();
      const prsn = await sessionPrsn();
      const res = await s1.setData(cid, "SOCALL", callLogToSetData(c, prsn, nextActionSeries.CALL()));
      return { id: String(res.id) };
    },
    async timeline(soaction) {
      if (!/^\d+$/.test(soaction)) throw new Error(`Μη έγκυρη ενέργεια: ${soaction}`);
      const res = await js<S1TimelineRow[]>("api.crm.actions", "getTimeline", { soaction: Number(soaction) });
      return (res.data ?? []).map(rowToTimelineEntry);
    },
  },
  // Άφιξη / Αναχώρηση = SOMEETING series 2001 (decided 2026-11-10): FROMDATE on arrival, FINALDATE on departure.
  checkIns: {
    async openForUser(userId, doctorId): Promise<CheckIn | null> {
      const prsn = await sessionPrsn();
      const res = await js<S1PendingArrivalRow[]>("api.crm.actions", "getPendingArrivals", { trdr: Number(doctorId), prsn: Number(prsn) });
      const row = res.data?.[0];
      return row ? rowToCheckIn(row, userId, doctorId) : null;
    },
    async create(c) {
      const cid = await clientId();
      const prsn = await sessionPrsn();
      const res = await s1.setData(cid, "SOMEETING", arrivalToSetData(c.doctorId, prsn, c.arrivedAt, arrivalSeries()));
      return { ...c, id: String(res.id), s1Id: String(res.id) };
    },
    async update(id, patch) {
      const cid = await clientId();
      if (patch.departedAt) await s1.setData(cid, "SOMEETING", departureToSetData(patch.departedAt, patch.notes), Number(id));
      return { id, doctorId: "", userId: "", arrivedAt: "", ...patch } as CheckIn;
    },
    // manager log: needs a list endpoint (api.crm.actions/list with series 2001) – not built yet
    list: todo("checkIns.list"),
  },
  stats: {
    async listProducts(term) {
      const res = await js<S1ProductRow[]>("api.crm.products", "list", { q: term?.trim() || undefined, page: 1, pageSize: 200 });
      return (res.data ?? []).map(rowToProduct);
    },
    // hospitals master: api.crm/hospitals → TRDR rows of the hospital category { trdr, code, name, isActive? }
    async listHospitals(term) {
      const res = await js<S1HospitalRow[]>("api.crm", "hospitals", term?.trim() ? { q: term.trim() } : {});
      return (res.data ?? []).filter((h) => String(h.isActive ?? "1") !== "0").map(rowToHospital);
    },
    // api.crm/bootstrap → machine: { categories, marks, models } (owner, 2026-11-11)
    async machineCatalog() {
      const m = (await bootstrap()).machine ?? {};
      return { categories: toRefs(m.categories), marks: toRefs(m.marks), models: toRefs(m.models) };
    },
    // selectable (isActive = selectable in SoftOne) project states / categories for the «Νέο Project» form
    async projectLookups() {
      const prjc = (await bootstrap()).prjc ?? {};
      return { states: toRefs(prjc.prjState, true), categories: toRefs(prjc.prjCategory, true) };
    },
    async searchProducts(q, limit) {
      const res = await js<S1ProductRow[]>("api.crm.products", "list", { q: q.trim(), page: 1, pageSize: limit });
      const items = (res.data ?? []).map((r) => {
        if (r.mtrl === undefined || r.mtrl === null || r.mtrl === "") throw new Error(`api.crm.products: row without mtrl: ${JSON.stringify(r).slice(0, 200)}`);
        const price = Number(r.floorPrice ?? r.pricew ?? 0);
        return { mtrl: String(r.mtrl), code: r.code ?? "", name: r.name ?? "", price: Number.isFinite(price) ? price : 0 };
      });
      return { total: Number(res.totalCount ?? items.length), items };
    },
    async findProduct(code) {
      const res = await js<S1ProductRow[]>("api.crm.products", "list", { code, page: 1, pageSize: 5 });
      const row = (res.data ?? []).find((r) => r.code === code) ?? res.data?.[0];
      return row ? rowToProduct(row) : null;
    },
    doctorHistory: todo("stats.doctorHistory"),
    target: todo("stats.target"),
    turnover: todo("stats.turnover"),
    // api.crm/dashboard (owner, 2026-11-12): appointments 2003, follow-ups 3001, overdue 3000, pending offers 7015
    async dailyReport(userId, range) {
      const res = (await js<never>("api.crm", "dashboard", { prsn: Number(userId), fromDate: range.from, finalDate: range.to })) as unknown as S1DashboardResponse;
      return dashboardToReport(res);
    },
  },
};
