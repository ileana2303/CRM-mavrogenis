import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";
import type { Role } from "../domain/types";

/** Use in server components / actions. Redirects to /login when not authenticated. */
export async function requireUser(roles?: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role)) redirect("/dashboard");
  return s;
}

export const isManager = (s: Session) => s.role === "MANAGER";
export const isSupport = (s: Session) => s.role === "SUPPORT";
