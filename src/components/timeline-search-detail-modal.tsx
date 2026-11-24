"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { el } from "@/lib/i18n/el";
import { fmtDateTime, fmtEur, fmtNum } from "@/lib/format";
import type { TimelineSearchHit } from "@/server/domain/types";
import { withBackQuery } from "@/lib/timeline-search-return";
import { Modal } from "./modal";
import { Empty } from "./ui";

type DetailResult = { row: TimelineSearchHit } | { error: string };

export function TimelineSearchDetailModal({
  hit,
  open,
  onClose,
  getDashboardBackHref,
}: {
  hit: TimelineSearchHit | null;
  open: boolean;
  onClose: () => void;
  getDashboardBackHref: () => string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<TimelineSearchHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !hit) {
      setDetail(null);
      setError(null);
      return;
    }
    if (hit.unit === "crm") {
      setDetail(hit);
      setError(null);
      return;
    }
    const findoc = hit.findoc ?? hit.id;
    let cancelled = false;
    setBusy(true);
    setDetail(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/timeline/search?unit=emporiko&findoc=${encodeURIComponent(findoc)}`, { cache: "no-store" });
        const json = (await res.json()) as DetailResult & { error?: string };
        if (cancelled) return;
        if (!res.ok || !("row" in json)) {
          setError(("error" in json ? json.error : undefined) ?? `HTTP ${res.status}`);
        } else {
          setDetail(json.row);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hit]);

  const row = detail ?? (hit?.unit === "crm" ? hit : null);
  const title = row ? [row.category ?? row.typeName, row.code].filter(Boolean).join(" · ") || el.timelineSearch.title : el.timelineSearch.title;

  const leave = (path: string) => {
    const back = getDashboardBackHref();
    router.push(withBackQuery(path, back));
  };

  const footer = row ? (
    <div className="flex flex-wrap gap-2 justify-end">
      <button type="button" className="btn-secondary text-sm" onClick={() => leave(`/customers/${row.trdr}`)}>
        {el.timelineSearch.openCustomer}
      </button>
      {row.prjc && (
        <button type="button" className="btn-secondary text-sm" onClick={() => leave(`/customers/${row.trdr}/projects/${row.prjc}`)}>
          {el.timelineSearch.openProject}
        </button>
      )}
      {row.unit === "emporiko" && (
        <button type="button" className="btn-primary text-sm" onClick={() => leave(`/customers/${row.trdr}/offers`)}>
          {el.timelineSearch.openOffers}
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <Modal open={open} onClose={onClose} title={title} width="42rem" footer={footer}>
      <div className="px-5 pb-6 pt-2 text-left max-h-[70vh] overflow-y-auto">
        {busy && (
          <p className="text-sm text-[var(--muted)] py-8 text-center" aria-busy>
            {el.app.loading}
          </p>
        )}
        {!busy && error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">{el.timelineSearch.detailError}</p>
            <p className="mt-0.5 break-words">{error}</p>
          </div>
        )}
        {!busy && !error && row && (
          <div className="flex flex-col gap-4 text-sm">
            <header className="flex flex-col gap-1 border-b border-[var(--line)] pb-3">
              <p className="font-semibold text-brand-900">
                {row.trdrName}
                {row.trdrCode && <span className="ml-2 text-xs font-medium text-[var(--muted)]">{row.trdrCode}</span>}
              </p>
              {row.prjcName && (
                <p className="text-[var(--muted)]">
                  {el.timelineSearch.project}: {row.prjcName}
                  {row.prjcCode && ` (${row.prjcCode})`}
                </p>
              )}
              <p className="text-[var(--muted)] tabular-nums">{fmtDateTime(row.at)}</p>
              {row.salesmanName && (
                <p className="text-[var(--muted)]">
                  {el.timelineSearch.salesman}: {row.salesmanName}
                </p>
              )}
              {row.docTotal !== undefined && (
                <p className="text-base font-semibold tabular-nums text-brand-800">
                  {el.timelineSearch.total}: {fmtEur(row.docTotal, true)}
                </p>
              )}
            </header>

            {row.unit === "crm" && (
              <div className="flex flex-col gap-2">
                {row.actStatusName && (
                  <p>
                    <span className="text-[var(--muted)]">{el.timelineSearch.status}: </span>
                    {row.actStatusName}
                  </p>
                )}
                {row.actStage && (
                  <p>
                    <span className="text-[var(--muted)]">{el.timelineSearch.stage}: </span>
                    {row.actStage}
                  </p>
                )}
                {row.fromDate && (
                  <p>
                    <span className="text-[var(--muted)]">{el.timelineSearch.from}: </span>
                    {fmtDateTime(row.fromDate)}
                  </p>
                )}
                {row.finalDate && (
                  <p>
                    <span className="text-[var(--muted)]">{el.timelineSearch.until}: </span>
                    {fmtDateTime(row.finalDate)}
                  </p>
                )}
                {row.comments && <p className="whitespace-pre-line break-words">{row.comments}</p>}
                {row.remarks && <p className="whitespace-pre-line break-words text-[var(--muted)]">{row.remarks}</p>}
              </div>
            )}

            {row.unit === "emporiko" && (
              <>
                {row.remarks && <p className="whitespace-pre-line break-words text-[var(--muted)]">{row.remarks}</p>}
                {row.comments && <p className="whitespace-pre-line break-words">{row.comments}</p>}
                {(row.items?.length ?? 0) > 0 ? (
                  <>
                    <p className="mb-2 font-semibold uppercase text-xs tracking-wide text-[var(--muted)]">{el.timelineSearch.items}</p>
                    <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                      <table className="table text-sm">
                        <thead>
                          <tr>
                            <th>{el.timelineSearch.itemCode}</th>
                            <th>{el.timelineSearch.itemName}</th>
                            <th className="text-right">{el.timelineSearch.qty}</th>
                            <th className="text-right">{el.timelineSearch.price}</th>
                            <th className="text-right">{el.timelineSearch.lineval}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.items!.map((it) => (
                            <tr key={it.linenum}>
                              <td className="font-mono text-xs">{it.itemCode}</td>
                              <td className="min-w-[12rem]">{it.itemName}</td>
                              <td className="text-right tabular-nums">{fmtNum(it.qty)}</td>
                              <td className="text-right tabular-nums">{fmtEur(it.price, true)}</td>
                              <td className="text-right tabular-nums">{fmtEur(it.lineval, true)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <Empty>{el.timeline.empty}</Empty>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}