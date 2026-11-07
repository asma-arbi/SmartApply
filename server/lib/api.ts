import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { ApiError } from "@/server/lib/errors";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, init?: { status?: number; headers?: HeadersInit }): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200, headers: init?.headers });
}

export function fail(status: number, code: string, message: string, details?: unknown): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

type RouteContext<P> = { params: P };
/** Next.js 15+ passes `params` as a Promise — keep handlers sync-looking. */
type IncomingContext<P> = { params: P | Promise<P> };
type RouteHandler<P> = (req: NextRequest, ctx: RouteContext<P>) => Promise<NextResponse>;

async function resolveParams<P>(params: P | Promise<P>): Promise<P> {
  return await Promise.resolve(params);
}

export function handleRoute<P = Record<string, never>>(handler: RouteHandler<P>) {
  return async (req: NextRequest, ctx: IncomingContext<P>) => {
    try {
      const params = await resolveParams(ctx.params);
      return await handler(req, { params });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): NextResponse<ApiFailure> {
  if (err instanceof ApiError) {
    return fail(err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return fail(400, "VALIDATION_ERROR", "Données invalides.", err.flatten());
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return fail(400, "VALIDATION_ERROR", "Données invalides.", err.errors);
  }
  if ((err as any)?.code === 11000) {
    return fail(409, "CONFLICT", "Conflit d'unicité.", (err as any)?.keyValue);
  }
  console.error("[api] Erreur non gérée :", err);
  return fail(500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
}

export async function parseJsonBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Corps de requête JSON invalide ou absent.");
  }
  return schema.parse(raw);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}
