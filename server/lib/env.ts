import { z } from "zod";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim().length === 0 ? undefined : v);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  CORS_ORIGIN: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
