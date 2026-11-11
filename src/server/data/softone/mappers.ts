/**
 * Row ↔ domain mapping for the SoftOne JS endpoints (docs/SOFTONE-API.md).
 * Rows come with lowercase/camelCase SoftOne column names as produced by the scripts.
 */
import type { ActivityType, CheckIn, Consent, Doctor, Task, DoctorRank, Equipment, EquipmentCategory, MachineCatalog, Hospital, HospitalRef, Offer, OfferClosed, OfferLine, OfferStatus, Product } from "../../domain/types";

export interface S1CustomerRow {
  trdr: string | number;
  code?: string;
  name?: string;
  afm?: string;
  email?: string;
  phone01?: string;
  phone02?: string;
  mobilePhone?: string; // TRDEXTRA.VARCHAR03
  address?: string;
  city?: string;
  zip?: string;
  firstName?: string; // CCCFNAME
  lastName?: string; // CCCLNAME
  isDoctor?: number | string;
  actType?: number | string; // CCCACTTYPE 1 Ιδιώτης / 2 Δημόσιος
  dRank?: number | string; // CCCDRANK id (master table CCCDRANK)
  dRankCode?: string; // CCCDRANK.code (1..4) when the script joins it
  salesman?: string | number;
  insDate?: string;
  updDate?: string;
  hospitals?: Array<{ ccchsptl: number | string; code?: string; name?: string; isActive?: number | string; linenum?: number | string }>;
  /** signatures written by api.crm.customers/setSignature (field names tolerated in any case) */
  signatures?: Array<Record<string, unknown>>;
  /** installed equipment (owner, 2026-11-11): ids into api.crm/bootstrap machine lists */
  machines?: S1MachineRow[];
  guid?: string;
}

const RANK_BY_CODE: Record<string, DoctorRank> = { "1": "RESIDENT", "2": "CURATOR", "3": "DIRECTOR", "4": "PROFESSOR" };
export const RANK_CODE: Record<DoctorRank, string> = { RESIDENT: "1", CURATOR: "2", DIRECTOR: "3", PROFESSOR: "4" };

export function rankFromRow(r: S1CustomerRow): DoctorRank | undefined {
  const code = r.dRankCode ?? (r.dRank !== undefined && r.dRank !== null ? String(r.dRank) : "");
  return RANK_BY_CODE[code];
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: "", lastName: parts[0] ?? "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

export function s1Date(v?: string | null): string {
  if (!v) return "";
  // SoftOne gives "2026-10-24 09:30:00" or "2026-10-24T09:30:00"
  const s = String(v).replace(" ", "T");
  return s.length === 10 ? `${s}T00:00:00.000Z` : s.endsWith("Z") ? s : `${s}Z`;
}

export function rowToDoctor(r: S1CustomerRow): Doctor {
  const split = splitName(r.name ?? "");
  const act = String(r.actType ?? "");
  const hospitals: HospitalRef[] = (r.hospitals ?? []).map((h) => ({
    id: String(h.ccchsptl),
    code: h.code,
    name: h.name ?? "",
    lineNo: h.linenum !== undefined && h.linenum !== null ? Number(h.linenum) : undefined,
  }));
  return {
    id: String(r.trdr),
    firstName: r.firstName ?? split.firstName,
    lastName: r.lastName ?? split.lastName,
    mobile: r.mobilePhone || r.phone02 || "",
    email: r.email ?? "",
    activityType: (act === "1" ? "PRIVATE" : act === "2" ? "PUBLIC" : undefined) as ActivityType | undefined,
    clinicAddress: r.address ?? "",
    city: r.city ?? "",
    postalCode: r.zip ?? "",
    hospitals,
    afm: r.afm ?? "",
    rank: rankFromRow(r),
    ownerUserId: r.salesman !== undefined && r.salesman !== null ? String(r.salesman) : "",
    softoneTrdr: Number(r.trdr),
    createdAt: s1Date(r.insDate) || new Date(0).toISOString(),
    updatedAt: s1Date(r.updDate) || s1Date(r.insDate) || new Date(0).toISOString(),
  };
}

/**
 * setData payload for the standard CUSTOMER object (doctor = TRDR SODTYPE 13), form "_CRM_".
 * Mobile -> CUSEXTRA.VARCHAR03. Hospitals -> detail CCCTRDHSPTL, rules agreed 2026-10-25:
 *   - new link:    { CCCHSPTL, LINENUM: 9000000, 9000001, ... }
 *   - keep a link: { LINENUM } (existing line number only)
 *   - remove link: leave its LINENUM out of the array
 * `existing` = the doctor's current links (with lineNo) when updating.
 */
export const CRM_FORM = "_CRM_";

export function doctorToSetData(d: Partial<Doctor>, existing: HospitalRef[] = []): Record<string, Array<Record<string, unknown>>> {
  const customer: Record<string, unknown> = {
    NAME: [d.lastName, d.firstName].filter(Boolean).join(" ") || d.lastName || d.firstName || "",
    CCCFNAME: d.firstName ?? "",
    CCCLNAME: d.lastName ?? "",
    AFM: d.afm ?? "",
    EMAIL: d.email ?? "",
    ADDRESS: d.clinicAddress ?? "",
    CITY: d.city ?? "",
    ZIP: d.postalCode ?? "",
    CCCACTTYPE: d.activityType === "PRIVATE" ? 1 : d.activityType === "PUBLIC" ? 2 : null,
    CCCDRANK: d.rank ? Number(RANK_CODE[d.rank]) : null,
    CCCISDOCTOR: 1,
  };
  const payload: Record<string, Array<Record<string, unknown>>> = {
    CUSTOMER: [customer],
    CUSEXTRA: [{ VARCHAR03: d.mobile ?? "" }],
  };
  if (d.hospitals) {
    const wanted = new Set(d.hospitals.map((h) => h.id));
    const lines: Array<Record<string, unknown>> = [];
    for (const e of existing) if (e.lineNo !== undefined && wanted.has(e.id)) lines.push({ LINENUM: e.lineNo });
    let next = 9000000;
    const existingIds = new Set(existing.filter((e) => e.lineNo !== undefined).map((e) => e.id));
    for (const h of d.hospitals) if (!existingIds.has(h.id)) lines.push({ CCCHSPTL: Number(h.id), LINENUM: next++ });
    payload.CCCTRDHSPTL = lines;
  }
  return payload;
}

/**
 * Update payload = header delta + complete detail (SoftOne rule, see memory/reference-softone-setdata-rules):
 * header fields only where the value changed; CCCTRDHSPTL only when the set of linked hospitals changed.
 */
export function doctorUpdateDelta(patch: Partial<Doctor>, current: Doctor): Record<string, Array<Record<string, unknown>>> {
  const next = doctorToSetData(patch, current.hospitals);
  const before = doctorToSetData(current, current.hospitals);
  const out: Record<string, Array<Record<string, unknown>>> = {};

  const header: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next.CUSTOMER[0])) {
    if (k === "CCCISDOCTOR") continue; // never changes on update
    if (String(v ?? "") !== String(before.CUSTOMER[0][k] ?? "")) header[k] = v;
  }
  if (Object.keys(header).length) out.CUSTOMER = [header];

  if (String(next.CUSEXTRA[0].VARCHAR03 ?? "") !== String(before.CUSEXTRA[0].VARCHAR03 ?? "")) out.CUSEXTRA = next.CUSEXTRA;

  if (patch.hospitals) {
    const a = new Set(current.hospitals.map((h) => h.id));
    const b = new Set(patch.hospitals.map((h) => h.id));
    const same = a.size === b.size && [...a].every((id) => b.has(id));
    if (!same) out.CCCTRDHSPTL = next.CCCTRDHSPTL;
  }
  return out;
}

/** hospitals master row -> Hospital */
export function rowToHospital(r: { ccchsptl: number | string; code?: string; name?: string }): Hospital {
  return { id: String(r.ccchsptl), code: r.code, name: r.name ?? "" };
}

// ---- products (api.crm.products) --------------------------------------------

export interface S1ProductRow {
  mtrl: string | number;
  code?: string;
  name?: string;
  floorPrice?: number | string; // see docs/SOFTONE-API.md §10 – the chosen MTRL price field
  pricew?: number | string;
  category?: number | string; // CRM equipment category code (1..9, 99) when available
}

const CATEGORY_BY_CODE: Record<string, EquipmentCategory> = {
  "1": "OCT", "2": "PERIMETER", "3": "BIOMETER", "4": "TOPOGRAPHER", "5": "SLIT_LAMP",
  "6": "LENSMETER", "7": "FUNDUS_CAMERA", "8": "LASER", "9": "MICROSCOPE", "99": "OTHER",
};

export function rowToProduct(r: S1ProductRow): Product {
  const price = Number(r.floorPrice ?? r.pricew ?? 0);
  return {
    code: r.code ?? String(r.mtrl),
    name: r.name ?? "",
    floorPrice: Number.isFinite(price) ? price : 0,
    category: CATEGORY_BY_CODE[String(r.category ?? "")] ?? "OTHER",
  };
}

// ---- offers (api.crm.offers ↔ SALDOC series 7015) ---------------------------

export interface S1OfferLineRow {
  mtrlines?: number | string;
  mtrl: number | string;
  mtrl_item_code?: string;
  mtrl_item_name?: string;
  qty1?: number | string;
  price?: number | string;
  disc1prc?: number | string;
  disc2prc?: number | string;
  lineval?: number | string;
  linenum?: number | string;
  cccfloorprice?: number | string; // pending custom field
  cccprevprice?: number | string; // pending custom field
}

export interface S1OfferRow {
  findoc: number | string;
  fincode?: string;
  series?: number | string;
  trnDate?: string;
  trdr: number | string;
  trdr_customer_name?: string;
  netAmnt?: number | string;
  sumAmnt?: number | string;
  comments?: string;
  insDate?: string;
  updDate?: string;
  itelines?: S1OfferLineRow[];
  // pending custom fields on FINDOC (docs/SOFTONE-SPEC.md §2.4)
  cccproject?: number | string;
  cccversion?: number | string;
  ccccrmstatus?: number | string;
  cccrevreason?: string;
  cccclosed?: number | string;
  cccsupportnotes?: string;
  cccrequestedby?: number | string;
  cccansweredby?: number | string;
  cccansweredat?: string;
  cccacknowledgedat?: string;
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export function rowToOfferLine(l: S1OfferLineRow, i: number): OfferLine {
  return {
    lineNo: num(l.linenum, i + 1),
    productCode: l.mtrl_item_code ?? String(l.mtrl),
    qty: num(l.qty1, 1),
    floorPrice: num(l.cccfloorprice, num(l.price)),
    prevPrice: l.cccprevprice !== undefined ? num(l.cccprevprice) : null,
    discountPct: num(l.disc1prc),
    specialDiscountPct: num(l.disc2prc),
    offerPrice: num(l.lineval, num(l.price) * num(l.qty1, 1)),
  };
}

export function rowToOffer(r: S1OfferRow): Offer {
  const st = String(r.ccccrmstatus ?? "");
  const status: OfferStatus = st === "1" ? "REQUESTED" : st === "2" ? "PRICED" : "SENT"; // no field → historic, treated as sent
  const cl = String(r.cccclosed ?? "");
  const closed: OfferClosed | undefined = cl === "1" ? "YES" : cl === "2" ? "NO" : cl === "3" ? "PARTIAL" : undefined;
  const lines = (r.itelines ?? []).map(rowToOfferLine);
  return {
    id: String(r.findoc),
    projectId: r.cccproject !== undefined && r.cccproject !== null ? String(r.cccproject) : "",
    doctorId: String(r.trdr),
    number: r.fincode ?? String(r.findoc),
    version: num(r.cccversion, 1),
    date: (r.trnDate ?? r.insDate ?? "").slice(0, 10),
    title: lines[0]?.productCode ? (r.itelines?.[0]?.mtrl_item_name ?? lines[0].productCode).slice(0, 60) : (r.fincode ?? ""),
    status,
    total: num(r.netAmnt, num(r.sumAmnt)),
    revisionReason: r.cccrevreason || undefined,
    closed,
    requestedBy: r.cccrequestedby !== undefined ? String(r.cccrequestedby) : "",
    requestedAt: s1Date(r.insDate),
    answeredBy: r.cccansweredby !== undefined ? String(r.cccansweredby) : undefined,
    answeredAt: r.cccansweredat ? s1Date(r.cccansweredat) : undefined,
    acknowledgedAt: r.cccacknowledgedat ? s1Date(r.cccacknowledgedat) : undefined,
    supportNotes: r.cccsupportnotes || undefined,
    lines,
  };
}

/** setData payload for a new SALDOC offer in the CRM series (one document per version). */
export function offerToSetData(o: Omit<Offer, "id">, series: number, mtrlByCode: Record<string, number>): Record<string, Array<Record<string, unknown>>> {
  const header: Record<string, unknown> = {
    SERIES: series,
    TRDR: Number(o.doctorId),
    TRNDATE: o.date,
    COMMENTS: o.title,
    CCCPROJECT: o.projectId ? Number(o.projectId) : null,
    CCCVERSION: o.version,
    CCCCRMSTATUS: o.status === "REQUESTED" ? 1 : o.status === "PRICED" ? 2 : 3,
    CCCREVREASON: o.revisionReason ?? "",
    CCCREQUESTEDBY: o.requestedBy ? Number(o.requestedBy) : null,
  };
  const lines = o.lines.map((l) => ({
    MTRL: mtrlByCode[l.productCode],
    QTY1: l.qty,
    PRICE: l.floorPrice,
    DISC1PRC: l.discountPct,
    DISC2PRC: l.specialDiscountPct,
    CCCFLOORPRICE: l.floorPrice,
    CCCPREVPRICE: l.prevPrice ?? null,
  }));
  return { SALDOC: [header], ITELINES: lines };
}

/** Date + time as SoftOne expects it in FROMDATE / FINALDATE: "yyyy-mm-dd hh:mm", Greek local time. */
export function s1DateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}

/** SoftOne "yyyy-mm-dd hh:mm[:ss]" (Greek local time) → ISO string. */
export function s1DateTimeToIso(v?: string | null): string | undefined {
  if (!v) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(v);
  if (!m) return undefined;
  // find the Athens UTC offset for that instant (DST-aware) by probing
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offsetMin = (t: number) => {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
    const g = (k: string) => +(p.find((x) => x.type === k)?.value ?? 0);
    return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")) - t) / 60000;
  };
  return new Date(guess - offsetMin(guess) * 60000).toISOString();
}

/**
 * Άφιξη → new SOMEETING in series S1_ARRIVAL_SERIES (2001) – decided 2026-11-10:
 * TRDR, ACTPRSN = PRSN of the logged-in user, FROMDATE = arrival. Αναχώρηση = header delta FINALDATE.
 */
export function arrivalToSetData(trdr: string, prsn: string, arrivedAtIso: string, series: number): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ SERIES: series, TRDR: Number(trdr), ACTPRSN: Number(prsn), FROMDATE: s1DateTime(arrivedAtIso) }] };
}
export function departureToSetData(departedAtIso: string): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ FINALDATE: s1DateTime(departedAtIso) }] };
}

/** Row of api.crm.actions/getPendingArrivals – column names tolerated in any case. */
export type S1PendingArrivalRow = Record<string, string | number | null | undefined>;
export function rowToCheckIn(r: S1PendingArrivalRow, userId: string, doctorId: string): CheckIn {
  const pick = (...names: string[]) => {
    for (const n of names) for (const k of Object.keys(r)) if (k.toLowerCase() === n.toLowerCase() && r[k] !== null && r[k] !== undefined && r[k] !== "") return String(r[k]);
    return undefined;
  };
  const id = pick("soaction", "id") ?? "";
  return {
    id,
    s1Id: id,
    doctorId: pick("trdr") ?? doctorId,
    userId: pick("actprsn", "prsn") ?? userId,
    arrivedAt: s1DateTimeToIso(pick("fromdate", "arrivedat")) ?? new Date().toISOString(),
    departedAt: s1DateTimeToIso(pick("finaldate", "departedat")),
  };
}

/** generic case-insensitive column pick for rows produced by the owner's scripts */
function pickCol(r: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const n of names) for (const k of Object.keys(r)) {
    const v = r[k];
    if (k.toLowerCase() === n.toLowerCase() && v !== null && v !== undefined && v !== "") return String(v);
  }
  return undefined;
}

/**
 * Εκκρεμότητα → SOTASK series S1_TASK_SERIES (3000 «ΕΚΚΡ») – decided 2026-11-10.
 * COMMENTS = the action text, DUEDATE = due date, ACTSTATUS 1 open / 3 done.
 */
export const TASK_STATUS_OPEN = 1;
export const TASK_STATUS_DONE = 3;
export const TASK_STATUS_CANCELLED = 4;
export function taskToSetData(t: Omit<Task, "id">, prsn: string, series: number): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ SERIES: series, TRDR: Number(t.doctorId), ACTPRSN: Number(prsn), COMMENTS: t.title, DUEDATE: t.dueDate, ACTSTATUS: t.status === "DONE" ? TASK_STATUS_DONE : TASK_STATUS_OPEN }] };
}
export function taskPatchToSetData(patch: Partial<Task>): Record<string, Array<Record<string, unknown>>> {
  const h: Record<string, unknown> = {};
  if (patch.status) h.ACTSTATUS = patch.status === "DONE" ? TASK_STATUS_DONE : TASK_STATUS_OPEN;
  if (patch.title !== undefined) h.COMMENTS = patch.title;
  if (patch.dueDate !== undefined) h.DUEDATE = patch.dueDate;
  return { SOACTION: [h] };
}
/** Row of api.crm.actions/getPendings: { soaction, series, actStatus, comments, finalDate?, trdr?, actPrsn? } */
export type S1PendingRow = Record<string, unknown>;
export function rowToTask(r: S1PendingRow, fallbackDoctorId: string, fallbackUserId: string): Task | null {
  const st = Number(pickCol(r, "actstatus") ?? TASK_STATUS_OPEN);
  if (st === TASK_STATUS_CANCELLED) return null;
  const due = pickCol(r, "duedate", "finaldate") ?? pickCol(r, "trndate") ?? "";
  return {
    id: pickCol(r, "soaction", "id") ?? "",
    doctorId: pickCol(r, "trdr") ?? fallbackDoctorId,
    userId: pickCol(r, "actprsn", "prsn") ?? fallbackUserId,
    title: pickCol(r, "comments", "title") ?? "",
    dueDate: due.slice(0, 10),
    status: st === TASK_STATUS_DONE ? "DONE" : "OPEN",
    source: "MANUAL",
  };
}

/**
 * Latest signature of the customer row → Consent (GDPR badge). Row shape (2026-11-10):
 * { name: "SIGNATURE_<signer>_<unix ms>.png", sofname, crtDate (local time), sodata: <base64 png> }.
 * Channels are not stored in SoftOne: the hybrid provider merges the local copy if one exists.
 */
export function rowToConsent(r: S1CustomerRow): Consent | null {
  const sigs = r.signatures ?? [];
  if (sigs.length === 0) return null;
  const parse = (x: Record<string, unknown>) => {
    const file = pickCol(x, "sofname", "name") ?? "";
    const m = /^SIGNATURE_(.*)_(\d{10,})\.\w+$/i.exec(file);
    const ts = m ? Number(m[2]) : NaN;
    return {
      signer: m ? m[1] : pickCol(x, "signer", "signername") ?? file,
      // crtDate is Greek local time without zone ("2026-11-10T23:09:41.687"); the file-name timestamp is the fallback
      at: s1DateTimeToIso(pickCol(x, "crtdate", "date", "insdate")) ?? (Number.isFinite(ts) ? new Date(ts < 1e12 ? ts * 1000 : ts).toISOString() : ""),
      data: pickCol(x, "sodata", "data", "base64") ?? "",
      id: pickCol(x, "id", "sofile") ?? file,
    };
  };
  const latest = sigs.map(parse).sort((a, b) => b.at.localeCompare(a.at))[0];
  return {
    id: latest.id || `s1-${r.trdr}`,
    doctorId: String(r.trdr),
    signerName: latest.signer,
    signaturePng: latest.data ? (latest.data.startsWith("data:") ? latest.data : `data:image/png;base64,${latest.data}`) : "",
    channels: { email: false, sms: false, phone: false, viber: false },
    signedAt: latest.at,
    byUserId: "",
  };
}

// ---- installed equipment (customers/getData → machines[]) -------------------

export interface S1MachineRow {
  /** sic – the owner's field name, kept as is */
  cccMtrCatgeory?: number | string;
  cccMtrMark?: number | string;
  cccMtrModel?: number | string;
  SoYear?: number | string;
  srvContr?: number | string;
  SNCode?: string;
  linenum?: number | string;
}

const idOf = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : String(v));

/** machines[] row → Equipment, names resolved through the bootstrap catalog. */
export function rowToEquipment(r: S1MachineRow, doctorId: string, i: number, c: MachineCatalog): Equipment {
  const categoryId = idOf(r.cccMtrCatgeory);
  const line = Number(r.linenum);
  const markId = idOf(r.cccMtrMark);
  const modelId = idOf(r.cccMtrModel);
  const name = (list: MachineCatalog["marks"], id?: string) => (id ? (list.find((x) => x.id === id)?.name ?? `#${id}`) : "");
  const year = Number(r.SoYear);
  return {
    id: `${doctorId}-${idOf(r.linenum) ?? i + 1}`,
    doctorId,
    categoryId,
    markId,
    modelId,
    category: name(c.categories, categoryId),
    manufacturer: name(c.marks, markId),
    model: name(c.models, modelId),
    purchaseYear: Number.isFinite(year) && year > 0 ? year : null,
    serviceContract: String(r.srvContr ?? "0") === "1",
    ...(r.SNCode ? { serialNumber: r.SNCode } : {}),
    ...(Number.isFinite(line) && line > 0 ? { lineNum: line } : {}),
  };
}

/**
 * Machines write = setData CUSTOMER, form _CRM_, table CCCTRDMACHINES only (owner, 2026-11-11):
 *   - unchanged line → { LINENUM }
 *   - changed line   → { LINENUM, ...changed fields only }
 *   - deleted line   → omitted
 *   - new line       → { LINENUM: 9000001, 9000002, …, ...all fields }
 * Returns null when nothing changed (no call needed).
 */
type MachineInput = Omit<Equipment, "id" | "doctorId">;

function machineFields(r: MachineInput): Record<string, unknown> {
  const f: Record<string, unknown> = {
    SoYear: r.purchaseYear ?? null,
    srvContr: r.serviceContract ? 1 : 0,
    SNCode: r.serialNumber?.trim() ?? "",
  };
  // only SoftOne-known ids are sent; a legacy name without id cannot be written
  if (r.categoryId) f.cccMtrCatgeory = Number(r.categoryId);
  if (r.markId) f.cccMtrMark = Number(r.markId);
  if (r.modelId) f.cccMtrModel = Number(r.modelId);
  return f;
}

export function machinesToSetData(rows: MachineInput[], current: Equipment[]): { CCCTRDMACHINES: Array<Record<string, unknown>> } | null {
  const byLine = new Map(current.filter((c) => c.lineNum).map((c) => [c.lineNum!, c]));
  const lines: Array<Record<string, unknown>> = [];
  let changed = false;
  let next = 9000001;
  const kept = new Set<number>();
  for (const r of rows) {
    const old = r.lineNum ? byLine.get(r.lineNum) : undefined;
    if (!old) {
      lines.push({ LINENUM: next++, ...machineFields(r) });
      changed = true;
      continue;
    }
    if (kept.has(old.lineNum!)) continue; // a line can appear only once
    kept.add(old.lineNum!);
    const now = machineFields(r);
    const before = machineFields(old);
    const delta = Object.fromEntries(Object.entries(now).filter(([k, v]) => String(v ?? "") !== String(before[k] ?? "")));
    if (Object.keys(delta).length) changed = true;
    lines.push({ LINENUM: old.lineNum, ...delta });
  }
  if (kept.size !== byLine.size) changed = true; // some lines were removed
  return changed ? { CCCTRDMACHINES: lines } : null;
}
