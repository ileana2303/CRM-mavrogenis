"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import { getOffer, priceOffer } from "@/server/services/offer-service";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export async function priceOfferAction(fd: FormData) {
  const user = await requireUser(["SUPPORT", "MANAGER"]);
  const offer = await getOffer(str(fd, "offerId"));
  if (!offer) redirect("/support/requests");
  const lines = offer.lines.map((l) => ({
    lineNo: l.lineNo,
    discountPct: num(str(fd, `discount_${l.lineNo}`)),
    specialDiscountPct: num(str(fd, `special_${l.lineNo}`)),
  }));
  await priceOffer(offer, lines, str(fd, "supportNotes"), user);
  revalidatePath("/support/requests");
  redirect("/support/requests?answered=1");
}
