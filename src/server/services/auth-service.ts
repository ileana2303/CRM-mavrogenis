import bcrypt from "bcryptjs";
import { db, providerMode } from "../data";
import { s1 } from "../data/softone/provider";
import { S1Error } from "../data/softone/client";
import type { Session } from "../auth/jwt";
import type { Role } from "../domain/types";

export type LoginResult = { ok: true; session: Session } | { ok: false; reason: "invalid" | "no_role" | "unavailable"; detail?: string };

/** Local store: bcrypt users from the seed. */
async function authenticateLocal(username: string, password: string): Promise<LoginResult> {
  const user = await db().users.findByUsername(username.trim());
  if (!user) return { ok: false, reason: "invalid" };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false, reason: "invalid" };
  return { ok: true, session: { userId: user.id, username: user.username, fullName: user.fullName, role: user.role } };
}

/** What api.crm/me is expected to return (docs/SOFTONE-API.md §1). Parsed defensively. */
interface MeRow {
  userid?: string | number;
  prsn?: string | number;
  username?: string;
  name?: string;
  role?: string | number;
  crmrole?: string | number;
  salesman?: string | number;
  manager?: string | number;
}

function roleFrom(v: unknown): Role | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "1" || s === "SALESPERSON" || s === "SALES" || s.startsWith("ΠΩΛ")) return "SALESPERSON";
  if (s === "2" || s === "MANAGER" || s.startsWith("ΠΡΟΪΣ") || s.startsWith("ΠΡΟΙΣ")) return "MANAGER";
  if (s === "3" || s === "SUPPORT" || s.startsWith("ΥΠΟΣΤ")) return "SUPPORT";
  return null;
}

/** SoftOne: login + authenticate per user, then api.crm/me for role & person. */
async function authenticateSoftOne(username: string, password: string): Promise<LoginResult> {
  let clientID: string;
  let userid = "";
  let personName = "";
  try {
    const r = await s1.login(username.trim(), password);
    clientID = r.clientID;
    userid = String(r.info.objs?.[0]?.USERID ?? "");
    personName = r.info.objs?.[0]?.REFIDNAME ?? "";
  } catch (e) {
    if (e instanceof S1Error && /credentials|login fails/i.test(e.message)) return { ok: false, reason: "invalid" };
    return { ok: false, reason: "unavailable", detail: e instanceof Error ? e.message : String(e) };
  }
  try {
    const me = await s1.js<MeRow[] | MeRow>(clientID, "api.crm", "me", {});
    const raw = me.data;
    const row: MeRow = Array.isArray(raw) ? raw[0] ?? {} : ((raw ?? me) as MeRow);
    const role = roleFrom(row.crmrole ?? row.role);
    if (!role) return { ok: false, reason: "no_role", detail: JSON.stringify(me).slice(0, 300) };
    return {
      ok: true,
      session: {
        // PRSN id is the CRM user id (matches api.crm/users and TRDR ownership); USERS id only as fallback
        userId: String(row.prsn ?? row.userid ?? userid ?? username),
        username: row.username ?? username.trim(),
        fullName: row.name ?? personName ?? username.trim(),
        role,
        s1ClientId: clientID,
        s1Prsn: row.prsn !== undefined ? String(row.prsn) : undefined,
        // In this installation the PRSN record *is* the salesman identity (TRDR.SALESMAN ↔ PRSN)
        s1Salesman: row.salesman !== undefined ? String(row.salesman) : row.prsn !== undefined ? String(row.prsn) : undefined,
      },
    };
  } catch (e) {
    // "no prsn from that web account exists" and similar
    return { ok: false, reason: "no_role", detail: e instanceof Error ? e.message : String(e) };
  }
}

export function authenticate(username: string, password: string): Promise<LoginResult> {
  return providerMode() === "local" ? authenticateLocal(username, password) : authenticateSoftOne(username, password);
}

export async function listSalespeople() {
  return (await db().users.list()).filter((u) => u.role === "SALESPERSON");
}

export async function userName(id: string) {
  try {
    return (await db().users.findById(id))?.fullName ?? "—";
  } catch {
    return "—";
  }
}
