import { describe, expect, it } from "vitest";
import { scoreAttempt, weakestDomains, type AnswerOutcome } from "@/lib/scoring";

function outcomes(spec: Array<[domain: string, correct: number, total: number]>): AnswerOutcome[] {
  const answers: AnswerOutcome[] = [];
  for (const [domain, correct, total] of spec) {
    for (let i = 0; i < total; i++) {
      answers.push({ domain, isCorrect: i < correct });
    }
  }
  return answers;
}

describe("scoreAttempt", () => {
  it("scales a perfect attempt to the top of the range and passes", () => {
    const r = scoreAttempt(outcomes([["Fundamentals", 10, 10]]), { passScaled: 720 });
    expect(r.scaled).toBe(1000);
    expect(r.percentage).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("fails just below the pass threshold", () => {
    // 14/20 = 70% -> 700 scaled, below 720
    const r = scoreAttempt(outcomes([["A", 14, 20]]), { passScaled: 720 });
    expect(r.scaled).toBe(700);
    expect(r.passed).toBe(false);
  });

  it("passes exactly at the threshold", () => {
    // 18/25 = 72% -> 720 scaled
    const r = scoreAttempt(outcomes([["A", 18, 25]]), { passScaled: 720 });
    expect(r.scaled).toBe(720);
    expect(r.passed).toBe(true);
  });

  it("handles an empty attempt without dividing by zero", () => {
    const r = scoreAttempt([], { passScaled: 720 });
    expect(r).toMatchObject({ correct: 0, total: 0, scaled: 0, passed: false });
    expect(r.domains).toEqual([]);
  });

  it("computes a per-domain breakdown", () => {
    const r = scoreAttempt(
      outcomes([
        ["Prompting", 8, 10],
        ["Tools", 3, 10],
      ]),
      { passScaled: 720 },
    );
    const tools = r.domains.find((d) => d.domain === "Tools");
    expect(tools).toMatchObject({ correct: 3, total: 10, percentage: 30 });
  });

  it("respects a custom scale maximum", () => {
    const r = scoreAttempt(outcomes([["A", 5, 10]]), { passScaled: 60, scaleMax: 100 });
    expect(r.scaled).toBe(50);
    expect(r.passed).toBe(false);
  });
});

describe("weakestDomains", () => {
  it("returns the lowest-scoring domains worst-first", () => {
    const r = scoreAttempt(
      outcomes([
        ["Strong", 9, 10],
        ["Weak", 2, 10],
        ["Mid", 5, 10],
      ]),
      { passScaled: 720 },
    );
    const weak = weakestDomains(r, 2);
    expect(weak.map((d) => d.domain)).toEqual(["Weak", "Mid"]);
  });
});
