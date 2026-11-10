import Link from "next/link";
import { BackLink, PageTitle } from "@/components/ui";
import { CustomerSearch } from "@/components/customer-search";
import { Icon } from "@/components/icons";
import { el } from "@/lib/i18n/el";

export const metadata = { title: el.customer.title };

export default async function CustomerSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/dashboard" />
      <PageTitle
        right={
          <Link href="/customers/new" className="btn-primary shrink-0">
            <Icon.plus size={18} />
            {el.customer.createNew}
          </Link>
        }
      >
        {el.customer.searchExisting}
      </PageTitle>
      <CustomerSearch initialQ={q ?? ""} />
    </div>
  );
}
