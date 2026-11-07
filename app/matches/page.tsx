import { JobMatchesPage } from "@/components/candidate/job-matches-page";
import { RoleGate } from "@/components/auth/role-gate";

export default function MatchesRoute() {
  return <RoleGate allow={["CANDIDATE"]}><JobMatchesPage /></RoleGate>;
}
