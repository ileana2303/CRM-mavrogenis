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
  /** SoftOne clientID (per-user login) when the data provider is softone/hybrid */
  s1ClientId?: string;
  /** SoftOne PRSN / SALESMAN ids when known */
  s1Prsn?: string;
  s1Salesman?: string;
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
    const str = (k: string) => (payload[k] !== undefined && payload[k] !== null ? String(payload[k]) : undefined);
    return {
      userId: str("userId") ?? String(payload.sub),
      username: str("username") ?? "",
      fullName: str("fullName") ?? "",
      role: payload.role as Role,
      s1ClientId: str("s1ClientId"),
      s1Prsn: str("s1Prsn"),
      s1Salesman: str("s1Salesman"),
    };
  } catch {
    return null;
  }
}
