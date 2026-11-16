"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "./icons";

export type ActionResult = { error?: string } | void;

/**
 * A form whose server action may answer `{ error }` (e.g. a SoftOne refusal) instead of throwing. The error shows as an
 * alert on top of the page and the form stays exactly as typed – no error page, no reset (a plain `<form action>` would
 * reset its fields after the action, so this submits through onSubmit). Success = the action redirects.
 * A submit button may carry `formAction`-like intent via `name="intent" value="…"`; it is added to the FormData.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <form
        className={className}
        aria-busy={pending || undefined}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          setError(null);
          start(async () => {
            const res = await action(fd);
            if (res && res.error) setError(res.error);
          });
        }}
      >
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </form>
      {error && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-[1100] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-900 shadow-[0_18px_40px_-16px_rgba(120,20,20,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Το SoftOne δεν αποθήκευσε</p>
              <p className="mt-0.5 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Κλείσιμο"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-red-100"
            >
              <Icon.x size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
