import { BackLink, PageTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { el } from "@/lib/i18n/el";

/** Full-page placeholder for a screen whose SoftOne endpoint is not built yet (see src/lib/features.ts). */
export function ComingSoon({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {backHref && <BackLink href={backHref} />}
      <PageTitle>{title}</PageTitle>
      <div className="card p-8 flex flex-col items-center gap-3 text-center">
        <span className="tile-icon from-gray-100 to-gray-200 text-gray-500">
          <Icon.wrench size={24} />
        </span>
        <p className="font-semibold text-brand-800">{el.app.comingSoon}</p>
      </div>
    </div>
  );
}
