import { el } from "@/lib/i18n/el";
import type { Equipment } from "@/server/domain/types";

export type EquipmentRow = Omit<Equipment, "id" | "doctorId">;

/** One line per machine – used for SoftOne COMMENTS and list previews. Pure, no data access. */
export function equipmentSummary(rows: EquipmentRow[]): string {
  return rows
    .map((r) => {
      const name = [r.manufacturer, r.model].filter(Boolean).join(" ");
      const year = r.purchaseYear ? ` (${r.purchaseYear})` : "";
      const svc = r.serviceContract ? ` · ${el.equipment.serviceContract}: ${el.app.yes.toUpperCase()}` : "";
      return `• ${el.enums.equipmentCategory[r.category]}${name ? " – " + name : ""}${year}${svc}`;
    })
    .join("\n");
}
