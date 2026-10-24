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
} from "../../domain/types";
import type { DataProvider, DateRange, DoctorSearch, NewEntity } from "../provider";
import { mutateCollection, newId, readCollection } from "./store";
import { seedIfEmpty } from "./seed";

function norm(s: string | undefined | null) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function inRange(date: string, range?: DateRange) {
  if (!range) return true;
  const d = date.slice(0, 10);
  return d >= range.from && d <= range.to;
}

function byDateDesc<T>(key: (t: T) => string) {
  return (a: T, b: T) => key(b).localeCompare(key(a));
}

async function ready() {
  await seedIfEmpty();
}

async function all<T>(name: Parameters<typeof readCollection>[0]): Promise<T[]> {
  await ready();
  return readCollection<T>(name);
}

async function insert<T extends { id: string }>(name: Parameters<typeof readCollection>[0], row: NewEntity<T>): Promise<T> {
  await ready();
  const full = { ...row, id: newId() } as T;
  await mutateCollection<T>(name, (rows) => {
    rows.push(full);
  });
  return full;
}

async function patch<T extends { id: string }>(name: Parameters<typeof readCollection>[0], id: string, p: Partial<T>): Promise<T> {
  await ready();
  let updated: T | undefined;
  await mutateCollection<T>(name, (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`${name}: ${id} not found`);
    rows[i] = { ...rows[i], ...p, id };
    updated = rows[i];
  });
  return updated!;
}

export const localProvider: DataProvider = {
  name: "local",

  users: {
    async findByUsername(username) {
      const rows = await all<User>("users");
      return rows.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
    async findById(id) {
      return (await all<User>("users")).find((u) => u.id === id) ?? null;
    },
    list: () => all<User>("users"),
  },

  doctors: {
    async search(q) {
      const rows = await all<Doctor>("doctors");
      const f = norm(q.firstName), l = norm(q.lastName), a = norm(q.afm), m = norm(q.mobile).replace(/\s+/g, "");
      if (!f && !l && !a && !m) return [];
      return rows
        .filter((d) => {
          if (f && !norm(d.firstName).includes(f)) return false;
          if (l && !norm(d.lastName).includes(l)) return false;
          if (a && !d.afm.includes(a)) return false;
          if (m && !d.mobile.replace(/\s+/g, "").includes(m)) return false;
          return true;
        })
        .sort((x, y) => `${x.lastName} ${x.firstName}`.localeCompare(`${y.lastName} ${y.firstName}`, "el"));
    },
    async findById(id) {
      return (await all<Doctor>("doctors")).find((d) => d.id === id) ?? null;
    },
    async findByIds(ids) {
      const set = new Set(ids);
      return (await all<Doctor>("doctors")).filter((d) => set.has(d.id));
    },
    create: (d) => insert<Doctor>("doctors", d),
    update: (id, p) => patch<Doctor>("doctors", id, p),
    async saveConsent(c) {
      await ready();
      const full: Consent = { ...c, id: newId() };
      await mutateCollection<Consent>("consents", (rows) => rows.filter((r) => r.doctorId !== c.doctorId).concat(full));
      return full;
    },
    async getConsent(doctorId) {
      return (await all<Consent>("consents")).find((c) => c.doctorId === doctorId) ?? null;
    },
  },

  equipment: {
    async listByDoctor(doctorId) {
      return (await all<Equipment>("equipment")).filter((e) => e.doctorId === doctorId);
    },
    async replaceForDoctor(doctorId, rows) {
      await ready();
      const full = rows.map((r) => ({ ...r, id: newId(), doctorId }) as Equipment);
      await mutateCollection<Equipment>("equipment", (existing) => existing.filter((e) => e.doctorId !== doctorId).concat(full));
      return full;
    },
  },

  visits: {
    async listByDoctor(doctorId) {
      return (await all<Visit>("visits")).filter((v) => v.doctorId === doctorId).sort(byDateDesc((v) => v.date));
    },
    async listByUser(userId, range) {
      return (await all<Visit>("visits")).filter((v) => v.userId === userId && inRange(v.date, range));
    },
    async listAll(range) {
      return (await all<Visit>("visits")).filter((v) => inRange(v.date, range));
    },
    create: (v) => insert<Visit>("visits", v),
  },

  projects: {
    async listByDoctor(doctorId) {
      return (await all<Project>("projects")).filter((p) => p.doctorId === doctorId).sort(byDateDesc((p) => p.createdAt));
    },
    async listByUser(userId) {
      return (await all<Project>("projects")).filter((p) => p.userId === userId);
    },
    listAll: () => all<Project>("projects"),
    async findById(id) {
      return (await all<Project>("projects")).find((p) => p.id === id) ?? null;
    },
    create: (p) => insert<Project>("projects", p),
    update: (id, p) => patch<Project>("projects", id, p),
    async nextSequence(year) {
      const rows = await all<Project>("projects");
      const prefix = `PR-${year}-`;
      const max = rows
        .filter((p) => p.code.startsWith(prefix))
        .reduce((m, p) => Math.max(m, parseInt(p.code.slice(prefix.length), 10) || 0), 0);
      return max + 1;
    },
    async listEvents(projectId) {
      return (await all<ProjectEvent>("project_events")).filter((e) => e.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
    },
    addEvent: (e) => insert<ProjectEvent>("project_events", e),
    async listFollowUps(projectId) {
      return (await all<FollowUp>("follow_ups")).filter((f) => f.projectId === projectId).sort(byDateDesc((f) => f.date));
    },
    async listFollowUpsByUser(userId, range) {
      return (await all<FollowUp>("follow_ups")).filter((f) => f.userId === userId && (!f.nextActionDate || inRange(f.nextActionDate, range)));
    },
    addFollowUp: (f) => insert<FollowUp>("follow_ups", f),
  },

  offers: {
    async listByDoctor(doctorId) {
      return (await all<Offer>("offers")).filter((o) => o.doctorId === doctorId).sort(byDateDesc((o) => o.date));
    },
    async listByProject(projectId) {
      return (await all<Offer>("offers")).filter((o) => o.projectId === projectId).sort((a, b) => b.version - a.version);
    },
    async listByRequester(userId) {
      return (await all<Offer>("offers")).filter((o) => o.requestedBy === userId);
    },
    listAll: () => all<Offer>("offers"),
    async findById(id) {
      return (await all<Offer>("offers")).find((o) => o.id === id) ?? null;
    },
    create: (o) => insert<Offer>("offers", o),
    update: (id, p) => patch<Offer>("offers", id, p),
  },

  tasks: {
    async listByDoctor(doctorId) {
      return (await all<Task>("tasks")).filter((t) => t.doctorId === doctorId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },
    async listByUser(userId) {
      return (await all<Task>("tasks")).filter((t) => t.userId === userId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },
    create: (t) => insert<Task>("tasks", t),
    update: (id, p) => patch<Task>("tasks", id, p),
  },

  checkIns: {
    async openForUser(userId, doctorId) {
      return (await all<CheckIn>("check_ins")).find((c) => c.userId === userId && c.doctorId === doctorId && !c.departedAt) ?? null;
    },
    create: (c) => insert<CheckIn>("check_ins", c),
    update: (id, p) => patch<CheckIn>("check_ins", id, p),
    async list(range, userId) {
      return (await all<CheckIn>("check_ins"))
        .filter((c) => (!userId || c.userId === userId) && inRange(c.arrivedAt, range))
        .sort(byDateDesc((c) => c.arrivedAt));
    },
  },

  stats: {
    async listProducts(term) {
      const rows = await all<Product>("products");
      const t = norm(term);
      return t ? rows.filter((p) => norm(p.code).includes(t) || norm(p.name).includes(t)) : rows;
    },
    async findProduct(code) {
      return (await all<Product>("products")).find((p) => p.code === code) ?? null;
    },
    async doctorHistory(doctorId) {
      return (await all<DoctorYearStat>("doctor_history")).filter((s) => s.doctorId === doctorId).sort((a, b) => a.year - b.year);
    },
    async target(userId, year, month) {
      return (await all<Target>("targets")).find((t) => t.userId === userId && t.year === year && t.month === month) ?? null;
    },
    async turnover(userId, year, month) {
      return (await all<SalesTurnover>("sales_turnover")).filter((t) => t.userId === userId && t.year === year && (month === 0 || t.month === month));
    },
  },
};
