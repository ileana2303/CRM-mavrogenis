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
  | "visits"
  | "projects"
  | "project_events"
  | "follow_ups"
  | "offers"
  | "tasks"
  | "check_ins"
  | "products"
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

export function readCollection<T>(name: CollectionName): T[] {
  const file = fileFor(name);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as T[];
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
