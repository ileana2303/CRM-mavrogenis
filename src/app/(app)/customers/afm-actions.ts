"use server";

import { requireUser } from "@/server/auth/current-user";
import { isValidAfm, normalizeAfm } from "@/lib/afm";
import { afmLookupConfigured, lookupAfm } from "@/server/gsis/client";

export type AfmLookupResult =
  | {
      ok: true;
      afm: string;
      legalName: string;
      commercialTitle: string | null;
      /** Split from onomasia only for a natural person («ΕΠΩΝΥΜΟ ΟΝΟΜΑ …»); otherwise empty. */
      firstName: string;
      lastName: string;
      taxOffice: string;
      profession: string;
      address: string;
      postalCode: string;
      city: string;
      active: boolean;
    }
  | { ok: false; error: string };

// Each lookup counts against the company's monthly ΑΑΔΕ limit: a cap per user, in memory (per server instance).
const LOOKUPS = 30;
const WINDOW_MS = 10 * 60_000;
const recentLookups = new Map<string, number[]>();

/** «ΑΦΜ» on the doctor form: the register's details for the number, used to fill the form. */
export async function lookupAfmAction(raw: string): Promise<AfmLookupResult> {
  const user = await requireUser();
  const afm = normalizeAfm(typeof raw === "string" ? raw : "");
  if (!afm || !isValidAfm(afm)) return { ok: false, error: "Ο ΑΦΜ δεν είναι έγκυρος." };
  if (!afmLookupConfigured()) return { ok: false, error: "Η αναζήτηση ΑΦΜ δεν έχει ρυθμιστεί (κωδικοί ΑΑΔΕ)." };

  const now = Date.now();
  const recent = (recentLookups.get(user.userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LOOKUPS) return { ok: false, error: "Πολλές αναζητήσεις ΑΦΜ. Δοκιμάστε ξανά σε λίγα λεπτά." };
  recentLookups.set(user.userId, [...recent, now]);

  try {
    const info = await lookupAfm(afm);
    if (!info) return { ok: false, error: "Ο ΑΦΜ δεν βρέθηκε στο μητρώο της ΑΑΔΕ." };
    const [lastName = "", firstName = ""] = info.person ? info.legalName.split(" ") : [];
    return {
      ok: true,
      afm: info.afm,
      legalName: info.legalName,
      commercialTitle: info.commercialTitle,
      firstName,
      lastName,
      taxOffice: info.taxOffice,
      profession: info.profession,
      address: info.address,
      postalCode: info.postalCode,
      city: info.city,
      active: info.active,
    };
  } catch (error) {
    console.error("[gsis] afm lookup failed", error);
    const said = error instanceof Error ? error.message.replace(/^gsis\s*[A-Z_]*:?\s*/, "") : "";
    return { ok: false, error: `Η ΑΑΔΕ δεν απάντησε${said ? `: ${said}` : "."} Συμπληρώστε τα στοιχεία με το χέρι.` };
  }
}
