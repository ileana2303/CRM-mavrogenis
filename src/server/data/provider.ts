/**
 * Data provider contract.
 * The UI never calls a provider directly; services (src/server/services) do.
 * Implemented by softone/ (SoftOne web services, see docs/SOFTONE-SPEC.md) – the only data source.
 */
import type {
  CheckIn,
  DailyReport,
  Hospital,
  MachineCatalog,
  Consent,
  Doctor,
  DoctorYearStat,
  Equipment,
  FollowUp,
  Offer,
  Product,
  Project,
  ProjectEvent,
  ProjectSummary,
  ProjectDetail,
  NewS1Project,
  NewS1Offer,
  OfferCalc,
  ProductHit,
  ProjectLookups,
  SalesTurnover,
  Target,
  Task,
  NewNextAction,
  NewCallLog,
  ActionKind,
  TimelineEntry,
  TimelineSearchPage,
  TimelineSearchUnit,
  MachineListKind,
  Salesperson,
  MachineRef,
  User,
  Visit,
} from "../domain/types";

export interface DoctorSearch {
  /** free text over every field (name, ΑΦΜ, κινητό, email, πόλη) – preferred */
  q?: string;
  firstName?: string;
  lastName?: string;
  afm?: string;
  mobile?: string;
}

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

/** `api.crm.projects/search` — all filters optional and AND-combined. */
export interface TimelineSearchQuery {
  q1?: string;
  q2?: string;
  /** YYYY-MM-DD — same as dashboard Φίλτρα (`from` / `to` URL params) */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  withItems?: boolean;
  findoc?: number;
  /** CRM detail: filter by SOACTION id when findoc is absent */
  id?: number;
  unit?: TimelineSearchUnit;
}

export type NewEntity<T> = Omit<T, "id">;

export interface UsersRepo {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}

export interface DoctorsRepo {
  search(q: DoctorSearch): Promise<Doctor[]>;
  findById(id: string): Promise<Doctor | null>;
  findByIds(ids: string[]): Promise<Doctor[]>;
  create(d: NewEntity<Doctor>): Promise<Doctor>;
  update(id: string, patch: Partial<Doctor>): Promise<Doctor>;
  saveConsent(c: NewEntity<Consent>): Promise<Consent>;
  getConsent(doctorId: string): Promise<Consent | null>;
  /** api.crm.customers/getTimeline {trdr}: the customer's actions and documents, newest first */
  timeline(doctorId: string): Promise<TimelineEntry[]>;
}

export interface EquipmentRepo {
  listByDoctor(doctorId: string): Promise<Equipment[]>;
  replaceForDoctor(doctorId: string, rows: NewEntity<Equipment>[]): Promise<Equipment[]>;
}

export interface VisitsRepo {
  listByDoctor(doctorId: string): Promise<Visit[]>;
  listByUser(userId: string, range?: DateRange): Promise<Visit[]>;
  listAll(range?: DateRange): Promise<Visit[]>;
  create(v: NewEntity<Visit>): Promise<Visit>;
}

export interface ProjectsRepo {
  listByDoctor(doctorId: string): Promise<Project[]>;
  /** api.crm.customers/projects {trdr} – the doctor's PRJC rows */
  summariesByDoctor(doctorId: string): Promise<ProjectSummary[]>;
  /** api.crm.projects/getTimeline {prjc}: actions and offers on the project, newest first */
  timeline(projectId: string): Promise<TimelineEntry[]>;
  /** api.crm.projects/search — unified CRM + sales timeline (CRM_TIMELINE) */
  search(params: TimelineSearchQuery): Promise<TimelineSearchPage>;
  /** setData PRJC (form _CRM_) → the new PRJC id */
  createForDoctor(p: NewS1Project, salesmanId?: string): Promise<{ id: string }>;
  /** getData PRJC form _CRM_ key = prjc; null when SoftOne has no such project */
  detail(id: string): Promise<ProjectDetail | null>;
  /** setData PRJC key = prjc, form _CRM_, header delta {PRJSTATE} */
  setState(id: string, stateId: string): Promise<void>;
  listByUser(userId: string): Promise<Project[]>;
  listAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(p: NewEntity<Project>): Promise<Project>;
  update(id: string, patch: Partial<Project>): Promise<Project>;
  /** Next number in the yearly PR/Q sequence */
  nextSequence(year: number): Promise<number>;
  listEvents(projectId: string): Promise<ProjectEvent[]>;
  addEvent(e: NewEntity<ProjectEvent>): Promise<ProjectEvent>;
  listFollowUps(projectId: string): Promise<FollowUp[]>;
  listFollowUpsByUser(userId: string, range?: DateRange): Promise<FollowUp[]>;
  addFollowUp(f: NewEntity<FollowUp>): Promise<FollowUp>;
}

export interface OffersRepo {
  listByDoctor(doctorId: string): Promise<Offer[]>;
  listByProject(projectId: string): Promise<Offer[]>;
  listByRequester(userId: string): Promise<Offer[]>;
  listAll(): Promise<Offer[]>;
  findById(id: string): Promise<Offer | null>;
  create(o: NewEntity<Offer>): Promise<Offer>;
  update(id: string, patch: Partial<Offer>): Promise<Offer>;
  /** setData SALDOC form _CRM_: SERIES = offer series, TRDR, PRJC, SALESMAN + ITELINES → the new FINDOC */
  createForProject(o: NewS1Offer, salesmanId: string): Promise<{ id: string }>;
  /** calculate SALDOC form _CRM_ with the same payload as createForProject – nothing is saved */
  calculateForProject(o: NewS1Offer, salesmanId: string): Promise<OfferCalc>;
}

export interface TasksRepo {
  listByDoctor(doctorId: string): Promise<Task[]>;
  /** api.crm.actions/getPendings {trdr}: the tasks (`data`) and the customer's projects (top-level `projects`) in one call */
  pendingsByDoctor(doctorId: string): Promise<{ tasks: Task[]; projects: ProjectSummary[] }>;
  /** the logged-in salesperson's open items across customers, dated up to `toDate` ("yyyy-mm-dd") when given */
  listByUser(userId: string, toDate?: string): Promise<Task[]>;
  create(t: NewEntity<Task>): Promise<Task>;
  /** header delta on the item's own object – SOTASK unless `kind` says otherwise */
  update(id: string, patch: Partial<Task>, kind?: ActionKind): Promise<Task>;
  /** «Επόμενη ενέργεια»: new SOCALL / SOEMAIL / SOMEETING for the customer → its SOACTION id */
  createNextAction(a: NewNextAction): Promise<{ id: string }>;
  /** «Καταγραφή κλήσης»: a done SOCALL in the call series → its SOACTION id */
  logCall(c: NewCallLog): Promise<{ id: string }>;
  /** api.crm.actions/getTimeline {soaction}: the chain of actions linked to it, newest first */
  timeline(soaction: string): Promise<TimelineEntry[]>;
}

export interface CheckInsRepo {
  openForUser(userId: string, doctorId: string): Promise<CheckIn | null>;
  create(c: NewEntity<CheckIn>): Promise<CheckIn>;
  update(id: string, patch: Partial<CheckIn>): Promise<CheckIn>;
  list(range?: DateRange, userId?: string): Promise<CheckIn[]>;
}

/** Master data that will come from SoftOne (items, targets, invoiced turnover). */
export interface StatsRepo {
  listProducts(term?: string): Promise<Product[]>;
  listHospitals(term?: string): Promise<Hospital[]>;
  /** machine categories / marks / models for the equipment editor */
  machineCatalog(): Promise<MachineCatalog>;
  /** «+ Νέα …» in the equipment pickers: adds to a catalog list (or returns the entry of the same name) */
  createMachineRef(kind: MachineListKind, name: string, markId?: string): Promise<{ ref: MachineRef; existing: boolean }>;
  projectLookups(): Promise<ProjectLookups>;
  /** api.crm/bootstrap `prsns` – who an action can be assigned to (ACTPRSN) */
  salespeople(): Promise<Salesperson[]>;
  /** api.crm.products/list {q}: the first `limit` matches and how many there are in all */
  searchProducts(q: string, limit: number): Promise<{ total: number; items: ProductHit[] }>;
  findProduct(code: string): Promise<Product | null>;
  doctorHistory(doctorId: string): Promise<DoctorYearStat[]>;
  target(userId: string, year: number, month: number): Promise<Target | null>;
  turnover(userId: string, year: number, month: number): Promise<SalesTurnover[]>;
  /** Αναφορά Ημέρας of one salesperson (PRSN) – a single SoftOne call */
  dailyReport(userId: string, range: DateRange): Promise<DailyReport>;
}

export interface DataProvider {
  readonly name: "local" | "softone";
  users: UsersRepo;
  doctors: DoctorsRepo;
  equipment: EquipmentRepo;
  visits: VisitsRepo;
  projects: ProjectsRepo;
  offers: OffersRepo;
  tasks: TasksRepo;
  checkIns: CheckInsRepo;
  stats: StatsRepo;
}
