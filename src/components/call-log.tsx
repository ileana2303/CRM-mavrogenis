"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { el } from "@/lib/i18n/el";
import { athensDate } from "@/lib/athens";
import { ActionForm, type ActionResult } from "./action-form";
import { DictationTextarea } from "./dictation-textarea";
import { Icon } from "./icons";
import { Modal } from "./modal";
import { Field } from "./ui";
import { NextActionFields } from "./next-action-fields";
import { TrnDateField } from "./trn-date-field";

/** a tap on the number is remembered for this long – long enough for a real call, short enough not to nag tomorrow */
const WINDOW_MS = 3 * 60 * 60 * 1000;
const key = (doctorId: string) => `crm:call:${doctorId}`;

/** "yyyy-mm-dd hh:mm" in Athens for an instant */
function athensStamp(t: number): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
  return `${athensDate(t)} ${p.replace(/^24/, "00")}`;
}

function readTap(doctorId: string): number | null {
  try {
    const v = Number(sessionStorage.getItem(key(doctorId)));
    return v && Date.now() - v < WINDOW_MS ? v : null;
  } catch {
    return null;
  }
}
function clearTap(doctorId: string) {
  try {
    sessionStorage.removeItem(key(doctorId));
  } catch {
    /* storage blocked – nothing to clear */
  }
}

/**
 * The customer's phone number on the hub. Tapping it dials (tel:) and remembers the tap; when the salesperson is back
 * in the app, a banner offers «Καταγραφή κλήσης»: what was said (dictation) and optionally the next action, saved as a
 * done SOCALL plus a linked follow-up. Without the tap the same form is one tap away (the small button).
 */
export function PhoneWithCallLog({ doctorId, phone, action }: { doctorId: string; phone: string; action: (fd: FormData) => Promise<ActionResult> }) {
  const [tapAt, setTapAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [callAt, setCallAt] = useState<number>(0);

  // banner after coming back from the phone app (or a reload within the window)
  useEffect(() => {
    const sync = () => setTapAt(readTap(doctorId));
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [doctorId]);

  const remember = () => {
    try {
      sessionStorage.setItem(key(doctorId), String(Date.now()));
    } catch {
      /* storage blocked: the banner won't appear, the button still works */
    }
  };
  const openForm = (at: number) => {
    setCallAt(at);
    setOpen(true);
  };
  const dismiss = () => {
    clearTap(doctorId);
    setTapAt(null);
  };
  const time = (t: number) => athensStamp(t).slice(11);

  return (
    <>
      <span className="inline-flex items-center gap-1 align-middle">
        <a href={`tel:${phone}`} onClick={remember} className="font-medium text-brand-700 underline-offset-2 hover:underline">
          {phone}
        </a>
        <button
          type="button"
          onClick={() => openForm(Date.now())}
          title={el.callLog.open}
          aria-label={el.callLog.open}
          className="-my-1 inline-flex size-7 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <Icon.pen size={16} />
        </button>
      </span>

      {/* portal: the customer card's backdrop-filter would pin a fixed element to the card instead of the screen */}
      {tapAt &&
        !open &&
        createPortal(
        <div role="status" className="fixed inset-x-0 bottom-4 z-[900] mx-auto flex w-[min(640px,calc(100vw-32px))] items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-[0_18px_40px_-16px_rgba(10,80,60,0.45)] backdrop-blur-xl">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon.phone size={19} />
          </span>
          <p className="min-w-0 flex-1 text-sm text-slate-800">{el.callLog.prompt(time(tapAt))}</p>
          <button type="button" onClick={dismiss} className="btn-ghost min-h-10 text-sm">
            {el.callLog.dismiss}
          </button>
          <button type="button" onClick={() => openForm(tapAt)} className="btn-primary min-h-10 text-sm">
            {el.callLog.open}
          </button>
        </div>,
          document.body,
        )}

      <Modal open={open} onClose={() => setOpen(false)} title={el.callLog.title} footer={el.callLog.note} width="36rem">
        <ActionForm action={action} className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 text-left">
          <input type="hidden" name="doctorId" value={doctorId} />
          <CallTime defaultAt={callAt} />
          <TrnDateField />

          <Field label={el.callLog.comments} required>
            <DictationTextarea name="comments" rows={4} placeholder={el.callLog.commentsPlaceholder} />
          </Field>

          <NextActionFields commentsLabel={el.callLog.nextComments} />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Άκυρο
            </button>
            <button className="btn-primary" onClick={() => clearTap(doctorId)}>
              {el.callLog.save}
            </button>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

/** date + time of the call (editable: the salesperson may log it later) → hidden "at" = "yyyy-mm-dd hh:mm" */
function CallTime({ defaultAt }: { defaultAt: number }) {
  const stamp = athensStamp(defaultAt || Date.now());
  const [date, setDate] = useState(stamp.slice(0, 10));
  const [time, setTime] = useState(stamp.slice(11));
  return (
    <div className="grid grid-cols-2 gap-3">
      <input type="hidden" name="at" value={`${date} ${time}`} />
      <Field label={el.pending.nextDate} required>
        <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label={el.callLog.when} required>
        <input type="time" className="input" required value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
    </div>
  );
}
