import { NextResponse } from "next/server";
import { openApiDocument } from "@/server/lib/openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(openApiDocument);
}
