"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/server/services/auth-service";
import { clearSessionCookie, homeFor, setSessionCookie } from "@/server/auth/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const session = await authenticate(username, password);
  if (!session) return { error: "invalid" };
  await setSessionCookie(session);
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(session.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
