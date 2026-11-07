"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { ReportsInbox } from "@/components/admin/reports-inbox";
import { CompanyReportsInbox } from "@/components/admin/company-reports-inbox";

export default function AdminReportsPage() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <div className="space-y-5"><ReportsInbox /><div id="companies" className="mx-auto w-full max-w-[1128px] scroll-mt-24"><CompanyReportsInbox /></div></div>
    </RoleGate>
  );
}
