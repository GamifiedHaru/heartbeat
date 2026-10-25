// Pure scoring engine. Implements each quiz's `results.method` from
// content/quizzes.json. No I/O, no React.
import type { Quiz, QuizItem } from "./content";

/** Likert: the raw 1-7 value. Choice: index of the chosen option.
 *  Open (love map): optional 1-5 confidence per prompt (unrated = absent). */
export type Answers = Record<string, number>;

export interface QuizScore {
  /** One or two outcome ids, best match first. */
  outcomeIds: string[];
  /** Dimension scores rounded to 2 dp (means, or counts for the choice quiz). */
  scores: Record<string, number>;
}

export interface DimensionMeta {
  key: string;
  label: string;
  min: number;
  max: number;
}

const likert = (key: string, label: string): DimensionMeta => ({
  key,
  label,
  min: 1,
  max: 7,
});

/** Chart dimensions per quiz (labels are neutral, never good or bad). */
export const DIMENSIONS: Record<string, DimensionMeta[]> = {
  "love-expression": [
    likert("words", "Kind words"),
    likert("time", "Quality time"),
    likert("service", "Helping out"),
    likert("gifts", "Thoughtful gifts"),
    likert("touch", "Physical touch"),
  ],
  "attachment-style": [
    likert("anxiety", "Worry about closeness"),
    likert("avoidance", "Need for distance"),
  ],
  triangle: [
    likert("intimacy", "Intimacy"),
    likert("passion", "Passion"),
    likert("commitment", "Commitment"),
  ],
  "conflict-horsemen": [
    { key: "criticism", label: "Criticism", min: 0, max: 12 },
    { key: "contempt", label: "Contempt", min: 0, max: 12 },
    { key: "defensiveness", label: "Defensiveness", min: 0, max: 12 },
    { key: "stonewalling", label: "Stonewalling", min: 0, max: 12 },
    { key: "repair", label: "Repair", min: 0, max: 12 },
  ],
  "love-styles": [
    likert("eros", "Eros"),
    likert("ludus", "Ludus"),
    likert("storge", "Storge"),
    likert("pragma", "Pragma"),
    likert("mania", "Mania"),
    likert("agape", "Agape"),
  ],
  "love-map": [{ key: "confidence", label: "Confidence", min: 1, max: 5 }],
};

export function dimensionsFor(quizId: string): DimensionMeta[] {
  return DIMENSIONS[quizId] ?? [];
}

/** 0..1 bar length for a score. */
export function normalise(value: number, d: DimensionMeta): number {
  if (d.max === d.min) return 0;
  return Math.min(1, Math.max(0, (value - d.min) / (d.max - d.min)));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 1e-9;

function roundAll(r: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, round2(v)]));
}

/** True when every item has a valid answer (open quizzes are always complete). */
export function isComplete(quiz: Quiz, answers: Answers): boolean {
  if (quiz.scale.type === "open") return true;
  return quiz.items.every((it) => isAnswered(it, answers[it.id]));
}

function isAnswered(item: QuizItem, v: number | undefined): boolean {
  if (v === undefined || !Number.isInteger(v)) return false;
  if (item.options) return v >= 0 && v < item.options.length;
  return true;
}

function dimensionMeans(quiz: Quiz, answers: Answers): Record<string, number> {
  if (quiz.scale.type !== "likert") return {};
  const { min, max } = quiz.scale;
  const sum: Record<string, number> = {};
  const n: Record<string, number> = {};
  for (const it of quiz.items) {
    sum[it.dimension] ??= 0;
    n[it.dimension] ??= 0;
    const raw = answers[it.id];
    if (raw === undefined) continue;
    sum[it.dimension] += it.reverse ? min + max - raw : raw;
    n[it.dimension] += 1;
  }
  return Object.fromEntries(
    Object.keys(sum).map((k) => [k, n[k] ? sum[k] / n[k] : 0]),
  );
}

/** Dimensions whose mean is within `band` of the top, best first, capped at 2.
 *  Exact ties are broken by `order` (or by item order when omitted). */
function topWithinBand(
  means: Record<string, number>,
  band: number,
  order?: string[],
): string[] {
  const keys = order ?? Object.keys(means);
  const rank = (k: string) => keys.indexOf(k);
  const sorted = Object.keys(means).sort(
    (a, b) => means[b] - means[a] || rank(a) - rank(b),
  );
  const top = means[sorted[0]];
  return sorted.filter((k) => top - means[k] <= band + EPS).slice(0, 2);
}

function scoreLoveExpression(quiz: Quiz, answers: Answers): QuizScore {
  const means = dimensionMeans(quiz, answers);
  const vals = Object.values(means);
  const spread = Math.max(...vals) - Math.min(...vals);
  const outcomeIds =
    spread < 1.0 - EPS ? ["balanced"] : topWithinBand(means, 0.34);
  return { outcomeIds, scores: roundAll(means) };
}

function scoreAttachment(quiz: Quiz, answers: Answers): QuizScore {
  const m = dimensionMeans(quiz, answers);
  const anxious = m.anxiety >= 4.0 - EPS;
  const avoidant = m.avoidance >= 4.0 - EPS;
  let id = "secure-leaning";
  if (anxious && avoidant) id = "mixed-leaning";
  else if (anxious) id = "anxious-leaning";
  else if (avoidant) id = "avoidant-leaning";
  return { outcomeIds: [id], scores: roundAll(m) };
}

function scoreTriangle(quiz: Quiz, answers: Answers): QuizScore {
  const m = dimensionMeans(quiz, answers);
  const i = m.intimacy >= 4.5 - EPS;
  const p = m.passion >= 4.5 - EPS;
  const c = m.commitment >= 4.5 - EPS;
  const key = `${i ? "I" : ""}${p ? "P" : ""}${c ? "C" : ""}`;
  const byKey: Record<string, string> = {
    "": "nonlove",
    I: "friendship",
    P: "infatuation",
    C: "empty",
    IP: "romantic",
    IC: "companionate",
    PC: "fatuous",
    IPC: "consummate",
  };
  return { outcomeIds: [byKey[key]], scores: roundAll(m) };
}

const HORSEMAN_ORDER = [
  "criticism",
  "defensiveness",
  "stonewalling",
  "contempt",
];

function scoreConflict(quiz: Quiz, answers: Answers): QuizScore {
  const totals: Record<string, number> = {
    criticism: 0,
    contempt: 0,
    defensiveness: 0,
    stonewalling: 0,
    repair: 0,
  };
  for (const it of quiz.items) {
    const opt = it.options?.[answers[it.id]];
    if (!opt) continue;
    for (const [dim, pts] of Object.entries(opt.scores)) {
      totals[dim] = (totals[dim] ?? 0) + pts;
    }
  }
  let outcomeIds: string[];
  if (totals.repair >= 7) {
    outcomeIds = ["repair"];
  } else {
    const max = Math.max(...HORSEMAN_ORDER.map((k) => totals[k]));
    outcomeIds = HORSEMAN_ORDER.filter((k) => totals[k] === max).slice(0, 2);
  }
  return { outcomeIds, scores: totals };
}

const LOVE_STYLE_ORDER = [
  "eros",
  "storge",
  "agape",
  "pragma",
  "mania",
  "ludus",
];

function scoreLoveStyles(quiz: Quiz, answers: Answers): QuizScore {
  const means = dimensionMeans(quiz, answers);
  return {
    outcomeIds: topWithinBand(means, 0.34, LOVE_STYLE_ORDER),
    scores: roundAll(means),
  };
}

function scoreLoveMap(_quiz: Quiz, answers: Answers): QuizScore {
  const ratings = Object.values(answers).filter(
    (v) => Number.isFinite(v) && v >= 1 && v <= 5,
  );
  if (!ratings.length) {
    return { outcomeIds: ["curious"], scores: { confidence: 0, rated: 0 } };
  }
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  let id = "well-mapped";
  if (mean < 2.5 - EPS) id = "curious";
  else if (mean < 4.0 - EPS) id = "growing";
  return {
    outcomeIds: [id],
    scores: { confidence: round2(mean), rated: ratings.length },
  };
}

const SCORERS: Record<string, (q: Quiz, a: Answers) => QuizScore> = {
  "love-expression": scoreLoveExpression,
  "attachment-style": scoreAttachment,
  "love-map": scoreLoveMap,
  triangle: scoreTriangle,
  "conflict-horsemen": scoreConflict,
  "love-styles": scoreLoveStyles,
};

export function scoreQuiz(quiz: Quiz, answers: Answers): QuizScore {
  const scorer = SCORERS[quiz.id];
  if (!scorer) throw new Error(`No scorer for quiz "${quiz.id}"`);
  return scorer(quiz, answers);
}
