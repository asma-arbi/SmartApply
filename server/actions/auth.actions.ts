"use server";

import { cookies } from "next/headers";
import { LoginSchema, RegisterSchema } from "@/server/schemas/auth.schema";
import { createMongoAccount, issueToken, loginMongoAccount, revokeMongoToken } from "@/server/lib/mongo-auth";

const COOKIE = "smartapply-auth-token";

async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function loginAction(email: string, password: string) {
  const input = LoginSchema.parse({ email, password });
  const user = await loginMongoAccount(input.email, input.password);
  const session = await issueToken(user);
  await setSessionCookie(session.accessToken);
  return { ...session, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function registerAction(input: { name: string; email: string; password: string }) {
  const parsed = RegisterSchema.parse(input);
  const user = await createMongoAccount(parsed);
  const session = await issueToken(user);
  await setSessionCookie(session.accessToken);
  return { ...session, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await revokeMongoToken(token);
  store.delete(COOKIE);
  return { ok: true };
}
