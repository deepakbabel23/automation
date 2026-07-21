import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseExamSource, parseMockData, slugify } from "@/content/importer";

const SAMPLE = resolve(
  process.cwd(),
  "content/samples/CCAOF_Impossible_Mock_01.html",
);

function sample() {
  return parseExamSource(readFileSync(SAMPLE, "utf8"), "html");
}

describe("parseExamSource (sample CCAO-F mock)", () => {
  it("extracts exam metadata", () => {
    const exam = sample();
    expect(exam.examCode).toBe("CCAO-F");
    expect(exam.durationMinutes).toBe(120);
    expect(exam.questionCount).toBe(60);
    expect(exam.passScaled).toBe(720);
    expect(exam.scaleMax).toBe(1000);
    expect(exam.masteryBenchmark).toBe(80);
  });

  it("parses all 60 questions across 7 domains", () => {
    const exam = sample();
    expect(exam.questions).toHaveLength(60);
    expect(exam.domains).toHaveLength(7);
    const domainNos = new Set(exam.questions.map((q) => q.domainNo));
    expect([...domainNos].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("parses the single/multi split and answer counts", () => {
    const exam = sample();
    const multi = exam.questions.filter((q) => q.selection === "multi");
    const single = exam.questions.filter((q) => q.selection === "single");
    expect(single).toHaveLength(52);
    expect(multi).toHaveLength(8);
    for (const q of multi) {
      const correct = q.options.filter((o) => o.isCorrect).length;
      expect(correct).toBeGreaterThanOrEqual(2);
      expect(q.answerCount).toBe(correct);
    }
  });

  it("marks correct options and attaches per-option explanations", () => {
    const exam = sample();
    const q1 = exam.questions.find((q) => q.externalId === 1)!;
    const correct = q1.options.filter((o) => o.isCorrect).map((o) => o.letter);
    expect(correct).toEqual(["A"]);
    expect(q1.options.every((o) => o.explanation && o.explanation.length > 0)).toBe(true);
  });

  it("links case-study questions to their case", () => {
    const exam = sample();
    expect(exam.cases.map((c) => c.caseKey)).toContain("asteron");
    const cased = exam.questions.filter((q) => q.caseKey === "asteron");
    expect(cased.length).toBeGreaterThan(0);
    expect(cased.map((q) => q.externalId).sort((a, b) => a - b)).toContain(41);
  });

  it("derives a slug from the title", () => {
    expect(slugify("CCAO-F Impossible Mock Test 01")).toBe(
      "ccao-f-impossible-mock-test-01",
    );
  });
});

describe("parseMockData validation", () => {
  it("rejects a question whose correct letter is not an option", () => {
    const bad = {
      title: "Bad",
      examCode: "X",
      durationMinutes: 10,
      questionCount: 1,
      questions: [
        { id: 1, domain: 1, question: "q", options: { A: "a" }, correct: ["B"] },
      ],
    };
    expect(() => parseMockData(bad)).toThrow(/not among its options/);
  });

  it("rejects data missing required fields", () => {
    expect(() => parseMockData({ title: "x" })).toThrow();
  });
});
