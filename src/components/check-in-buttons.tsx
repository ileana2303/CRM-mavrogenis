"use client";

import { useState, useTransition } from "react";
import { el } from "@/lib/i18n/el";
import { fmtTime } from "@/lib/format";
import { checkInAction, departWithReportAction } from "@/app/(app)/customers/actions";
import { ActionForm } from "./action-form";
import { DictationTextarea } from "./dictation-textarea";
import { Modal } from "./modal";
import { NextActionFields } from "./next-action-fields";
import { Field } from "./ui";

function getGeo(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
    const done = (g: { lat?: number; lng?: number }) => resolve(g);
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => done({}),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    );
  });
}

/**
 * Άφιξη / Αναχώρηση (slide 24). Άφιξη is one tap. Αναχώρηση opens the visit report: what happened (dictation) and an
 * optional next action – saved on the same SOMEETING 2001 (FINALDATE + COMMENTS) with the follow-up linked to it.
 * Location is taken in the background (on arrival; on departure while the form is open).
 */
export function CheckInButtons({ doctorId, open }: { doctorId: string; open: { arrivedAt: string } | null }) {
  const [state, setState] = useState<{ arrivedAt?: string; departedAt?: string | null }>(open ? { arrivedAt: open.arrivedAt } : {});
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({});

  const arrive = () =>
    start(async () => {
      const rec = await checkInAction(doctorId, "arrive", await getGeo());
      if (rec) setState({ arrivedAt: rec.arrivedAt, departedAt: rec.departedAt });
    });
  const openReport = () => {
    setReporting(true);
    getGeo().then(setGeo);
  };

  const arrived = !!state.arrivedAt && !state.departedAt;

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="flex-1 text-sm">
        <div className="text-[var(--muted)]">{el.customer.arrivalTitle}</div>
        <div className="font-semibold tabular-nums">
          {el.customer.arrivalTime}: {state.arrivedAt ? fmtTime(state.arrivedAt) : "—"}
          {state.departedAt && (
            <>
              {" · "}
              {el.customer.departureTime}: {fmtTime(state.departedAt)}
            </>
          )}
        </div>
      </div>
      {!arrived ? (
        <button onClick={arrive} disabled={pending} className="btn-accent">
          {el.customer.arrival}
        </button>
      ) : (
        <button onClick={openReport} className="btn-danger">
          {el.customer.departure}
        </button>
      )}

      <Modal open={reporting} onClose={() => setReporting(false)} title={el.visitReport.title} footer={el.visitReport.note} width="36rem">
        <ActionForm action={departWithReportAction} className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 text-left">
          <input type="hidden" name="doctorId" value={doctorId} />
          {geo.lat !== undefined && <input type="hidden" name="lat" value={geo.lat} />}
          {geo.lng !== undefined && <input type="hidden" name="lng" value={geo.lng} />}
          {state.arrivedAt && (
            <p className="text-sm text-[var(--muted)]">
              {el.customer.arrivalTime}: <span className="font-semibold tabular-nums text-slate-800">{fmtTime(state.arrivedAt)}</span>
            </p>
          )}
          <Field label={el.visitReport.notes}>
            <DictationTextarea name="notes" rows={4} placeholder={el.visitReport.notesPlaceholder} />
          </Field>
          <NextActionFields commentsLabel={el.visitReport.nextComments} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReporting(false)} className="btn-ghost">
              Άκυρο
            </button>
            <button className="btn-danger">{el.visitReport.save}</button>
          </div>
        </ActionForm>
      </Modal>
    </div>
  );
}
