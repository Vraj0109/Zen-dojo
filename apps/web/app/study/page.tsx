import { redirect } from "next/navigation";

/** There is no study index: Learn opens on system design, the other areas are tabs. */
export default function StudyIndexPage() {
  redirect("/study/sd");
}
