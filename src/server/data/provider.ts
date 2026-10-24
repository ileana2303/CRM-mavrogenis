/**
 * Data provider contract.
 * The UI never calls a provider directly; services (src/server/services) do.
 * Two implementations:
 *   - local/   : JSON files under ./data, seeded from the slides (development & demo)
 *   - softone/ : SoftOne web services (see docs/SOFTONE-SPEC.md)
 */
import type {
  CheckIn,
  Consent,
  Doctor,
  DoctorYearStat,
  Equipment,
  FollowUp,
  Offer,
  Product,
  Project,
  ProjectEvent,
  SalesTurnover,
  Target,
  Task,
  User,
  Visit,
} from "../domain/types";

export interface DoctorSearch {
  firstName?: string;
  lastName?: string;
  afm?: string;
  mobile?: string;
}

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
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
}

export interface TasksRepo {
  listByDoctor(doctorId: string): Promise<Task[]>;
  listByUser(userId: string): Promise<Task[]>;
  create(t: NewEntity<Task>): Promise<Task>;
  update(id: string, patch: Partial<Task>): Promise<Task>;
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
  findProduct(code: string): Promise<Product | null>;
  doctorHistory(doctorId: string): Promise<DoctorYearStat[]>;
  target(userId: string, year: number, month: number): Promise<Target | null>;
  turnover(userId: string, year: number, month: number): Promise<SalesTurnover[]>;
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
