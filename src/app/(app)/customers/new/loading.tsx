import { FormSkeleton } from "@/components/skeleton";

export default function Loading() {
  return <FormSkeleton fields={10} cards={2} doctor={false} />;
}
