/**
 * Pure scoring logic for mock exams.
 *
 * Mirrors the real Claude Certification format: answers are scored onto a
 * scaled range (default 0–1000) and compared against a pass threshold
 * (e.g. 720). Per-domain breakdown drives the "weak areas" feedback.
 *
 * This module is intentionally free of any I/O so it can be unit-tested in
 * isolation — it is one of the two places (with entitlements) where a bug
 * directly hurts the user or the business.
 */

export interface AnswerOutcome {
  domain: string;
  isCorrect: boolean;
}

export interface DomainBreakdown {
  domain: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface ScoreResult {
  correct: number;
  total: number;
  percentage: number;
  scaled: number;
  passed: boolean;
  domains: DomainBreakdown[];
}

export interface ScoreOptions {
  /** Scaled score required to pass, on the same range as scaleMax. */
  passScaled: number;
  /** Top of the scaled range. Defaults to 1000. */
  scaleMax?: number;
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Score a completed attempt.
 *
 * The scaled score is a straight linear projection of the raw percentage onto
 * [0, scaleMax]; the pass decision compares that scaled score to passScaled.
 */
export function scoreAttempt(
  answers: AnswerOutcome[],
  options: ScoreOptions,
): ScoreResult {
  const scaleMax = options.scaleMax ?? 1000;
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;

  const percentage = total === 0 ? 0 : (correct / total) * 100;
  const scaled = total === 0 ? 0 : round((correct / total) * scaleMax);
  const passed = scaled >= options.passScaled;

  const byDomain = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = byDomain.get(a.domain) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    byDomain.set(a.domain, entry);
  }

  const domains: DomainBreakdown[] = Array.from(byDomain.entries()).map(
    ([domain, { correct: c, total: t }]) => ({
      domain,
      correct: c,
      total: t,
      percentage: t === 0 ? 0 : round((c / t) * 100),
    }),
  );

  return { correct, total, percentage, scaled, passed, domains };
}

/**
 * The domains where the candidate is weakest, worst first. Useful for the
 * results screen and the "focus here" upsell email.
 */
export function weakestDomains(result: ScoreResult, limit = 3): DomainBreakdown[] {
  return [...result.domains]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, limit);
}
