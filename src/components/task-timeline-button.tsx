"use client";

import { useState, useTransition } from "react";
import { el } from "@/lib/i18n/el";
import { fmtDateTime } from "@/lib/format";
import type { TimelineEntry } from "@/server/domain/types";
import { Modal } from "./modal";
import { Badge, Empty } from "./ui";

type Result = { entries: TimelineEntry[] } | { error: string };

const statusTone = (s: number) => (s === 3 ? "green" : s === 4 ? "red" : s === 1 || s === 2 ? "blue" : "gray");

/**
 * «Ιστορικό» on a pending row: opens a modal with the chain of actions linked to this Εκκρεμότητα
 * (api.crm.actions/getTimeline), loaded on open – the list page doesn't pay for it.
 */
export function TaskTimelineButton({ taskId, load }: { taskId: string; load: (taskId: string) => Promise<Result> }) {
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
      <button type="button" onClick={show} className="btn-ghost min-h-9 text-sm whitespace-nowrap">
        {el.pending.history}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.pending.historyTitle} width="36rem">
        <div className="overflow-y-auto px-5 pb-5 pt-1 text-left">
          {pending || !result ? (
            <Empty>{el.pending.historyLoading}</Empty>
          ) : "error" in result ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">{el.pending.historyError}</p>
              <p className="mt-0.5 break-words">{result.error}</p>
            </div>
          ) : result.entries.length === 0 ? (
            <Empty>{el.pending.historyEmpty}</Empty>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l-2 border-[var(--line)] pl-5">
              {result.entries.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-[27px] top-1.5 size-3 rounded-full ring-4 ring-white ${e.id === taskId ? "bg-brand-600" : "bg-slate-300"}`}
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-brand-800">{el.pending.objectTypes[e.objectType] ?? e.objectType}</span>
                    {e.code && <span className="text-xs tabular-nums text-[var(--muted)]">{e.code}</span>}
                    {e.id === taskId && <span className="text-xs text-brand-700">({el.pending.historyThis})</span>}
                    {Number.isInteger(e.status) && el.pending.actStatus[e.status] && (
                      <Badge tone={statusTone(e.status)}>{el.pending.actStatus[e.status]}</Badge>
                    )}
                  </div>
                  <div className="text-xs tabular-nums text-[var(--muted)]">{fmtDateTime(e.at)}</div>
                  {e.comments && <p className="mt-1 text-sm whitespace-pre-line break-words">{e.comments}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </Modal>
    </>
  );
}
