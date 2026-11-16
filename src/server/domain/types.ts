/**
 * Domain model of the Sales CRM.
 * These types are the contract between the UI/services and any data provider
 * (local JSON store today, SoftOne web services later – see docs/SOFTONE-SPEC.md).
 * Dates are ISO strings: "YYYY-MM-DD" for dates, full ISO 8601 for timestamps.
 */

export type Role = "SALESPERSON" | "MANAGER" | "SUPPORT";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  /** SoftOne SALESMAN code (role SALESPERSON) */
  salesPersonCode?: string;
  managerId?: string;
}

export type ActivityType = "PRIVATE" | "PUBLIC";
export type DoctorRank = "RESIDENT" | "CURATOR" | "DIRECTOR" | "PROFESSOR";

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  activityType?: ActivityType;
  clinicAddress: string;
  city: string;
  postalCode: string;
  /** Linked hospitals (SoftOne detail CCCTRDTRDR: TRDREL = the hospital's TRDR) */
  hospitals: HospitalRef[];
  afm: string;
  rank?: DoctorRank;
  ownerUserId: string;
  /** SoftOne TRDR id once synced */
  softoneTrdr?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  code?: string;
  name: string;
}

export interface HospitalRef extends Hospital {
  /** SoftOne detail line number (needed to update/delete the link) */
  lineNo?: number;
}

export interface ConsentChannels {
  email: boolean;
  sms: boolean;
  phone: boolean;
  viber: boolean;
}

export interface Consent {
  id: string;
  doctorId: string;
  signerName: string;
  /** PNG data URL */
  signaturePng: string;
  channels: ConsentChannels;
  signedAt: string;
  byUserId: string;
}

export type EquipmentCategory =
  | "OCT"
  | "PERIMETER"
  | "BIOMETER"
  | "TOPOGRAPHER"
  | "SLIT_LAMP"
  | "LENSMETER"
  | "FUNDUS_CAMERA"
  | "LASER"
  | "MICROSCOPE"
  | "OTHER";

export interface Equipment {
  id: string;
  doctorId: string;
  /** display name of the category (SoftOne machine category; legacy local rows hold an EquipmentCategory code) */
  category: string;
  manufacturer: string;
  model: string;
  /** SoftOne ids from api.crm/bootstrap → machine.{categories,marks,models} */
  categoryId?: string;
  markId?: string;
  modelId?: string;
  /** SoftOne detail LINENUM of the machine row (absent on new rows) */
  lineNum?: number;
  purchaseYear: number | null;
  serviceContract: boolean;
  serialNumber?: string;
  /** machine price (€) – CCCTRDMACHINES `price`; null when not set */
  price?: number | null;
}

/** One row of a machine master list (api.crm/bootstrap → machine.*). */
export interface MachineRef {
  id: string;
  code: string;
  name: string;
  /** models only: the mark (brand) they belong to, when SoftOne provides it */
  markId?: string;
}

export interface MachineCatalog {
  categories: MachineRef[];
  marks: MachineRef[];
  models: MachineRef[];
}

export type VisitContactMethod = "VISIT" | "PHONE" | "EMAIL";
export type VisitTopic = "GENERAL" | "EQUIPMENT" | "PROJECT" | "OFFER";
export type VisitOutcome = "NONE" | "CONTACT" | "SEND_MATERIAL" | "DEMO" | "OFFER";

export interface Visit {
  id: string;
  doctorId: string;
  userId: string;
  date: string;
  contactMethod: VisitContactMethod;
  topic: VisitTopic;
  outcome: VisitOutcome;
  nextActionDate?: string;
  comment: string;
  projectId?: string;
}

export type ProjectType = "NEW_CLINIC" | "REPLACEMENT" | "PUBLIC_TENDER";
export type ProjectStage =
  | "INTEREST"
  | "OFFER"
  | "DEMO"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "PARTIAL";
export type ProjectStatus = "ACTIVE" | "CLOSED";

export interface ProjectLine {
  lineNo: number;
  productCode: string;
  qty: number;
  floorPrice: number;
  discountPct: number;
  specialDiscountPct: number;
  offerPrice: number;
  // Close-out (slide 18)
  won?: boolean | null;
  competitor?: string;
  competitorModel?: string;
  competitorPrice?: number | null;
  closeComments?: string;
}

export interface Project {
  id: string;
  /** PR-YYYY-NNNN */
  code: string;
  doctorId: string;
  userId: string;
  type: ProjectType;
  title: string;
  stage: ProjectStage;
  status: ProjectStatus;
  value: number;
  lastOfferDate?: string;
  notes: string;
  createdAt: string;
  closedAt?: string;
  lines: ProjectLine[];
}

export type ProjectEventType =
  | "CREATED"
  | "OFFER_REQUESTED"
  | "OFFER_SENT"
  | "FOLLOW_UP"
  | "REVISION"
  | "CLOSED"
  | "COMMENT";

export interface ProjectEvent {
  id: string;
  projectId: string;
  date: string;
  type: ProjectEventType;
  title: string;
  description: string;
  userId: string;
}

export interface OfferLine {
  lineNo: number;
  productCode: string;
  qty: number;
  floorPrice: number;
  prevPrice?: number | null;
  discountPct: number;
  specialDiscountPct: number;
  offerPrice: number;
}

export type OfferStatus = "REQUESTED" | "PRICED" | "SENT";
export type OfferClosed = "YES" | "NO" | "PARTIAL";

export interface Offer {
  id: string;
  projectId: string;
  doctorId: string;
  /** Q-YYYY-NNNN (same sequence as the project) */
  number: string;
  version: number;
  date: string;
  title: string;
  status: OfferStatus;
  total: number;
  revisionReason?: string;
  closed?: OfferClosed;
  requestedBy: string;
  requestedAt: string;
  answeredBy?: string;
  answeredAt?: string;
  /** Set when the salesperson has seen the priced offer */
  acknowledgedAt?: string;
  supportNotes?: string;
  lines: OfferLine[];
}

export type FollowUpContactMethod = "PHONE" | "VISIT" | "EMAIL" | "ONLINE";
export type FollowUpResult = "POSITIVE" | "NEGATIVE" | "WAITING" | "NO_ANSWER";
export type NextAction = "FOLLOWUP" | "DEMO" | "SEND_MATERIAL" | "OTHER" | "NONE";

export interface FollowUp {
  id: string;
  projectId: string;
  date: string;
  contactMethod: FollowUpContactMethod;
  result: FollowUpResult;
  comment: string;
  nextAction: NextAction;
  nextActionDate?: string;
  userId: string;
}

export type TaskStatus = "OPEN" | "DONE";
export type TaskSource = "MANUAL" | "VISIT" | "FOLLOW_UP" | "OFFER_REQUEST";

export interface Task {
  id: string;
  doctorId: string;
  projectId?: string;
  userId: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  doneAt?: string;
  source: TaskSource;
}

export interface CheckIn {
  id: string;
  doctorId: string;
  userId: string;
  arrivedAt: string;
  departedAt?: string;
  arriveLat?: number;
  arriveLng?: number;
  departLat?: number;
  departLng?: number;
  /** SoftOne SOACTION id (SOMEETING series 2001) when the arrival was sent to SoftOne */
  s1Id?: string;
}

export interface Product {
  code: string;
  name: string;
  floorPrice: number;
  category: EquipmentCategory;
}

/** Yearly figures per doctor (turnover will come from SoftOne). */
export interface DoctorYearStat {
  doctorId: string;
  year: number;
  offersValue: number;
  turnover: number;
  visits: number;
}

export interface Target {
  userId: string;
  year: number;
  /** 0 = whole year */
  month: number;
  amount: number;
}

/** Invoiced turnover per salesperson per month (will come from SoftOne). */
export interface SalesTurnover {
  userId: string;
  year: number;
  month: number;
  amount: number;
}

// ---- Derived / view types -------------------------------------------------

export type TaskStatusView = "OPEN" | "OVERDUE" | "DONE";

export interface KpiPeriod {
  year: number;
  /** 0 = whole year */
  month: number;
}

export interface Kpis {
  target: number;
  turnover: number;
  coveragePct: number;
  uniqueDoctors: number;
  totalVisits: number;
  doctorsWithNewProject: number;
  winRatePct: number;
  wonProjects: number;
  closedProjects: number;
}

export interface DailyReportItem {
  kind: "APPOINTMENT" | "OFFER_FOLLOWUP" | "OVERDUE" | "PENDING_OFFER";
  date: string;
  doctorId: string;
  doctorName: string;
  projectId?: string;
  title: string;
  href: string;
}

export interface DailyReport {
  appointments: DailyReportItem[];
  offerFollowUps: DailyReportItem[];
  overdue: DailyReportItem[];
  pendingOffers: DailyReportItem[];
}
