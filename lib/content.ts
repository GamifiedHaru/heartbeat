// Typed loaders for the static Learn content. Insights are small and may be
// imported anywhere; quizzes are ~60 KB, so they load lazily (Learn tab only).
import insightsJson from "../content/insights.json";

export interface Insight {
  id: string;
  title: string;
  body: string;
  try: string;
  concept: string;
  /** Short citation shown on the card. */
  source: string;
  url: string;
}

export interface QuizSource {
  cite: string;
  url: string;
}

export interface QuizOption {
  text: string;
  /** Each option adds to exactly one dimension. */
  scores: Record<string, number>;
}

export interface QuizItem {
  id: string;
  text: string;
  dimension: string;
  reverse: boolean;
  /** Choice items only. */
  options?: QuizOption[];
}

export interface QuizOutcome {
  id: string;
  title: string;
  summary: string;
  strengths: string[];
  growth: string[];
  tryThisWeek: string;
}

export type QuizScale =
  | { type: "likert"; min: number; max: number; labels: string[] }
  | { type: "choice" }
  | {
      type: "open";
      selfRating: {
        min: number;
        max: number;
        labels: string[];
        question: string;
      };
      note: string;
    };

export interface Quiz {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  caveat: string;
  concept: string;
  sources: QuizSource[];
  scale: QuizScale;
  items: QuizItem[];
  results: { method: string; outcomes: QuizOutcome[] };
}

export const insights: readonly Insight[] = insightsJson as Insight[];

/** Whole days since the epoch for the *local* calendar date of `d`. */
export function localDayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000,
  );
}

/** Same insight all day (local time), rotating through the whole deck. */
export function insightForDate(
  d: Date,
  list: readonly Insight[] = insights,
  /** When the user started; their first day shows the first card. */
  since?: number,
): Insight {
  const n = list.length;
  const start = since ? localDayNumber(new Date(since)) : 0;
  const i = localDayNumber(d) - start;
  return list[((i % n) + n) % n];
}

let quizCache: Promise<Quiz[]> | undefined;

/** Lazily loads the quizzes (separate chunk, cached after the first call). */
export function loadQuizzes(): Promise<Quiz[]> {
  quizCache ??= import("../content/quizzes.json").then(
    (m) => (m.default ?? m) as unknown as Quiz[],
  );
  return quizCache;
}
