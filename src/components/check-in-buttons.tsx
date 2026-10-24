"use client";

import { useState, useTransition } from "react";
import { el } from "@/lib/i18n/el";
import { fmtTime } from "@/lib/format";
import { checkInAction } from "@/app/(app)/customers/actions";

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
 * Άφιξη / Αναχώρηση (slide 24). Timestamps + geolocation are stored in the background;
 * the salesperson only sees the times of the current visit. Managers see the log at /manager/check-ins.
 */
export function CheckInButtons({ doctorId, open }: { doctorId: string; open: { arrivedAt: string } | null }) {
  const [state, setState] = useState<{ arrivedAt?: string; departedAt?: string | null }>(open ? { arrivedAt: open.arrivedAt } : {});
  const [pending, start] = useTransition();

  const act = (kind: "arrive" | "depart") =>
    start(async () => {
      const geo = await getGeo();
      const rec = await checkInAction(doctorId, kind, geo);
      if (rec) setState({ arrivedAt: rec.arrivedAt, departedAt: rec.departedAt });
    });

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
        <button onClick={() => act("arrive")} disabled={pending} className="btn-accent">
          {el.customer.arrival}
        </button>
      ) : (
        <button onClick={() => act("depart")} disabled={pending} className="btn-danger">
          {el.customer.departure}
        </button>
      )}
    </div>
  );
}
