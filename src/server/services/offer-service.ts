import { db } from "../data";
import type { Session } from "../auth/jwt";
import type { Offer, OfferClosed } from "../domain/types";
import { offerPrice, sum } from "./pricing";

const now = () => new Date().toISOString();

export function listOffersForDoctor(doctorId: string) {
  return db().offers.listByDoctor(doctorId);
}

export function getOffer(id: string) {
  return db().offers.findById(id);
}

export async function listOfferRequests() {
  const offers = await db().offers.listAll();
  const pending = offers.filter((o) => o.status === "REQUESTED").sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  const answered = offers
    .filter((o) => o.status !== "REQUESTED" && o.answeredAt)
    .sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""))
    .slice(0, 30);
  return { pending, answered };
}

export interface PriceLineInput {
  lineNo: number;
  discountPct: number;
  specialDiscountPct: number;
}

/** Support prices the request and returns it to the salesperson. */
export async function priceOffer(offer: Offer, lines: PriceLineInput[], supportNotes: string, user: Session) {
  const newLines = offer.lines.map((l) => {
    const p = lines.find((x) => x.lineNo === l.lineNo);
    if (!p) return l;
    const discountPct = Number(p.discountPct) || 0;
    const specialDiscountPct = Number(p.specialDiscountPct) || 0;
    return { ...l, discountPct, specialDiscountPct, offerPrice: offerPrice(l.floorPrice, l.qty, discountPct, specialDiscountPct) };
  });
  const total = sum(newLines.map((l) => l.offerPrice));
  const updated = await db().offers.update(offer.id, {
    lines: newLines,
    total,
    status: "PRICED",
    supportNotes,
    answeredBy: user.userId,
    answeredAt: now(),
  });
  const project = await db().projects.findById(offer.projectId);
  if (project) {
    const projLines = project.lines.map((l) => {
      const n = newLines.find((x) => x.lineNo === l.lineNo);
      return n ? { ...l, discountPct: n.discountPct, specialDiscountPct: n.specialDiscountPct, offerPrice: n.offerPrice } : l;
    });
    await db().projects.update(project.id, { lines: projLines, value: total, lastOfferDate: updated.date });
    await db().projects.addEvent({
      projectId: project.id,
      date: now(),
      type: "COMMENT",
      title: "Τιμολόγηση από υποστήριξη",
      description: `${offer.number}/V${offer.version}: ${total.toLocaleString("el-GR")} €${supportNotes ? " – " + supportNotes : ""}`,
      userId: user.userId,
    });
  }
  return updated;
}

/** Salesperson acknowledges the priced offer and marks it as sent to the doctor. */
export async function markOfferSent(offer: Offer, user: Session) {
  const updated = await db().offers.update(offer.id, {
    status: "SENT",
    acknowledgedAt: now(),
    date: new Date().toISOString().slice(0, 10),
  });
  await db().projects.update(offer.projectId, { lastOfferDate: updated.date, stage: "OFFER" });
  await db().projects.addEvent({
    projectId: offer.projectId,
    date: now(),
    type: "OFFER_SENT",
    title: "Αποστολή προσφοράς",
    description: `Προσφορά ${updated.total.toLocaleString("el-GR")} € (${offer.number}/V${offer.version})`,
    userId: user.userId,
  });
  return updated;
}

export function setOfferClosed(offerId: string, closed: OfferClosed) {
  return db().offers.update(offerId, { closed });
}
