import { z } from "zod";

export const LetterLanguageSchema = z.enum(["FR", "EN"]);

export const GenerateLetterSchema = z
  .object({
    // Catalog IDs are UUIDs for some records and 24-character Mongo IDs for
    // seeded/legacy records. Both are valid identifiers in this project.
    applicationId: z.string().trim().min(1).max(64).refine(
      (value) => z.string().uuid().safeParse(value).success || /^[0-9a-f]{24}$/i.test(value),
      "Identifiant de candidature invalide.",
    ),
    language: LetterLanguageSchema.optional(),
  })
  .strict();

export const UpdateLetterSchema = z
  .object({
    subject: z.string().trim().min(3).max(180).optional(),
    body: z.string().trim().min(40).max(12_000).optional(),
  })
  .strict();

export const SendLetterSchema = z
  .object({
    confirm: z.literal(true, {
      errorMap: () => ({ message: "confirm doit être true pour envoyer." }),
    }),
  })
  .strict();
