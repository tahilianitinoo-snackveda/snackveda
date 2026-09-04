import { describe, expect, it } from "vitest";
import { estimateReadMinutes, slugify } from "./content";

describe("slugify", () => {
  it("lowercases, strips punctuation and joins words with hyphens", () => {
    expect(slugify("How to Choose Healthier Snacks!")).toBe("how-to-choose-healthier-snacks");
    expect(slugify("Makhana: the whole story")).toBe("makhana-the-whole-story");
  });

  it("collapses runs of whitespace and hyphens", () => {
    expect(slugify("too    many   spaces")).toBe("too-many-spaces");
    expect(slugify("already---hyphenated")).toBe("already-hyphenated");
  });

  it("never leaves a slug starting or ending in a hyphen", () => {
    expect(slugify("  leading and trailing  ")).toBe("leading-and-trailing");
    expect(slugify("Ends with punctuation!!!")).toBe("ends-with-punctuation");
    expect(slugify("---")).toBe("");
  });

  /*
   * The regression this file was created for. `PATCH /admin/blog/:id` with
   * {"slug": null} returned a 500 from a live admin route, because api/tsconfig.json
   * turns strictNullChecks off and zod therefore typed the field as a plain string.
   * Neither the compiler nor any test could see it while slugify lived in
   * api/index.ts, which the suite does not reach.
   */
  it("returns an empty string for null, undefined and non-strings rather than throwing", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
    expect(slugify(123 as unknown as string)).toBe("");
    expect(slugify({} as unknown as string)).toBe("");
  });

  it("returns an empty string for input with nothing sluggable in it", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("caps the slug at 90 characters and does not end on a hyphen after the cut", () => {
    const long = slugify("a".repeat(200));
    expect(long.length).toBe(90);

    // A cut landing exactly on a hyphen would otherwise leave a trailing one.
    const words = slugify(`${"word ".repeat(30)}tail`);
    expect(words.length).toBeLessThanOrEqual(90);
    expect(words.endsWith("-")).toBe(false);
  });
});

describe("estimateReadMinutes", () => {
  it("counts words at 200 per minute", () => {
    expect(estimateReadMinutes("word ".repeat(200))).toBe(1);
    expect(estimateReadMinutes("word ".repeat(600))).toBe(3);
  });

  it("never returns less than one minute, however short the post", () => {
    expect(estimateReadMinutes("")).toBe(1);
    expect(estimateReadMinutes("   ")).toBe(1);
    expect(estimateReadMinutes("Hi.")).toBe(1);
  });

  it("survives a null or undefined body the same way slugify does", () => {
    expect(estimateReadMinutes(null)).toBe(1);
    expect(estimateReadMinutes(undefined)).toBe(1);
  });
});
