import bcrypt from "bcryptjs";
import { db } from "../data";
import type { Session } from "../auth/jwt";

export async function authenticate(username: string, password: string): Promise<Session | null> {
  const user = await db().users.findByUsername(username.trim());
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { userId: user.id, username: user.username, fullName: user.fullName, role: user.role };
}

export async function listSalespeople() {
  return (await db().users.list()).filter((u) => u.role === "SALESPERSON");
}

export async function userName(id: string) {
  return (await db().users.findById(id))?.fullName ?? "—";
}
