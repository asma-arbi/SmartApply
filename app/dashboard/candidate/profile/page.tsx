import { redirect } from "next/navigation";

export default function CandidateProfileRedirect() {
  redirect("/dashboard/candidate/settings");
}
