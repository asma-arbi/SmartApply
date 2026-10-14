import { createClient } from "@/lib/supabase/server";
import { JobFormClient } from "./job-form-client";

// /dashboard/jobs/new = création ; /dashboard/jobs/<uuid> = modification
export default async function JobForm({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  const supabase = createClient();
  
  let job = null;
  let companyName = "";

  if (!isNew) {
    const { data } = await supabase.from("jobs").select("*").eq("id", params.id).single();
    job = data;
  }

  // Get company name for preview
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: company } = await supabase.from("companies").select("name").eq("id", user.id).single();
    companyName = company?.name || "";
  }

  return <JobFormClient job={job} isNew={isNew} companyName={companyName} />;
}
