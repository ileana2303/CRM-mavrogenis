"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/server/services/auth-service";
import { clearSessionCookie, homeFor, setSessionCookie } from "@/server/auth/session";

export interface LoginState {
  error?: "invalid" | "no_role" | "unavailable";
  detail?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const result = await authenticate(username, password);
  if (!result.ok) return { error: result.reason, detail: process.env.NODE_ENV === "development" ? result.detail : undefined };
  await setSessionCookie(result.session);
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(result.session.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
