"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import type { FollowUpContactMethod, FollowUpResult, NextAction, ProjectType } from "@/server/domain/types";
import { addFollowUp, closeProject, createProject, getProject, requestOffer, reviseOffer } from "@/server/services/project-service";
import { getOffer, markOfferSent } from "@/server/services/offer-service";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const linesSchema = z.array(
  z.object({
    productCode: z.string(),
    qty: z.union([z.number(), z.string()]),
    floorPrice: z.union([z.number(), z.string()]),
    discountPct: z.union([z.number(), z.string()]),
    specialDiscountPct: z.union([z.number(), z.string()]),
  }),
);

export async function createProjectAction(fd: FormData) {
  const user = await requireUser();
  const doctorId = str(fd, "doctorId");
  const parsed = linesSchema.safeParse(JSON.parse(str(fd, "lines") || "[]"));
  const lines = parsed.success
    ? parsed.data.map((l) => ({
        productCode: l.productCode,
        qty: num(l.qty) || 1,
        floorPrice: num(l.floorPrice),
        discountPct: num(l.discountPct),
        specialDiscountPct: num(l.specialDiscountPct),
      }))
    : [];
  const type = str(fd, "type");
  const project = await createProject(
    doctorId,
    {
      type: (["NEW_CLINIC", "REPLACEMENT", "PUBLIC_TENDER"].includes(type) ? type : "REPLACEMENT") as ProjectType,
      title: str(fd, "title"),
      notes: str(fd, "notes"),
      lines,
      requestOffer: str(fd, "intent") === "requestOffer",
    },
    user,
  );
  revalidatePath(`/customers/${doctorId}`);
  redirect(`/customers/${doctorId}/projects/${project.id}${str(fd, "intent") === "requestOffer" ? "?sent=1" : ""}`);
}

export async function requestOfferAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  await requestOffer(project, user);
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?sent=1`);
}

export async function followUpAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  await addFollowUp(
    project,
    {
      contactMethod: (str(fd, "contactMethod") || "PHONE") as FollowUpContactMethod,
      result: (str(fd, "result") || "WAITING") as FollowUpResult,
      comment: str(fd, "comment"),
      nextAction: (str(fd, "nextAction") || "NONE") as NextAction,
      nextActionDate: str(fd, "nextActionDate") || undefined,
    },
    user,
  );
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?saved=followup`);
}

const reviseSchema = z.array(z.object({ lineNo: z.number(), discountPct: z.union([z.number(), z.string()]), specialDiscountPct: z.union([z.number(), z.string()]) }));

export async function reviseAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  const reason = str(fd, "reason");
  if (!reason) redirect(`/customers/${project.doctorId}/projects/${project.id}/revise?error=reason`);
  const parsed = reviseSchema.safeParse(JSON.parse(str(fd, "lines") || "[]"));
  await reviseOffer(
    project,
    {
      lines: parsed.success ? parsed.data.map((l) => ({ lineNo: l.lineNo, discountPct: num(l.discountPct), specialDiscountPct: num(l.specialDiscountPct) })) : [],
      notes: str(fd, "notes"),
      reason,
    },
    user,
  );
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?sent=1`);
}

export async function closeProjectAction(fd: FormData) {
  const user = await requireUser();
  const project = await getProject(str(fd, "projectId"));
  if (!project) redirect("/customers");
  const lines = project.lines.map((l) => ({
    lineNo: l.lineNo,
    won: str(fd, `won_${l.lineNo}`) === "YES",
    competitor: str(fd, `competitor_${l.lineNo}`),
    competitorModel: str(fd, `competitorModel_${l.lineNo}`),
    competitorPrice: str(fd, `competitorPrice_${l.lineNo}`) ? num(str(fd, `competitorPrice_${l.lineNo}`)) : null,
    closeComments: str(fd, `comments_${l.lineNo}`),
  }));
  await closeProject(project, lines, user);
  revalidatePath(`/customers/${project.doctorId}`);
  redirect(`/customers/${project.doctorId}/projects/${project.id}?saved=closed`);
}

export async function markOfferSentAction(fd: FormData) {
  const user = await requireUser();
  const offer = await getOffer(str(fd, "offerId"));
  if (!offer) redirect("/customers");
  await markOfferSent(offer, user);
  revalidatePath(`/customers/${offer.doctorId}`);
  redirect(`/customers/${offer.doctorId}/projects/${offer.projectId}?saved=sent`);
}
