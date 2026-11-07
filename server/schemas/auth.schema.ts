import { z } from "zod";

export const LoginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(128),
  })
  .strict();

export const RegisterSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    name: z.string().trim().max(100).optional(),
  })
  .strict();
