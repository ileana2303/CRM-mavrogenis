import { redirect } from "next/navigation";

/** «Η μέρα μου» became the top of the Αναφορά Ημέρας (one daily screen, one overdue count). Old links land there. */
export default function MyDayPage() {
  redirect("/dashboard");
}
