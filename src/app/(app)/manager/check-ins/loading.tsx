import { TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return <TableSkeleton doctor={false} filter cols={6} rows={8} />;
}
