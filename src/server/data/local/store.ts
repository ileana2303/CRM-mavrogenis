/**
 * Minimal JSON-file store for development/demo.
 * One file per collection under ./data. Reads go to disk every time (files are small,
 * and this keeps Next.js dev HMR module duplication harmless). Writes are serialised.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");

export type CollectionName =
  | "users"
  | "doctors"
  | "consents"
  | "equipment"
  | "autopsies"
  | "visits"
  | "projects"
  | "project_events"
  | "follow_ups"
  | "offers"
  | "tasks"
  | "check_ins"
  | "products"
  | "hospitals"
  | "doctor_history"
  | "targets"
  | "sales_turnover";

function fileFor(name: CollectionName) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function collectionExists(name: CollectionName) {
  return fs.existsSync(fileFor(name));
}

const VERSION_FILE = path.join(DATA_DIR, ".seed-version");

export function readSeedVersion(): string {
  try {
    return fs.readFileSync(VERSION_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

export function writeSeedVersion(v: string) {
  ensureDataDir();
  fs.writeFileSync(VERSION_FILE, v, "utf8");
}

export function readCollection<T>(name: CollectionName): T[] {
  const file = fileFor(name);
  if (!fs.existsSync(file)) return [];
  // A concurrent write (tmp + rename) can expose an empty/partial file for a moment: retry once.
  for (let attempt = 0; ; attempt++) {
    const raw = fs.readFileSync(file, "utf8");
    try {
      return raw.trim() ? (JSON.parse(raw) as T[]) : [];
    } catch (e) {
      if (attempt >= 2) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

let writeQueue: Promise<void> = Promise.resolve();

export function writeCollection<T>(name: CollectionName, rows: T[]): Promise<void> {
  ensureDataDir();
  const file = fileFor(name);
  const tmp = `${file}.tmp`;
  writeQueue = writeQueue.then(() => {
    fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), "utf8");
    fs.renameSync(tmp, file);
  });
  return writeQueue;
}

export async function mutateCollection<T>(
  name: CollectionName,
  fn: (rows: T[]) => T[] | void,
): Promise<T[]> {
  const rows = readCollection<T>(name);
  const next = fn(rows) ?? rows;
  await writeCollection(name, next);
  return next;
}

export function newId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
