"use client";

import { useSearchParams } from "next/navigation";

/** Keep timeline-search URL flags when the dashboard Φίλτρα form submits (GET). */
export function TimelineFilterHiddenParams() {
  const sp = useSearchParams();
  const fields = [
    ["ts1", sp.get("ts1")],
    ["ts2", sp.get("ts2")],
    ["tsList", sp.get("tsList")],
    ["tsDetail", sp.get("tsDetail")],
  ] as const;
  return fields.map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null));
}