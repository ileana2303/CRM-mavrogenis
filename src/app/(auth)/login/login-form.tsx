"use client";

import { useActionState } from "react";
import { el } from "@/lib/i18n/el";
import { Field, Notice } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="card w-full max-w-sm p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-brand-800">{el.login.title}</h1>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={el.login.username}>
        <input name="username" className="input" autoComplete="username" autoCapitalize="none" required placeholder="e.leventouris" />
      </Field>
      <Field label={el.login.password}>
        <input name="password" type="password" className="input" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      {state.error && <Notice tone="red">{el.login.error}</Notice>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? el.app.loading : el.login.submit}
      </button>
      <p className="text-xs text-[var(--muted)] text-center">{el.login.hint}</p>
    </form>
  );
}
