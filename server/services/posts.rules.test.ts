import { describe, expect, it } from "vitest";
import { ConflictError, UnverifiedCompanyError, ValidationError } from "@/server/lib/errors";
import { idsMatching } from "@/server/services/catalog";
import {
  assertCompanyCanPublish,
  assertImportedSource,
  assertNoExistingReport,
  excerptFrom,
  isPubliclyVisible,
  normalizeTags,
  preparePublication,
} from "@/server/services/posts.rules";
import { sanitizePostContent } from "@/lib/rich-text";
describe("normalizeTags", () => {
  it("lowercases, dedupes and hyphenates", () => {
    expect(normalizeTags(["React.js", " react.js ", "PFE 2026", "a"])).toEqual(["react-js", "pfe-2026"]);
  });

  it("caps at 12 tags", () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    expect(normalizeTags(tags)).toHaveLength(12);
  });
});

describe("assertImportedSource", () => {
  it("rejects imported posts without a source URL", () => {
    expect(() => assertImportedSource("IMPORTED", null)).toThrow(ValidationError);
  });

  it("allows manual posts without a URL", () => {
    expect(() => assertImportedSource("MANUAL", null)).not.toThrow();
  });

  it("allows imported posts with a URL", () => {
    expect(() => assertImportedSource("IMPORTED", "https://example.com/annonce")).not.toThrow();
  });
});

describe("assertCompanyCanPublish", () => {
  it("blocks unverified or unclaimed companies", () => {
    expect(() => assertCompanyCanPublish({ isClaimed: true, isVerified: false })).toThrow(UnverifiedCompanyError);
    expect(() => assertCompanyCanPublish({ isClaimed: false, isVerified: true })).toThrow(UnverifiedCompanyError);
  });

  it("allows claimed and verified companies", () => {
    expect(() => assertCompanyCanPublish({ isClaimed: true, isVerified: true })).not.toThrow();
  });
});

describe("visibility", () => {
  it("only published non-deleted posts are public", () => {
    expect(isPubliclyVisible("PUBLISHED", null)).toBe(true);
    expect(isPubliclyVisible("DRAFT", null)).toBe(false);
    expect(isPubliclyVisible("PUBLISHED", new Date())).toBe(false);
    expect(isPubliclyVisible("ARCHIVED", null)).toBe(false);
  });
});

describe("catalog search", () => {
  it("matches companies by name", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const companies = [{ id: companyId, name: "Vermeg Tunisia", city: "Tunis", sector: "Fintech" }];
    expect(idsMatching(companies, "vermeg", (item) => [item.name])).toEqual([companyId]);
    expect(idsMatching(companies, "inconnu", (item) => [item.name])).toEqual([]);
  });

  it("matches jobs by title", () => {
    const jobs = [{ id: "job-1", title: "Développeur fullstack junior", city: "Tunis" }];
    expect(idsMatching(jobs, "fullstack", (item) => [item.title]).length).toBeGreaterThan(0);
  });
});

describe("preparePublication", () => {
  it("lets a candidate publish a text update without a company", () => {
    const prepared = preparePublication({
      role: "CANDIDATE",
      postKind: "TEXT",
      category: "CAREER_ADVICE",
      visibility: "MEMBERS",
      commentMode: "NONE",
    });
    expect(prepared.requiresCompany).toBe(false);
    expect(prepared.visibility).toBe("MEMBERS");
    expect(prepared.commentMode).toBe("NONE");
  });

  it("asks for two poll choices and blocks candidate job posts", () => {
    expect(() =>
      preparePublication({ role: "COMPANY", postKind: "POLL", poll: { options: ["Un seul"] } }),
    ).toThrow(ValidationError);
    expect(() => preparePublication({ role: "CANDIDATE", postKind: "JOB" })).toThrow(ValidationError);
  });
});

describe("reports, source and rich text", () => {
  it("allows one report per user and post", () => {
    expect(() => assertNoExistingReport(false)).not.toThrow();
    expect(() => assertNoExistingReport(true)).toThrow(ConflictError);
  });

  it("strips scripts and keeps safe formatting", () => {
    const clean = sanitizePostContent('<p onclick="alert(1)">Bonjour <strong>Tunis</strong></p><script>alert(1)</script>');
    expect(clean).toContain("<strong>Tunis</strong>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(excerptFrom("<p>Stage PFE à Tunis</p>")).toBe("Stage PFE à Tunis");
  });
});

describe("excerptFrom", () => {
  it("truncates long bodies", () => {
    const body = "x".repeat(300);
    expect(excerptFrom(body, 240)).toHaveLength(240);
    expect(excerptFrom("short")).toBe("short");
  });
});
