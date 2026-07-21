/**
 * Pure parser for the MockCred exam import format.
 *
 * The owner authors each mock as a self-contained HTML export containing a
 * `const DATA = { ... }` object (see content/samples/CCAOF_Impossible_Mock_01.html),
 * or as an equivalent `.json` file. This module turns that into a validated,
 * normalized `ParsedExam`. It performs NO I/O against the database.
 *
 * Note: extracting DATA from HTML evaluates the object literal. Import only
 * trusted, owner-authored content — never user uploads.
 */
import { z } from "zod";

// ---- Normalized output types -------------------------------------------------

export interface ParsedOption {
  letter: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  position: number;
}

export interface ParsedQuestion {
  externalId: number;
  domainNo: number;
  caseKey?: string;
  variant?: string;
  selection: "single" | "multi";
  answerCount?: number;
  stem: string;
  rationale?: string;
  concept?: string;
  lesson?: string;
  bloom?: string;
  difficulty?: number;
  confidence?: string;
  reference?: string;
  officialTerminology: string[];
  distractorPatterns: string[];
  crossModules: number[];
  options: ParsedOption[];
  position: number;
}

export interface ParsedDomain {
  domainNo: number;
  name: string;
  weight: number;
  itemTarget: number;
}

export interface ParsedCase {
  caseKey: string;
  title?: string;
  questionRange?: string;
  scenario: string;
}

export interface ParsedExam {
  examCode: string;
  slug: string;
  title: string;
  subtitle?: string;
  version?: string;
  sourceVersion?: string;
  durationMinutes: number;
  questionCount: number;
  passScaled: number;
  scaleMin: number;
  scaleMax: number;
  masteryBenchmark: number;
  bloomTarget: unknown;
  domains: ParsedDomain[];
  cases: ParsedCase[];
  questions: ParsedQuestion[];
}

// ---- Raw (source) schema validation -----------------------------------------

const rawQuestion = z.object({
  id: z.number(),
  domain: z.number(),
  caseId: z.string().optional(),
  variant: z.string().optional(),
  selection: z.enum(["single", "multi"]).default("single"),
  answerCount: z.number().optional(),
  question: z.string(),
  options: z.record(z.string(), z.string()),
  correct: z.array(z.string()).min(1),
  rationale: z.string().optional(),
  optionExplanations: z.record(z.string(), z.string()).optional(),
  concept: z.string().optional(),
  lesson: z.string().optional(),
  bloom: z.string().optional(),
  difficulty: z.number().optional(),
  confidence: z.string().optional(),
  reference: z.string().optional(),
  officialTerminology: z.array(z.string()).optional(),
  distractorPatterns: z.array(z.string()).optional(),
  crossModules: z.array(z.number()).optional(),
});

const rawBlueprint = z.object({
  domain: z.number(),
  name: z.string(),
  weight: z.number().default(0),
  items: z.number().default(0),
});

const rawData = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  version: z.string().optional(),
  examCode: z.string(),
  sourceVersion: z.string().optional(),
  durationMinutes: z.number(),
  masteryBenchmark: z.number().default(80),
  questionCount: z.number(),
  passScaled: z.number().optional(),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  blueprint: z.array(rawBlueprint).default([]),
  bloomTarget: z.unknown().optional(),
  caseStudies: z.record(z.string(), z.unknown()).optional(),
  questions: z.array(rawQuestion),
});

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- Parsing -----------------------------------------------------------------

export interface ParseOptions {
  /** Override the derived slug. */
  slug?: string;
}

export function parseMockData(input: unknown, opts: ParseOptions = {}): ParsedExam {
  const data = rawData.parse(input);

  const domains: ParsedDomain[] = data.blueprint.map((b) => ({
    domainNo: b.domain,
    name: b.name,
    weight: b.weight,
    itemTarget: b.items,
  }));

  const cases: ParsedCase[] = Object.entries(data.caseStudies ?? {}).map(
    ([caseKey, value]) => {
      const v = (value ?? {}) as Record<string, unknown>;
      return {
        caseKey,
        title: typeof v.title === "string" ? v.title : undefined,
        questionRange:
          typeof v.questionRange === "string" ? v.questionRange : undefined,
        scenario: typeof v.scenario === "string" ? v.scenario : "",
      };
    },
  );

  const questions: ParsedQuestion[] = data.questions.map((q, index) => {
    const correct = new Set(q.correct);
    const options: ParsedOption[] = Object.entries(q.options).map(
      ([letter, text], i) => ({
        letter,
        text,
        isCorrect: correct.has(letter),
        explanation: q.optionExplanations?.[letter],
        position: i,
      }),
    );

    // Integrity: every key in `correct` must exist in `options`.
    for (const letter of q.correct) {
      if (!(letter in q.options)) {
        throw new Error(
          `Question ${q.id}: correct answer "${letter}" is not among its options`,
        );
      }
    }

    return {
      externalId: q.id,
      domainNo: q.domain,
      caseKey: q.caseId,
      variant: q.variant,
      selection: q.selection,
      answerCount: q.answerCount ?? (q.selection === "multi" ? q.correct.length : 1),
      stem: q.question,
      rationale: q.rationale,
      concept: q.concept,
      lesson: q.lesson,
      bloom: q.bloom,
      difficulty: q.difficulty,
      confidence: q.confidence,
      reference: q.reference,
      officialTerminology: q.officialTerminology ?? [],
      distractorPatterns: q.distractorPatterns ?? [],
      crossModules: q.crossModules ?? [],
      options,
      position: index,
    };
  });

  return {
    examCode: data.examCode,
    slug: opts.slug ?? slugify(data.title),
    title: data.title,
    subtitle: data.subtitle,
    version: data.version,
    sourceVersion: data.sourceVersion,
    durationMinutes: data.durationMinutes,
    questionCount: data.questionCount,
    passScaled: data.passScaled ?? 720,
    scaleMin: data.scaleMin ?? 100,
    scaleMax: data.scaleMax ?? 1000,
    masteryBenchmark: data.masteryBenchmark,
    bloomTarget: data.bloomTarget ?? null,
    domains,
    cases,
    questions,
  };
}

/**
 * Extract the `const DATA = { ... }` object from an HTML export by scanning for
 * the balanced top-level braces, then evaluating the (trusted) object literal.
 */
export function extractDataFromHtml(html: string): unknown {
  const anchor = html.indexOf("const DATA");
  if (anchor === -1) throw new Error("No `const DATA` found in HTML export");
  const eq = html.indexOf("=", anchor);
  const open = html.indexOf("{", eq);
  if (open === -1) throw new Error("Malformed DATA object in HTML export");

  let depth = 0;
  let inStr = false;
  let strCh = "";
  let prev = "";
  let end = -1;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === strCh && prev !== "\\") inStr = false;
    } else if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      strCh = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
    prev = c;
  }
  if (end === -1) throw new Error("Unbalanced DATA object in HTML export");

  const objectText = html.slice(open, end);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  return Function(`"use strict"; return (${objectText});`)();
}

export function parseExamSource(
  source: string,
  format: "html" | "json",
  opts: ParseOptions = {},
): ParsedExam {
  const raw = format === "html" ? extractDataFromHtml(source) : JSON.parse(source);
  return parseMockData(raw, opts);
}
