"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "./icons";
import { el } from "@/lib/i18n/el";
import type { TimelineEntry } from "@/server/domain/types";
import { Modal } from "./modal";
import { Empty } from "./ui";
import { Timeline } from "./timeline";

type Result = { entries: TimelineEntry[] } | { error: string };

/**
 * The task's title on a pending row is the trigger: tapping it opens a modal with the chain of actions linked to this
 * Εκκρεμότητα (api.crm.actions/getTimeline), loaded on open – the list page doesn't pay for it. (A separate «Ιστορικό»
 * button pushed the row's actions off screen in iPad portrait.)
 */
export function TaskTimelineButton({ taskId, load, children }: { taskId: string; load: (taskId: string) => Promise<Result>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const show = () => {
    setOpen(true);
    setResult(null);
    start(async () => setResult(await load(taskId)));
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        title={el.pending.history}
        className="group inline-flex min-h-9 items-start gap-1.5 rounded-lg text-left font-medium text-slate-900 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <span className="group-hover:underline decoration-brand-300 underline-offset-4">{children}</span>
        <span className="mt-0.5 shrink-0 text-brand-500 opacity-70 group-hover:opacity-100">
          <Icon.history size={16} />
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.pending.historyTitle} width="40rem">
        <div className="overflow-y-auto px-5 pb-6 pt-2 text-left">
          {pending || !result ? (
            <TimelineSkeleton />
          ) : "error" in result ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">{el.pending.historyError}</p>
              <p className="mt-0.5 break-words">{result.error}</p>
            </div>
          ) : result.entries.length === 0 ? (
            <Empty>{el.pending.historyEmpty}</Empty>
          ) : (
            <Timeline entries={result.entries} currentId={taskId} />
          )}
        </div>
      </Modal>
    </>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-busy>
      <div className="ml-[52px] h-3 w-32 rounded bg-slate-200" />
      {[0, 1].map((i) => (
        <div key={i} className="grid grid-cols-[40px_1fr] gap-3">
          <div className="size-10 rounded-full bg-slate-200" />
          <div className="h-20 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
