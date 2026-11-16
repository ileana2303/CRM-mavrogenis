import { athensToday } from "@/lib/athens";
import { db } from "../data";
import type { Session } from "../auth/jwt";
import type {
  FollowUp,
  NewS1Project,
  NewS1Offer,
  Offer,
  OfferLine,
  Project,
  ProjectLine,
  ProjectType,
} from "../domain/types";
import { offerPrice, sum } from "./pricing";

const today = () => athensToday();
const now = () => new Date().toISOString();
const pad4 = (n: number) => String(n).padStart(4, "0");

export interface LineInput {
  productCode: string;
  qty: number;
  floorPrice: number;
  discountPct: number;
  specialDiscountPct: number;
}

export interface NewProjectInput {
  type: ProjectType;
  title: string;
  notes: string;
  lines: LineInput[];
  requestOffer: boolean;
}

function toProjectLines(lines: LineInput[]): ProjectLine[] {
  return lines
    .filter((l) => l.productCode.trim())
    .map((l, i) => ({
      lineNo: i + 1,
      productCode: l.productCode.trim(),
      qty: Number(l.qty) || 1,
      floorPrice: Number(l.floorPrice) || 0,
      discountPct: Number(l.discountPct) || 0,
      specialDiscountPct: Number(l.specialDiscountPct) || 0,
      offerPrice: offerPrice(l.floorPrice, l.qty || 1, l.discountPct, l.specialDiscountPct),
    }));
}

export function listProjects(doctorId: string) {
  return db().projects.listByDoctor(doctorId);
}

/** «Νέο Project»: a PRJC for the doctor, owned by the logged-in salesperson. */
export function createProjectForDoctor(input: NewS1Project, user: Session) {
  // SALESMAN = the session's PRSN (owner, 2026-11-16) – never saved without an owner
  if (!user.s1Prsn) throw new Error("Η σύνδεση δεν έχει PRSN πωλητή· αποσυνδεθείτε και συνδεθείτε ξανά.");
  return db().projects.createForDoctor(input, user.s1Prsn);
}

/** One project from SoftOne (getData PRJC _CRM_) – header and its offers */
export function getProjectDetail(id: string) {
  return db().projects.detail(id);
}

/** Stage change from the project screen → PRJC.PRJSTATE */
export function setProjectState(id: string, stateId: string) {
  return db().projects.setState(id, stateId);
}

/** «Νέα προσφορά» inside a project: SALDOC in the offer series, owned by the session PRSN. */
export function createOfferForProject(input: NewS1Offer, user: Session) {
  if (!user.s1Prsn) throw new Error("Η σύνδεση δεν έχει PRSN πωλητή· αποσυνδεθείτε και συνδεθείτε ξανά.");
  if (input.lines.length === 0) throw new Error("Προσθέστε τουλάχιστον ένα είδος.");
  return db().offers.createForProject(input, user.s1Prsn);
}

/** SoftOne's prices / VAT / totals for an offer draft (calculate – nothing saved). */
export function calculateOfferForProject(input: NewS1Offer, user: Session) {
  if (!user.s1Prsn) throw new Error("Η σύνδεση δεν έχει PRSN πωλητή· αποσυνδεθείτε και συνδεθείτε ξανά.");
  return db().offers.calculateForProject(input, user.s1Prsn);
}

export function searchProducts(q: string, limit = 20) {
  return db().stats.searchProducts(q, limit);
}

export function projectLookups() {
  return db().stats.projectLookups();
}

/** The doctor's projects as SoftOne lists them (code, title, active) – what the project list shows today. */
export function listProjectSummaries(doctorId: string) {
  return db().projects.summariesByDoctor(doctorId);
}

export function getProject(id: string) {
  return db().projects.findById(id);
}

export async function getProjectBundle(id: string) {
  const project = await db().projects.findById(id);
  if (!project) return null;
  const [events, offers, followUps] = await Promise.all([
    db().projects.listEvents(id),
    db().offers.listByProject(id),
    db().projects.listFollowUps(id),
  ]);
  return { project, events, offers, followUps, latestOffer: offers[0] ?? null };
}

export async function createProject(doctorId: string, input: NewProjectInput, user: Session): Promise<Project> {
  const year = new Date().getFullYear();
  const seq = await db().projects.nextSequence(year);
  const lines = toProjectLines(input.lines);
  const value = sum(lines.map((l) => l.offerPrice));
  const project = await db().projects.create({
    code: `PR-${year}-${pad4(seq)}`,
    doctorId,
    userId: user.userId,
    type: input.type,
    title: input.title.trim() || "Project",
    stage: "INTEREST",
    status: "ACTIVE",
    value,
    notes: input.notes,
    createdAt: now(),
    lines,
  });
  await db().projects.addEvent({
    projectId: project.id,
    date: now(),
    type: "CREATED",
    title: "Δημιουργία Project",
    description: `Καταχώριση ενδιαφέροντος για ${project.title}`,
    userId: user.userId,
  });
  if (input.requestOffer && lines.length) {
    await requestOffer(project, user);
  }
  return project;
}

/** Creates version 1 of the offer and sends it to Support. */
export async function requestOffer(project: Project, user: Session): Promise<Offer> {
  const year = project.code.split("-")[1];
  const seq = project.code.split("-")[2];
  const existing = await db().offers.listByProject(project.id);
  const version = (existing[0]?.version ?? 0) + 1;
  const lines: OfferLine[] = project.lines.map((l) => ({
    lineNo: l.lineNo,
    productCode: l.productCode,
    qty: l.qty,
    floorPrice: l.floorPrice,
    discountPct: l.discountPct,
    specialDiscountPct: l.specialDiscountPct,
    offerPrice: l.offerPrice,
    prevPrice: existing[0]?.lines.find((x) => x.lineNo === l.lineNo)?.offerPrice ?? null,
  }));
  const offer = await db().offers.create({
    projectId: project.id,
    doctorId: project.doctorId,
    number: `Q-${year}-${seq}`,
    version,
    date: today(),
    title: project.title,
    status: "REQUESTED",
    total: sum(lines.map((l) => l.offerPrice)),
    requestedBy: user.userId,
    requestedAt: now(),
    lines,
  });
  await db().projects.update(project.id, { stage: project.stage === "INTEREST" ? "OFFER" : project.stage });
  await db().projects.addEvent({
    projectId: project.id,
    date: now(),
    type: "OFFER_REQUESTED",
    title: "Αίτημα προσφοράς",
    description: `Αίτημα προς τμήμα υποστήριξης (${offer.number}/V${offer.version})`,
    userId: user.userId,
  });
  return offer;
}

export interface FollowUpInput {
  contactMethod: FollowUp["contactMethod"];
  result: FollowUp["result"];
  comment: string;
  nextAction: FollowUp["nextAction"];
  nextActionDate?: string;
}

export async function addFollowUp(project: Project, input: FollowUpInput, user: Session) {
  const fu = await db().projects.addFollowUp({
    projectId: project.id,
    date: now(),
    ...input,
    nextActionDate: input.nextActionDate || undefined,
    userId: user.userId,
  });
  await db().projects.addEvent({
    projectId: project.id,
    date: now(),
    type: "FOLLOW_UP",
    title: "Follow-up",
    description: input.comment || "—",
    userId: user.userId,
  });
  if (project.stage === "OFFER" && input.result === "POSITIVE") {
    await db().projects.update(project.id, { stage: "NEGOTIATION" });
  }
  if (input.nextAction !== "NONE" && input.nextActionDate) {
    const labels: Record<FollowUp["nextAction"], string> = {
      FOLLOWUP: `Follow-up ${project.title}`,
      DEMO: `Demo ${project.title}`,
      SEND_MATERIAL: `Αποστολή υλικού ${project.title}`,
      OTHER: `Ενέργεια ${project.title}`,
      NONE: "",
    };
    await db().tasks.create({
      doctorId: project.doctorId,
      projectId: project.id,
      userId: user.userId,
      title: labels[input.nextAction],
      dueDate: input.nextActionDate,
      status: "OPEN",
      source: "FOLLOW_UP",
    });
  }
  return fu;
}

export interface ReviseInput {
  lines: Array<{ lineNo: number; discountPct: number; specialDiscountPct: number }>;
  notes: string;
  reason: string;
}

/** Creates the next offer version (V2, V3…) and sends it to Support. */
export async function reviseOffer(project: Project, input: ReviseInput, user: Session): Promise<Offer> {
  if (!input.reason.trim()) throw new Error("REASON_REQUIRED");
  const newLines: ProjectLine[] = project.lines.map((l) => {
    const r = input.lines.find((x) => x.lineNo === l.lineNo);
    const discountPct = r ? Number(r.discountPct) || 0 : l.discountPct;
    const specialDiscountPct = r ? Number(r.specialDiscountPct) || 0 : l.specialDiscountPct;
    return { ...l, discountPct, specialDiscountPct, offerPrice: offerPrice(l.floorPrice, l.qty, discountPct, specialDiscountPct) };
  });
  const updated = await db().projects.update(project.id, {
    lines: newLines,
    value: sum(newLines.map((l) => l.offerPrice)),
    notes: input.notes,
    stage: "NEGOTIATION",
  });
  const offer = await requestOffer(updated, user);
  await db().offers.update(offer.id, { revisionReason: input.reason.trim() });
  await db().projects.addEvent({
    projectId: project.id,
    date: now(),
    type: "REVISION",
    title: "Αναθεώρηση προσφοράς",
    description: `${offer.number}/V${offer.version} – ${input.reason.trim()}`,
    userId: user.userId,
  });
  return { ...offer, revisionReason: input.reason.trim() };
}

export interface CloseLineInput {
  lineNo: number;
  won: boolean;
  competitor: string;
  competitorModel: string;
  competitorPrice: number | null;
  closeComments: string;
}

export async function closeProject(project: Project, lines: CloseLineInput[], user: Session) {
  const newLines = project.lines.map((l) => {
    const c = lines.find((x) => x.lineNo === l.lineNo);
    return c ? { ...l, won: c.won, competitor: c.competitor, competitorModel: c.competitorModel, competitorPrice: c.competitorPrice, closeComments: c.closeComments } : l;
  });
  const wonCount = newLines.filter((l) => l.won).length;
  const stage: Project["stage"] = wonCount === 0 ? "LOST" : wonCount === newLines.length ? "WON" : "PARTIAL";
  const updated = await db().projects.update(project.id, { lines: newLines, stage, status: "CLOSED", closedAt: now() });
  const offers = await db().offers.listByProject(project.id);
  if (offers[0]) {
    await db().offers.update(offers[0].id, { closed: stage === "WON" ? "YES" : stage === "LOST" ? "NO" : "PARTIAL" });
  }
  await db().projects.addEvent({
    projectId: project.id,
    date: now(),
    type: "CLOSED",
    title: "Κλείσιμο project",
    description: stage === "WON" ? "Κερδισμένο" : stage === "LOST" ? "Χαμένο" : "Μερικώς κερδισμένο",
    userId: user.userId,
  });
  // close open tasks of this project
  const tasks = await db().tasks.listByDoctor(project.doctorId);
  for (const t of tasks.filter((t) => t.projectId === project.id && t.status === "OPEN")) {
    await db().tasks.update(t.id, { status: "DONE", doneAt: now() });
  }
  return updated;
}

export function listProducts(term?: string) {
  return db().stats.listProducts(term);
}
