import { el } from "@/lib/i18n/el";

/** Category label: SoftOne rows hold the name; legacy local rows hold an enum code. */
export function categoryLabel(c: string): string {
  return (el.enums.equipmentCategory as Record<string, string>)[c] ?? c;
}

