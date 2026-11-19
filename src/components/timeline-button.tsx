"use client";

import { useState, useTransition, type ReactNode } from "react";
import { el } from "@/lib/i18n/el";
import type { TimelineEntry } from "@/server/domain/types";
import { Modal } from "./modal";
import { Empty } from "./ui";
import { Timeline } from "./timeline";

export type TimelineResult = { entries: TimelineEntry[] } | { error: string };

/**
 * A trigger that opens a timeline in a modal, loaded on open (the page doesn't pay for it):
 *   – the task title on a pending row → api.crm.actions/getTimeline (the SOACTIONS chain), `currentId` = the task
 *   – «Χρονολόγιο» on the project screen → api.crm.projects/getTimeline
 */
export function TimelineButton({
  id,
  load,
  title,
  currentId,
  className,
  label,
  children,
}: {
  id: string;
  load: (id: string) => Promise<TimelineResult>;
  title: string;
  currentId?: string;
  className: string;
  /** accessible name / tooltip when the trigger content isn't self-explanatory */
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<TimelineResult | null>(null);
  const [pending, start] = useTransition();

  const show = () => {
    setOpen(true);
    setResult(null);
    start(async () => setResult(await load(id)));
  };

  return (
    <>
      <button type="button" onClick={show} title={label} className={className}>
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} width="40rem">
        <div className="overflow-y-auto px-5 pb-6 pt-2 text-left">
          {pending || !result ? (
            <TimelineSkeleton />
          ) : "error" in result ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">{el.timeline.error}</p>
              <p className="mt-0.5 break-words">{result.error}</p>
            </div>
          ) : result.entries.length === 0 ? (
            <Empty>{el.timeline.empty}</Empty>
          ) : (
            <Timeline entries={result.entries} currentId={currentId} />
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
