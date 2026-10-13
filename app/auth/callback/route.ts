import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/login?error=invalid`);
    }

    const role = data.user?.user_metadata?.role as string | undefined;
    if (role === "admin") return NextResponse.redirect(`${origin}/dashboard/admin`);
    if (role === "entreprise") return NextResponse.redirect(`${origin}/dashboard/company`);
    return NextResponse.redirect(`${origin}/dashboard/candidate`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
