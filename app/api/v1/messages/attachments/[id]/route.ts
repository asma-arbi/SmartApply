import { NextResponse } from "next/server";
import { getMessageAttachment } from "@/server/services/messaging.service";
import { withAuth } from "@/server/middleware/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (req, { params }) => {
  const attachment = await getMessageAttachment(req.user, params.id);
  const safeFilename = encodeURIComponent(attachment.name).replace(/['()]/g, "");
  return new NextResponse(new Uint8Array(attachment.content), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.content.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${safeFilename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
