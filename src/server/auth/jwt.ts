/** Edge-safe part of the session (no next/headers import) – used by middleware. */
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "../domain/types";

export const SESSION_COOKIE = "de_session";
export const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  /** SoftOne clientID once the SoftOne provider is active */
  s1ClientId?: string;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short (.env.local)");
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.userId ?? payload.sub),
      username: String(payload.username),
      fullName: String(payload.fullName),
      role: payload.role as Role,
      s1ClientId: payload.s1ClientId ? String(payload.s1ClientId) : undefined,
    };
  } catch {
    return null;
  }
}
