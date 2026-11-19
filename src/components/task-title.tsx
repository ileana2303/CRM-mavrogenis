import Link from "next/link";
import { el } from "@/lib/i18n/el";
import type { Task } from "@/server/domain/types";
import { taskTimelineAction } from "@/app/(app)/customers/actions";
import { Icon } from "./icons";
import { KindIcon } from "./timeline";
import { TimelineButton } from "./timeline-button";

/**
 * The «what» of a pending item: type icon, its text (tap = the item's history chain), and a line with the project and –
 * when it isn't mine – whose item it is. Calls/meetings without comments are named by their type.
 */
export function TaskTitle({ task, meId, children }: { task: Task; meId?: string; children?: React.ReactNode }) {
  const kind = task.kind ?? "TASK";
  const text = task.title || el.timeline.kinds[kind];
  const someoneElse = meId && task.userId && task.userId !== meId ? task.ownerName ?? `#${task.userId}` : null;
  return (
    <div className="flex items-start gap-3">
      <KindIcon kind={kind} />
      <div className="min-w-0">
        <TimelineButton
          id={task.id}
          currentId={task.id}
          load={taskTimelineAction}
          title={el.pending.historyTitle}
          label={el.pending.history}
          className="group inline-flex min-h-9 items-start gap-1.5 rounded-lg text-left font-medium text-slate-900 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <span className="group-hover:underline decoration-brand-300 underline-offset-4">{text}</span>
          <span className="mt-0.5 shrink-0 text-brand-500 opacity-70 group-hover:opacity-100">
            <Icon.history size={16} />
          </span>
        </TimelineButton>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="text-[var(--muted)]">{el.timeline.kinds[kind]}</span>
          {task.projectId && task.doctorId && (
            <Link href={`/customers/${task.doctorId}/projects/${task.projectId}`} className="text-brand-700 hover:underline">
              {el.pending.project}: {task.projectName ?? `#${task.projectId}`}
            </Link>
          )}
          {someoneElse && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              <Icon.users size={12} />
              {someoneElse}
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
