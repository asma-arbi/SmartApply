import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "@/server/services/catalog";
import { quotaFor, renderTemplate, sanitizeLetter } from "@/server/services/letters.rules";

const profile: CandidateProfile = {
  fullName: "Amine Ben Salah",
  email: "amine@example.tn",
  city: "Tunis",
  headline: "Étudiant ingénieur logiciel",
  skills: ["TypeScript", "React"],
  education: ["Licence informatique"],
  experiences: [{ title: "Stagiaire développement", company: "Startup Hub Tunis", years: "2025" }],
  languages: [{ name: "Français", level: "courant" }],
};

describe("quotaFor (CDC §9)", () => {
  it("matches Functional Reference Free / Premium letter quotas", () => {
    expect(quotaFor("FREE")).toEqual({
      generatePerDay: 10,
      sendPerDay: 10,
      sendPerWeek: 30,
      regenerationsPerApplication: 2,
    });
    expect(quotaFor("PREMIUM")).toEqual({
      generatePerDay: 40,
      sendPerDay: 25,
      sendPerWeek: 75,
      regenerationsPerApplication: 10,
    });
  });
});

describe("renderTemplate", () => {
  it("only interpolates known profile and job facts", () => {
    const letter = renderTemplate({
      language: "FR",
      profile: profile,
      jobTitle: "Développeur fullstack junior",
      companyName: "Vermeg Tunisia",
      city: "Tunis",
    });
    expect(letter.subject).toContain("Vermeg");
    expect(letter.body).toContain("TypeScript");
    expect(letter.body).not.toContain("Google");
    expect(letter.body).not.toContain("Stanford");
  });

  it("omits experience when the profile has none", () => {
    const letter = renderTemplate({
      language: "EN",
      profile: { ...profile, experiences: [], skills: [], education: [] },
      jobTitle: "Intern",
      companyName: "Vermeg Tunisia",
      city: "Tunis",
    });
    expect(letter.body).toContain("Intern");
    expect(letter.body).not.toContain("I recently worked");
    expect(letter.body).not.toContain("My skills include");
  });
});

describe("sanitizeLetter", () => {
  it("strips invented employers", () => {
    const result = sanitizeLetter(
      "J’ai travaillé chez Google et j’utilise TypeScript.",
      profile,
    );
    expect(result.text.toLowerCase()).not.toContain("google");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("keeps known skills", () => {
    const result = sanitizeLetter("Je suis expert en TypeScript.", profile);
    expect(result.text).toContain("TypeScript");
    expect(result.warnings).toEqual([]);
  });
});
