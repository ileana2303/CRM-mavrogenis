"use client";

import { useActionState } from "react";
import { el } from "@/lib/i18n/el";
import { Field, Notice } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next, expired, mode }: { next?: string; expired?: boolean; mode: "local" | "hybrid" | "softone" }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const message = state.error === "invalid" ? el.login.error : state.error === "no_role" ? el.login.noRole : state.error === "unavailable" ? el.login.unavailable : null;
  return (
    <form action={action} className="card w-full max-w-sm p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-brand-800">{el.login.title}</h1>
      {next && <input type="hidden" name="next" value={next} />}
      {expired && <Notice tone="amber">{el.login.expired}</Notice>}
      <Field label={el.login.username}>
        <input name="username" className="input" autoComplete="username" autoCapitalize="none" required placeholder={mode === "local" ? "e.leventouris" : "SoftOne username"} />
      </Field>
      <Field label={el.login.password}>
        <input name="password" type="password" className="input" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      {message && (
        <Notice tone="red">
          {message}
          {state.detail && <span className="block text-xs opacity-80 mt-1 break-all">{state.detail}</span>}
        </Notice>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? el.app.loading : el.login.submit}
      </button>
      <p className="text-xs text-[var(--muted)] text-center">{mode === "local" ? el.login.hint : el.login.hintSoftOne}</p>
    </form>
  );
}
