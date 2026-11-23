"use client";

import { useActionState, useState } from "react";
import { el } from "@/lib/i18n/el";
import { Icon } from "@/components/icons";
import { Field, Notice } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const message = state.error === "invalid" ? el.login.error : state.error === "no_role" ? el.login.noRole : state.error === "unavailable" ? el.login.unavailable : null;
  return (
    <form action={action} className="card w-full max-w-sm p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-brand-800">{el.login.title}</h1>
      {next && <input type="hidden" name="next" value={next} />}
      {expired && <Notice tone="amber">{el.login.expired}</Notice>}
      <Field label={el.login.username}>
        <input name="username" className="input" autoComplete="username" autoCapitalize="none" required placeholder="SoftOne username" />
      </Field>
      <Field label={el.login.password}>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            className="input pr-11"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-[var(--muted)] hover:bg-brand-50 hover:text-brand-700"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? el.login.hidePassword : el.login.showPassword}
            aria-pressed={showPassword}
          >
            {showPassword ? <Icon.eyeOff size={20} /> : <Icon.eye size={20} />}
          </button>
        </div>
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
      <p className="text-xs text-[var(--muted)] text-center">{el.login.hintSoftOne}</p>
    </form>
  );
}
