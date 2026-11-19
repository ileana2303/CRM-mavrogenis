/**
 * Row ↔ domain mapping for the SoftOne JS endpoints (docs/SOFTONE-API.md).
 * Rows come with lowercase/camelCase SoftOne column names as produced by the scripts.
 */
import { S1Error } from "./client";
import type { ActivityType, CheckIn, Consent, DailyReport, DailyReportItem, Doctor, Task, NewNextAction, NewCallLog, NextActionKind, ActionKind, TimelineEntry, TimelineKind, DoctorRank, Equipment, EquipmentCategory, MachineCatalog, Hospital, HospitalRef, Offer, ProjectSummary, NewS1Project, ProjectDetail, ProjectOffer, NewS1Offer, OfferCalc, OfferClosed, OfferLine, OfferStatus, Product } from "../../domain/types";
import { athensToIso } from "../../../lib/athens";

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
  /** linked hospitals = detail CCCTRDTRDR (doctor TRDR → hospital TRDR in TRDREL), owner 2026-11-16 */
  hospitals?: Array<{
    trdr?: number | string;
    trdRel: number | string;
    trdRel_customer_code?: string;
    trdRel_customer_name?: string;
    linenum?: number | string;
  }>;
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

/**
 * SoftOne date/time → ISO instant. SoftOne sends Athens wall-clock time with no zone ("2026-10-24 09:30:00",
 * "2026-10-24T09:30", "2026-10-24"), so it is read as Europe/Athens (it used to be taken as UTC: +2/+3h, and
 * anything after ~22:00 showed as the next day). A value that already carries a zone is kept as it is.
 */
export function s1Date(v?: string | null): string {
  if (!v) return "";
  const s = String(v).trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) return s;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (!m) return s; // unknown shape: shown as SoftOne sent it, never a made-up date
  return athensToIso(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}

export function rowToDoctor(r: S1CustomerRow): Doctor {
  const split = splitName(r.name ?? "");
  const act = String(r.actType ?? "");
  const hospitals: HospitalRef[] = (r.hospitals ?? []).map((h) => ({
    id: String(h.trdRel),
    code: h.trdRel_customer_code,
    name: h.trdRel_customer_name ?? "",
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
 * Mobile -> CUSEXTRA.VARCHAR03. Hospitals -> detail CCCTRDTRDR (TRDREL = the hospital's TRDR; TRDR = the doctor, set by
 * SoftOne from the header). Detail rules agreed 2026-10-25:
 *   - new link:    { TRDREL, LINENUM: 9000000, 9000001, ... }
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
    for (const h of d.hospitals) if (!existingIds.has(h.id)) lines.push({ TRDREL: Number(h.id), LINENUM: next++ });
    payload.CCCTRDTRDR = lines;
  }
  return payload;
}

/**
 * Update payload = header delta + complete detail (SoftOne rule, see memory/reference-softone-setdata-rules):
 * header fields only where the value changed; CCCTRDTRDR only when the set of linked hospitals changed.
 */
export function doctorUpdateDelta(patch: Partial<Doctor>, current: Doctor): Record<string, Array<Record<string, unknown>>> {
  // a field left out of the patch is unchanged (not blank): a hospitals-only patch sends only CCCTRDTRDR
  const next = doctorToSetData({ ...current, ...patch }, current.hospitals);
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
    if (!same) out.CCCTRDTRDR = next.CCCTRDTRDR;
  }
  return out;
}

/** api.crm/hospitals row: a TRDR of the hospital category (owner, 2026-11-16). */
export interface S1HospitalRow {
  trdr: number | string;
  code?: string;
  name?: string;
  isActive?: number | string;
}

/** hospitals master row -> Hospital (id = the hospital's TRDR, what CCCTRDTRDR.TRDREL points to) */
export function rowToHospital(r: S1HospitalRow): Hospital {
  if (r.trdr === undefined || r.trdr === null || r.trdr === "") throw new Error(`api.crm/hospitals: row without trdr: ${JSON.stringify(r)}`);
  return { id: String(r.trdr), code: r.code, name: r.name ?? "" };
}

// ---- projects (api.crm.customers/projects {trdr}) ----------------------------

export interface S1ProjectRow {
  prjc: number | string;
  code?: string;
  name?: string;
  isActive?: number | string;
  /** id into api.crm/bootstrap prjc.prjState (Ενδιαφέρον 1000 … Χάθηκε 1080) */
  prjState?: number | string | null;
  /** id into api.crm/bootstrap prjc.prjCategory (New Clinic 1000, Replacement 1001, Public Tender 1002) */
  prjCategory?: number | string | null;
  insDate?: string;
  updDate?: string;
}

/** A master-list id → { id, name }; none when the project has no value; throws on an id the list doesn't know. */
function lookup(id: number | string | null | undefined, names: Map<string, string>, what: string, prjc: string) {
  if (id === undefined || id === null || id === "") return {};
  const name = names.get(String(id));
  if (name === undefined) throw new Error(`api.crm.customers/projects: project ${prjc} has ${what} ${id}, which api.crm/bootstrap prjc.${what} does not list`);
  return { id: String(id), name };
}

export function rowToProjectSummary(
  r: S1ProjectRow,
  lookups: { states: Map<string, string>; categories: Map<string, string> },
): ProjectSummary {
  if (r.prjc === undefined || r.prjc === null || r.prjc === "") throw new Error(`api.crm.customers/projects: row without prjc: ${JSON.stringify(r)}`);
  return {
    id: String(r.prjc),
    code: r.code ?? "",
    title: r.name ?? "",
    active: String(r.isActive ?? "1") !== "0",
    state: lookup(r.prjState, lookups.states, "prjState", String(r.prjc)),
    category: lookup(r.prjCategory, lookups.categories, "prjCategory", String(r.prjc)),
    createdAt: s1Date(r.insDate),
    updatedAt: s1Date(r.updDate) || s1Date(r.insDate),
  };
}

/** getData shows a lookup as "1001|Replacement"; a plain value is an id with no name */
function idName(v: string | undefined): { id?: string; name?: string } {
  if (!v) return {};
  const i = v.indexOf("|");
  return i < 0 ? { id: v } : { id: v.slice(0, i), name: v.slice(i + 1) };
}

/** getData PRJC (form _CRM_): header PRJC[0] + offers VOPPOFFS (newest first) */
export function prjcToDetail(data: Record<string, Array<Record<string, string>>>): ProjectDetail | null {
  const h = data.PRJC?.[0];
  if (!h) return null;
  if (!h.PRJC) throw new Error(`getData PRJC: header without PRJC: ${JSON.stringify(h).slice(0, 200)}`);
  const offers: ProjectOffer[] = (data.VOPPOFFS ?? [])
    .map((o) => ({
      id: String(o.FINDOC ?? ""),
      number: o.FINCODE ?? "",
      series: idName(o.SERIES).name ?? o.SERIES ?? "",
      type: idName(o.TFPRMS).name ?? "",
      date: s1Date(o.TRNDATE),
      net: Number(o.LNETAMNT ?? 0),
      approved: String(o.APPRV ?? "") === "1",
      cancelled: String(o.ISCANCEL ?? "") === "1",
      remarks: o.REMARKS ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  const state = idName(h.PRJSTATE);
  const category = idName(h.PRJCATEGORY);
  return {
    id: String(h.PRJC),
    code: h.CODE ?? "",
    title: h.NAME ?? "",
    active: String(h.ISACTIVE ?? "1") !== "0",
    state,
    category,
    doctorId: String(h.TRDR ?? ""),
    salesman: [h.SALESMAN_PRSNIN_NAME2, h.SALESMAN_PRSNIN_NAME].filter(Boolean).join(" "),
    notes: h.REMARKS ?? "",
    createdAt: s1Date(h.INSDATE),
    updatedAt: s1Date(h.UPDDATE) || s1Date(h.INSDATE),
    offers,
  };
}

/**
 * New project → setData PRJC, form _CRM_. Always CODE "0*" (SoftOne numbers it; plain "*" is refused) and PRJCRM 2 (owner, 2026-11-16);
 * SALESMAN = the session PRSN (owner, 2026-11-16).
 * ORDER MATTERS: SoftOne applies the fields in the order sent, and PRJCRM must come right after CODE – set later,
 * it resets PRJCATEGORY / PRJSTATE (they were silently dropped).
 */
export function projectToSetData(p: NewS1Project, salesmanId?: string): Record<string, Array<Record<string, unknown>>> {
  return {
    PRJC: [
      {
        CODE: "0*",
        PRJCRM: 2,
        NAME: p.title,
        TRDR: Number(p.doctorId),
        PRJCATEGORY: Number(p.categoryId),
        PRJSTATE: Number(p.stateId),
        ...(p.notes ? { REMARKS: p.notes } : {}),
        ...(salesmanId ? { SALESMAN: Number(salesmanId) } : {}),
      },
    ],
  };
}

/**
 * New offer inside a project → setData SALDOC, form _CRM_ (owner, 2026-11-16): SERIES first, then TRDR / PRJC / SALESMAN.
 * Lines → ITELINES {MTRL, QTY1, PRICE?, DISC1PRC | DISC1VAL | LINEVAL}, new lines numbered 9000001…; SoftOne prices VAT and totals.
 */
export function projectOfferToSetData(o: NewS1Offer, series: number, salesmanId: string): Record<string, Array<Record<string, unknown>>> {
  return {
    SALDOC: [
      {
        SERIES: series,
        TRDR: Number(o.doctorId),
        PRJC: Number(o.projectId),
        SALESMAN: Number(salesmanId),
        ...(o.comments ? { COMMENTS: o.comments } : {}),
      },
    ],
    ITELINES: o.lines.map((l, i) => ({
      LINENUM: 9000001 + i,
      MTRL: Number(l.mtrl),
      QTY1: l.qty,
      ...(l.price !== null ? { PRICE: l.price } : {}),
      // one driver only – SoftOne derives the other two (LINEVAL would override DISC1PRC if both were sent)
      ...(l.lineValue !== null
        ? { LINEVAL: l.lineValue }
        : l.discountValue !== null
          ? { DISC1VAL: l.discountValue }
          : l.discountPct
            ? { DISC1PRC: l.discountPct }
            : {}),
    })),
  };
}

/** calculate SALDOC → OfferCalc; lines come back with the LINENUM we sent (9000001 + index) */
export function calcToOffer(data: Record<string, Array<Record<string, string>>>, lineCount: number): OfferCalc {
  const n = (v: string | undefined) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) ? x : 0;
  };
  const byIndex = new Map((data.ITELINES ?? []).map((r) => [Number(r.LINENUM) - 9000001, r]));
  const lines = Array.from({ length: lineCount }, (_, i) => {
    const r = byIndex.get(i);
    if (!r) throw new Error(`calculate SALDOC: line ${i + 1} missing from the answer`);
    return { price: n(r.PRICE), discountPct: n(r.DISC1PRC), discountValue: n(r.DISC1VAL), lineValue: n(r.LINEVAL), vat: n(r.VATAMNT), vatPct: n(r.VAT_VAT_PERCNT) };
  });
  const h = data.SALDOC?.[0] ?? {};
  return { lines, net: n(h.NETAMNT), vat: n(h.VATAMNT), total: n(h.SUMAMNT) };
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
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(v);
  if (!m) return undefined;
  return athensToIso(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

/**
 * Άφιξη → new SOMEETING in series S1_ARRIVAL_SERIES (2001) – decided 2026-11-10:
 * TRDR, ACTPRSN = PRSN of the logged-in user, FROMDATE = arrival. Αναχώρηση = header delta FINALDATE.
 */
export function arrivalToSetData(trdr: string, prsn: string, arrivedAtIso: string, series: number): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ SERIES: series, TRDR: Number(trdr), ACTPRSN: Number(prsn), FROMDATE: s1DateTime(arrivedAtIso) }] };
}
/**
 * Αναχώρηση + visit report (2026-11-19, his choices): FINALDATE, ACTSTATUS 3 (the visit happened – before, every visit
 * stayed «Προς έναρξη» in SoftOne) and, when written, COMMENTS – all on the same SOMEETING 2001.
 */
export function departureToSetData(departedAtIso: string, notes?: string): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ FINALDATE: s1DateTime(departedAtIso), ACTSTATUS: TASK_STATUS_DONE, ...(notes ? { COMMENTS: notes } : {}) }] };
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
/** SOACTION.PRJC – the customer's project the action belongs to (his field, 2026-11-19); omitted when none. */
function prjcField(projectId?: string): { PRJC?: number } {
  if (!projectId) return {};
  if (!/^\d+$/.test(projectId)) throw new Error(`Μη έγκυρο project: ${projectId}`);
  return { PRJC: Number(projectId) };
}
export function taskToSetData(t: Omit<Task, "id">, prsn: string, series: number): Record<string, Array<Record<string, unknown>>> {
  return { SOACTION: [{ SERIES: series, TRDR: Number(t.doctorId), ...prjcField(t.projectId), ACTPRSN: Number(prsn), COMMENTS: t.title, DUEDATE: t.dueDate, ACTSTATUS: t.status === "DONE" ? TASK_STATUS_DONE : TASK_STATUS_OPEN }] };
}
export function taskPatchToSetData(patch: Partial<Task>): Record<string, Array<Record<string, unknown>>> {
  const h: Record<string, unknown> = {};
  if (patch.status) h.ACTSTATUS = patch.status === "DONE" ? TASK_STATUS_DONE : TASK_STATUS_OPEN;
  if (patch.title !== undefined) h.COMMENTS = patch.title;
  if (patch.dueDate !== undefined) h.DUEDATE = patch.dueDate;
  return { SOACTION: [h] };
}
/**
 * Επόμενη ενέργεια → new SOACTION in the object/series of its kind (his mapping 2026-11-19):
 * CALL = SOCALL 1000, EMAIL = SOEMAIL 1003, MEETING = SOMEETING 2003.
 * TRDR, PRJC (carried from the Εκκρεμότητα), ACTPRSN = login prsn, FROMDATE "yyyy-mm-dd hh:mm" (Athens), COMMENTS,
 * SOACTIONS = soaction of the source Εκκρεμότητα (his field, 2026-11-19). ACTSTATUS left to the series default.
 * ASSUMED (not yet confirmed by him): FROMDATE as the date field, no ACTSTATUS.
 */
export const NEXT_ACTION_OBJECT: Record<NextActionKind, "SOCALL" | "SOEMAIL" | "SOMEETING"> = { CALL: "SOCALL", EMAIL: "SOEMAIL", MEETING: "SOMEETING" };
export function nextActionToSetData(a: NewNextAction, prsn: string, series: number): Record<string, Array<Record<string, unknown>>> {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(a.at)) throw new Error(`Μη έγκυρη ημερομηνία/ώρα: ${a.at}`);
  if (!/^\d+$/.test(a.fromTaskId)) throw new Error(`Μη έγκυρη εκκρεμότητα: ${a.fromTaskId}`);
  return { SOACTION: [{ SERIES: series, TRDR: Number(a.doctorId), ...prjcField(a.projectId), ACTPRSN: Number(prsn), FROMDATE: a.at, COMMENTS: a.comments, SOACTIONS: Number(a.fromTaskId) }] };
}

/**
 * «Καταγραφή κλήσης» (after tapping the customer's phone): a call that already happened → SOCALL in the call series,
 * ACTSTATUS 3, FROMDATE = when it was placed. Same header fields as the next-action SOCALL (verified on 9194).
 * ASSUMED: ACTSTATUS 3 accepted on create (it is on SOTASK).
 */
export function callLogToSetData(c: NewCallLog, prsn: string, series: number): Record<string, Array<Record<string, unknown>>> {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(c.at)) throw new Error(`Μη έγκυρη ημερομηνία/ώρα: ${c.at}`);
  return { SOACTION: [{ SERIES: series, TRDR: Number(c.doctorId), ACTPRSN: Number(prsn), FROMDATE: c.at, COMMENTS: c.comments, ACTSTATUS: TASK_STATUS_DONE }] };
}

/**
 * Row of api.crm.actions/getTimeline {soaction} (checked 2026-11-19):
 * { soaction, trnDate, fromDate, code, comments, actStatus, series, objectType } – the chain linked through SOACTIONS.
 */
export type S1TimelineRow = Record<string, unknown>;
const KIND_BY_OBJECT: Record<string, TimelineKind> = { SOTASK: "TASK", SOCALL: "CALL", SOEMAIL: "EMAIL", SOMEETING: "MEETING" };
export function rowToTimelineEntry(r: S1TimelineRow): TimelineEntry {
  const id = pickCol(r, "soaction");
  const objectType = pickCol(r, "objectType")?.toUpperCase();
  const at = s1DateTimeToIso(pickCol(r, "fromDate") ?? pickCol(r, "trnDate"));
  if (!id || !objectType || !at) throw new Error(`getTimeline: row without soaction/objectType/date: ${JSON.stringify(r).slice(0, 200)}`);
  const status = pickCol(r, "actStatus");
  return {
    id,
    kind: KIND_BY_OBJECT[objectType] ?? "OTHER",
    label: KIND_BY_OBJECT[objectType] ? undefined : objectType,
    code: pickCol(r, "code") ?? "",
    status: status === undefined ? undefined : Number(status),
    at,
    comments: pickCol(r, "comments") ?? "",
  };
}

/**
 * Row of the document timelines (checked 2026-11-19), column case differs, pickCol ignores it:
 *   api.crm.projects/getTimeline {prjc}  → { unit: "crm" | "emporiko", id, soredir, sosource, trndate, code, comments?, amnt, fprms, image }
 *   api.crm.customers/getTimeline {trdr} → { OBJTYPE: "1" document | "2" action, ID, SOREDIR, SOSOURCE, TFPRMS, TRNDATE, CODE,
 *                                            COMMENTS?, AMNT, FPRMS, IMAGE, REDIR, COMPANY }
 * soredir seen: 1 call, 2 meeting, 3 task (0 on documents). Commercial rows (unit emporiko / OBJTYPE 1) = offers.
 * fprms (SoftOne's type name) is shown as is.
 */
const KIND_BY_SOREDIR: Record<string, TimelineKind> = { "1": "CALL", "2": "MEETING", "3": "TASK" };
export function rowToDocTimelineEntry(r: S1TimelineRow, amountBasis: "NET" | "TOTAL"): TimelineEntry {
  const id = pickCol(r, "id");
  const at = s1DateTimeToIso(pickCol(r, "trndate"));
  if (!id || !at) throw new Error(`getTimeline: row without id/trndate: ${JSON.stringify(r).slice(0, 200)}`);
  const unit = pickCol(r, "unit")?.toLowerCase();
  const commercial = unit === "emporiko" || pickCol(r, "objtype") === "1";
  const kind: TimelineKind = commercial ? "OFFER" : (KIND_BY_SOREDIR[pickCol(r, "soredir") ?? ""] ?? "OTHER");
  const amount = Number(pickCol(r, "amnt") ?? NaN);
  return {
    // action and document ids are separate number ranges
    id: `${commercial ? "doc" : "act"}:${id}`,
    kind,
    label: pickCol(r, "fprms"),
    code: pickCol(r, "code") ?? "",
    at,
    comments: pickCol(r, "comments") ?? "",
    ...(Number.isFinite(amount) && amount !== 0 ? { amount, amountBasis } : {}),
  };
}

/**
 * Row of api.crm.actions/getPendings (checked 2026-11-19):
 *   { soaction, soredir, series, trdr?, trdr_customer_code, trdr_customer_name, prjc?, prjc_prjc_code?, prjc_prjc_name?,
 *     actStatus, comments?, dueDate? (tasks), fromDate, actPrsn?, actPrsn_prsnin_name, actPrsn_prsnin_name2 }
 * Tasks, calls, emails and meetings of every series – including old ones (1001, 1002, 1004–1006, 2000) and the
 * Άφιξη/Αναχώρηση SOMEETINGs, which are records, not to-dos, and are dropped here (`arrivalSeries`).
 */
export type S1PendingRow = Record<string, unknown>;
/** soredir seen: 1 call, 2 meeting, 3 task. Email is recognised by its series (SOEMAIL 1003) – its soredir not seen yet. */
const ACTION_KIND_BY_SOREDIR: Record<string, ActionKind> = { "1": "CALL", "2": "MEETING", "3": "TASK" };
export const ACTION_OBJECT: Record<ActionKind, "SOTASK" | "SOCALL" | "SOEMAIL" | "SOMEETING"> = { TASK: "SOTASK", ...NEXT_ACTION_OBJECT };
export function rowToTask(
  r: S1PendingRow,
  fallbackDoctorId: string,
  fallbackUserId: string,
  series: { arrival: number; email: number },
): Task | null {
  const st = Number(pickCol(r, "actstatus") ?? TASK_STATUS_OPEN);
  if (st === TASK_STATUS_CANCELLED) return null;
  const ser = pickCol(r, "series");
  if (ser !== undefined && Number(ser) === series.arrival) return null;
  const id = pickCol(r, "soaction", "id") ?? "";
  const soredir = pickCol(r, "soredir");
  // rows from before 2026-11-19 had no soredir: those were the SOTASK Εκκρεμότητες
  const kind: ActionKind | undefined = ser !== undefined && Number(ser) === series.email ? "EMAIL" : soredir === undefined ? "TASK" : ACTION_KIND_BY_SOREDIR[soredir];
  if (!kind) throw new Error(`getPendings: action ${id} has soredir ${soredir} (series ${ser}) – unknown object; add it to ACTION_KIND_BY_SOREDIR`);
  const from = pickCol(r, "fromdate");
  const due = kind === "TASK" ? (pickCol(r, "duedate") ?? from ?? "") : (from ?? pickCol(r, "duedate") ?? "");
  const owner = [pickCol(r, "actPrsn_prsnin_name"), pickCol(r, "actPrsn_prsnin_name2")].filter(Boolean).join(" ");
  return {
    id,
    doctorId: pickCol(r, "trdr") ?? fallbackDoctorId,
    doctorName: pickCol(r, "trdr_customer_name"),
    doctorCode: pickCol(r, "trdr_customer_code"),
    projectId: pickCol(r, "prjc"),
    projectName: pickCol(r, "prjc_prjc_name"),
    projectCode: pickCol(r, "prjc_prjc_code"),
    userId: pickCol(r, "actprsn", "prsn") ?? fallbackUserId,
    ownerName: owner || undefined,
    title: pickCol(r, "comments", "title") ?? "",
    dueDate: due.slice(0, 10),
    time: kind !== "TASK" && from ? from.slice(11, 16) : undefined,
    kind,
    series: ser,
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
    // channels and the saving user are not on SoftOne's signature file: left out, not faked
    signedAt: latest.at,
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
  /** machine price (€), owner 2026-11-14 */
  price?: number | string | null;
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
  const price = r.price === undefined || r.price === null || r.price === "" ? null : Number(r.price);
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
    price: price !== null && Number.isFinite(price) ? price : null,
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
    price: r.price ?? null,
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

/**
 * Αναφορά Ημέρας ← api.crm/dashboard {prsn, fromDate, finalDate} (owner, 2026-11-12). One call, four arrays
 * at the top level (no `data` envelope), every row carries trdr + trdr_customer_name:
 *   appointments  SOMEETING 2003  {soaction, fromDate, finalDate, comments?, trdr, trdr_customer_name}
 *   followUps     SOTASK 3001     {soaction, fromDate, comments, trdr, trdr_customer_name}
 *   overdue       SOTASK 3000     {soaction, dueDate, actStatus, comments, trdr, trdr_customer_name}
 *   pendingOffers SALDOC 7015     {findoc, fincode, trnDate, comments, trdr, trdr_customer_name}
 * A row without id / trdr / date is a contract break → throw, never guess.
 */
export interface S1DashboardResponse {
  appointments?: S1PendingRow[];
  followUps?: S1PendingRow[];
  overdue?: S1PendingRow[];
  pendingOffers?: S1PendingRow[];
}

export function dashboardToReport(res: S1DashboardResponse): DailyReport {
  const rows = (
    section: keyof S1DashboardResponse,
    kind: DailyReportItem["kind"],
    idCol: string,
    dateCol: string,
    href: (trdr: string, id: string) => string,
    title: (r: S1PendingRow) => string,
  ): DailyReportItem[] =>
    (res[section] ?? [])
      .map((r) => {
        const id = pickCol(r, idCol);
        const trdr = pickCol(r, "trdr");
        const date = pickCol(r, dateCol);
        if (!id || !trdr || !date) throw new S1Error(`api.crm/dashboard ${section}: row without ${idCol}/trdr/${dateCol}: ${JSON.stringify(r).slice(0, 200)}`);
        return { kind, date: date.slice(0, 10), doctorId: trdr, doctorName: pickCol(r, "trdr_customer_name") ?? "", title: title(r), href: href(trdr, id) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  const comments = (r: S1PendingRow) => pickCol(r, "comments") ?? "";
  return {
    appointments: rows("appointments", "APPOINTMENT", "soaction", "fromdate", (t) => `/customers/${t}`, comments),
    offerFollowUps: rows("followUps", "OFFER_FOLLOWUP", "soaction", "fromdate", (t) => `/customers/${t}`, comments),
    overdue: rows("overdue", "OVERDUE", "soaction", "duedate", (t) => `/customers/${t}/pending`, comments),
    pendingOffers: rows("pendingOffers", "PENDING_OFFER", "findoc", "trndate", (t) => `/customers/${t}/offers`, (r) =>
      [pickCol(r, "fincode"), pickCol(r, "comments")].filter(Boolean).join(" – "),
    ),
  };
}
