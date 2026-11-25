"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import type { ActionKind, NextActionKind } from "@/server/domain/types";
import { ActionForm, type ActionResult } from "./action-form";
import { Modal } from "./modal";
import { Field } from "./ui";
import { OwnerSelect } from "./owner-select";
import { TrnDateField } from "./trn-date-field";

/** «Προσφορά» isn't a scheduled SOACTION: it opens the offer form, and the source closes once the offer is saved */
type Choice = NextActionKind | "OFFER";
const KINDS: Array<[Choice, string]> = [
  ["CALL", el.pending.nextCall],
  ["EMAIL", el.pending.nextEmail],
  ["MEETING", el.pending.nextMeeting],
  ["OFFER", el.pending.nextOffer],
];

export interface NextOfferProject {
  id: string;
  title: string;
  code: string;
}

/** Next full hour in Athens as "hh:00" (23:xx → "23:30"). */
function nextHour(): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  return h >= 23 ? "23:30" : `${String(h + 1).padStart(2, "0")}:00`;
}

/**
 * «→ Επόμενη ενέργεια» next to «✓ Ολοκλήρωση» on an open item: Τηλέφωνο / Email / Συνάντηση + when creates that SOACTION
 * and closes the item in one step. Προσφορά instead opens the offer form (in the chosen project, or none) carrying the
 * item, which is closed when the offer is saved – an abandoned form leaves it open.
 */
export function NextActionButton({
  action,
  taskId,
  doctorId,
  filter,
  title,
  projectId,
  itemKind = "TASK",
  back,
  projects,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  taskId: string;
  doctorId: string;
  filter?: string;
  title: string;
  /** PRJC of the source item – the new action carries it */
  projectId?: string;
  /** object of the source item, closed after the new action is saved */
  itemKind?: ActionKind;
  /** page to return to (default: the customer's pending list) */
  back?: string;
  /** the customer's projects, offered for a «Προσφορά» next action; absent → the item's own project (or none) */
  projects?: NextOfferProject[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Choice>("CALL");
  const [offerProject, setOfferProject] = useState(projectId ?? "");
  // «Χωρίς project», then the item's own project first, then the customer's other projects
  const own = projectId ? (projects?.find((p) => p.id === projectId) ?? { id: projectId, title: `#${projectId}`, code: "" }) : null;
  const projectChoices: NextOfferProject[] = [
    ...(own ? [own] : []),
    { id: "", title: el.offers.noProject, code: "" },
    ...(projects ?? []).filter((p) => p.id !== projectId),
  ];
  const goToOffer = () => {
    const q = new URLSearchParams({ fromTask: taskId, fromKind: itemKind });
    router.push(offerProject ? `/customers/${doctorId}/projects/${offerProject}/offers/new?${q}` : `/customers/${doctorId}/offers/new?${q}`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-9 text-sm whitespace-nowrap">
        → {el.pending.next}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.pending.nextTitle} footer={el.pending.nextNote}>
        <ActionForm action={action} className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 text-left">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="doctorId" value={doctorId} />
          {filter && <input type="hidden" name="filter" value={filter} />}
          {back && <input type="hidden" name="back" value={back} />}
          <input type="hidden" name="itemKind" value={itemKind} />
          <input type="hidden" name="kind" value={kind} />
          {projectId && <input type="hidden" name="projectId" value={projectId} />}
          <p className="text-sm text-[var(--muted)] line-clamp-2">{title}</p>

          <div>
            <span className="label">{el.pending.nextKind}</span>
            <div role="radiogroup" aria-label={el.pending.nextKind} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KINDS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`chip min-h-11 justify-center ${kind === k ? "bg-brand-600 text-white border-brand-600" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {kind === "OFFER" ? (
            <>
              <div>
                <span className="label">{el.pending.nextOfferProject}</span>
                <div role="radiogroup" aria-label={el.pending.nextOfferProject} className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
                  {projectChoices.map((p) => (
                    <button
                      key={p.id || "none"}
                      type="button"
                      role="radio"
                      aria-checked={offerProject === p.id}
                      onClick={() => setOfferProject(p.id)}
                      className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-3 text-left ${offerProject === p.id ? "border-brand-500 bg-brand-50 text-brand-800" : "border-[var(--line)] bg-white"}`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                      {p.code && <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">{p.code}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">{el.pending.nextOfferNote}</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                  Άκυρο
                </button>
                <button type="button" onClick={goToOffer} className="btn-primary">
                  {el.pending.nextOfferGo}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={el.pending.nextDate} required>
                  <input name="date" type="date" className="input" required defaultValue={athensDate()} />
                </Field>
                <Field label={el.pending.nextTime} required>
                  <input name="time" type="time" className="input" required defaultValue={nextHour()} />
                </Field>
              </div>

              <Field label={el.pending.nextComments}>
                <textarea name="comments" className="input min-h-24" defaultValue={title} />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TrnDateField />
                <OwnerSelect />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                  Άκυρο
                </button>
                <button className="btn-primary">{el.pending.nextSave}</button>
              </div>
            </>
          )}
        </ActionForm>
      </Modal>
    </>
  );
}
