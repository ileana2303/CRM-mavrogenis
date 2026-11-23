"use client";

import { useState } from "react";
import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import type { NextActionKind } from "@/server/domain/types";
import { Field } from "./ui";
import { OwnerSelect } from "./owner-select";

const nextHour = () => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  return h >= 23 ? "23:30" : `${String(h + 1).padStart(2, "0")}:00`;
};

/**
 * Optional «Επόμενη ενέργεια» inside a form (call log, visit report): Καμία / Τηλέφωνο / Email / Συνάντηση, then date,
 * time and comments. Posts nextKind ("" = none), nextDate, nextTime, nextComments – read by readNextAction() on the server.
 */
export function NextActionFields({ commentsLabel }: { commentsLabel: string }) {
  const [kind, setKind] = useState<NextActionKind | "">("");
  return (
    <>
      <input type="hidden" name="nextKind" value={kind} />
      <div>
        <span className="label">{el.callLog.next}</span>
        <div role="radiogroup" aria-label={el.callLog.next} className="grid grid-cols-4 gap-2">
          {(
            [
              ["", el.callLog.nextNone],
              ["CALL", el.pending.nextCall],
              ["EMAIL", el.pending.nextEmail],
              ["MEETING", el.pending.nextMeeting],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k || "none"}
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
      {kind && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label={el.pending.nextDate} required>
              <input name="nextDate" type="date" className="input" required defaultValue={athensDate()} />
            </Field>
            <Field label={el.pending.nextTime} required>
              <input name="nextTime" type="time" className="input" required defaultValue={nextHour()} />
            </Field>
          </div>
          <Field label={commentsLabel}>
            <textarea name="nextComments" className="input min-h-20" />
          </Field>
          <OwnerSelect name="nextOwnerId" />
        </>
      )}
    </>
  );
}
