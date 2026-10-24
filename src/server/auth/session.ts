import { cookies } from "next/headers";
import type { Role } from "../domain/types";
import { MAX_AGE_SEC, SESSION_COOKIE, signSession, verifySession, type Session } from "./jwt";

export { SESSION_COOKIE, signSession, verifySession };
export type { Session };

export async function setSessionCookie(s: Session) {
  const token = await signSession(s);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export function homeFor(role: Role) {
  return role === "SUPPORT" ? "/support/requests" : "/dashboard";
}
