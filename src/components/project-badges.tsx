import { Badge } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import type { OfferClosed, OfferStatus, ProjectStage, ProjectStatus } from "@/server/domain/types";

export function StageBadge({ stage }: { stage: ProjectStage }) {
  const tone = stage === "WON" ? "green" : stage === "LOST" ? "red" : stage === "PARTIAL" ? "amber" : stage === "NEGOTIATION" ? "teal" : "blue";
  return <Badge tone={tone}>{el.enums.projectStage[stage]}</Badge>;
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={status === "ACTIVE" ? "teal" : "gray"}>{el.enums.projectStatus[status]}</Badge>;
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const tone = status === "REQUESTED" ? "amber" : status === "PRICED" ? "teal" : "blue";
  return <Badge tone={tone}>{el.enums.offerStatus[status]}</Badge>;
}

export function ClosedBadge({ closed }: { closed?: OfferClosed }) {
  if (!closed) return <Badge tone="gray">—</Badge>;
  const tone = closed === "YES" ? "green" : closed === "NO" ? "red" : "amber";
  return <Badge tone={tone}>{el.enums.offerClosed[closed]}</Badge>;
}
