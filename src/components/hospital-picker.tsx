"use client";

import { useState } from "react";
import { Select } from "./select";
import { Icon } from "./icons";
import { el } from "@/lib/i18n/el";
import type { Hospital } from "@/server/domain/types";

/**
 * Hospitals of a doctor (CCCTRDTRDR): the linked ones as removable chips, plus a searchable dropdown to add another.
 * Posts the same fields the checkbox list did (`hospitalId` + `hospitalName_<id>`), so the save action is unchanged.
 */
export function HospitalPicker({ options, defaultValue }: { options: Hospital[]; defaultValue: Hospital[] }) {
  const [picked, setPicked] = useState<Hospital[]>(defaultValue);
  const taken = new Set(picked.map((h) => h.id));
  const add = (id: string) => {
    const h = options.find((o) => o.id === id);
    if (h && !taken.has(id)) setPicked((p) => [...p, h]);
  };

  return (
    <div className="flex flex-col gap-2">
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {picked.map((h) => (
            <span key={h.id} className="chip !pr-1">
              <input type="hidden" name="hospitalId" value={h.id} />
              <input type="hidden" name={`hospitalName_${h.id}`} value={h.name} />
              <span>{h.name}</span>
              <button
                type="button"
                aria-label={`${el.customer.removeHospital}: ${h.name}`}
                onClick={() => setPicked((p) => p.filter((x) => x.id !== h.id))}
                className="ml-1 grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] hover:bg-black/5"
              >
                <Icon.x size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      {options.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{el.customer.noHospitals}</p>
      ) : (
        <Select
          value=""
          onChange={add}
          searchable
          placeholder={el.customer.addHospital}
          ariaLabel={el.customer.addHospital}
          options={options.filter((o) => !taken.has(o.id)).map((o) => ({ value: o.id, label: o.name, hint: o.code }))}
        />
      )}
    </div>
  );
}
