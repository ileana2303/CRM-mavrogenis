"use client";

import Link from "next/link";
import { useState } from "react";
import { el } from "@/lib/i18n/el";
import { Icon } from "./icons";
import { Modal } from "./modal";

export interface OfferProjectOption {
  id: string;
  title: string;
  code: string;
  state?: string;
}

/**
 * «+ Νέα προσφορά» on the customer's offers list: first where it belongs – one of the customer's projects (SALDOC 7015
 * with PRJC, that project's offer form), no project at all (no PRJC), or a new project first.
 */
export function NewOfferButton({ doctorId, projects }: { doctorId: string; projects: OfferProjectOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
        <Icon.plus size={18} />
        {el.projects.newOffer}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={el.offers.pickProject} footer={el.offers.pickProjectNote}>
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--line)] py-1">
          <Link href={`/customers/${doctorId}/offers/new`} className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-brand-50">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
              <Icon.file size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900">{el.offers.noProject}</span>
              <span className="block text-xs text-[var(--muted)]">{el.offers.noProjectHint}</span>
            </span>
            <Icon.chevronsRight size={18} className="shrink-0 text-[var(--muted)]" />
          </Link>
          {projects.length > 0 && <div className="mx-5 my-1 border-t border-[var(--line)]" />}
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/customers/${doctorId}/projects/${p.id}/offers/new`}
              className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-brand-50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon.briefcase size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{p.title}</span>
                <span className="block text-xs text-[var(--muted)]">{[p.code, p.state].filter(Boolean).join(" · ")}</span>
              </span>
              <Icon.chevronsRight size={18} className="shrink-0 text-[var(--muted)]" />
            </Link>
          ))}
        </div>
        <div className="border-t border-[var(--line)] px-3 py-2">
          <Link
            href={`/customers/${doctorId}/projects/new`}
            className="flex min-h-12 items-center gap-3 rounded-xl px-2 font-semibold text-brand-700 hover:bg-brand-50"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon.plus size={16} />
            </span>
            {el.offers.newProjectFirst}
          </Link>
        </div>
      </Modal>
    </>
  );
}
