import { describe, expect, it } from "vitest";
import quizzesJson from "../content/quizzes.json";
import { insightForDate, insights, type Quiz } from "./content";
import { type Answers, isComplete, normalise, scoreQuiz } from "./quiz";

const quizzes = quizzesJson as unknown as Quiz[];
const get = (id: string) => {
  const q = quizzes.find((x) => x.id === id);
  if (!q) throw new Error(id);
  return q;
};

/** Answer every item with `f(item)`. */
const fill = (q: Quiz, f: (it: Quiz["items"][number]) => number): Answers =>
  Object.fromEntries(q.items.map((it) => [it.id, f(it)]));
const all = (q: Quiz, v: number) => fill(q, () => v);
const byDim = (q: Quiz, m: Record<string, number>, rest: number) =>
  fill(q, (it) => m[it.dimension] ?? rest);

describe("love-expression", () => {
  const q = get("love-expression");
  it("all-min and all-max are balanced", () => {
    expect(scoreQuiz(q, all(q, 1)).outcomeIds).toEqual(["balanced"]);
    expect(scoreQuiz(q, all(q, 7)).outcomeIds).toEqual(["balanced"]);
  });
  it("one clear top dimension", () => {
    const r = scoreQuiz(q, byDim(q, { words: 7 }, 3));
    expect(r.outcomeIds).toEqual(["words"]);
    expect(r.scores.words).toBe(7);
  });
  it("two close top dimensions, capped at two", () => {
    expect(
      scoreQuiz(q, byDim(q, { touch: 7, time: 7, gifts: 7 }, 2)).outcomeIds,
    ).toEqual(["time", "gifts"]);
  });
  it("spread just under 1.0 is balanced", () => {
    // words mean 3.67 (7+2+2... use 4,4,3) vs others 3 -> spread 0.67
    const a = byDim(q, {}, 3);
    a.awords1 = 4;
    a.awords2 = 4;
    expect(scoreQuiz(q, a).outcomeIds).toEqual(["balanced"]);
  });
});

describe("attachment-style", () => {
  const q = get("attachment-style");
  it("all-min is secure-leaning (reverse items score high)", () => {
    expect(scoreQuiz(q, all(q, 1)).outcomeIds).toEqual(["secure-leaning"]);
  });
  it("all-max is mixed-leaning", () => {
    const r = scoreQuiz(q, all(q, 7));
    expect(r.outcomeIds).toEqual(["mixed-leaning"]);
    expect(r.scores.anxiety).toBe(5);
  });
  it("high anxiety, low avoidance", () => {
    const a = fill(q, (it) =>
      it.dimension === "anxiety" ? (it.reverse ? 1 : 7) : it.reverse ? 7 : 1,
    );
    const r = scoreQuiz(q, a);
    expect(r.outcomeIds).toEqual(["anxious-leaning"]);
    expect(r.scores).toEqual({ anxiety: 7, avoidance: 1 });
  });
  it("high avoidance, low anxiety", () => {
    const a = fill(q, (it) =>
      it.dimension === "avoidance" ? (it.reverse ? 1 : 7) : it.reverse ? 7 : 1,
    );
    expect(scoreQuiz(q, a).outcomeIds).toEqual(["avoidant-leaning"]);
  });
  it("4.0 exactly counts as higher", () => {
    expect(scoreQuiz(q, all(q, 4)).outcomeIds).toEqual(["mixed-leaning"]);
  });
});

describe("triangle", () => {
  const q = get("triangle");
  it("all-min is nonlove, all-max consummate", () => {
    expect(scoreQuiz(q, all(q, 1)).outcomeIds).toEqual(["nonlove"]);
    expect(scoreQuiz(q, all(q, 7)).outcomeIds).toEqual(["consummate"]);
  });
  it("intimacy + commitment is companionate", () => {
    const r = scoreQuiz(q, byDim(q, { intimacy: 7, commitment: 6 }, 2));
    expect(r.outcomeIds).toEqual(["companionate"]);
  });
  it("passion alone is infatuation; 4.5 is present", () => {
    expect(scoreQuiz(q, byDim(q, { passion: 6 }, 2)).outcomeIds).toEqual([
      "infatuation",
    ]);
    const a = byDim(q, {}, 1);
    for (const it of q.items) if (it.dimension === "commitment") a[it.id] = 4;
    a.dcommitment1 = 5;
    a.dcommitment2 = 5; // mean (5+5+4+4)/4 = 4.5
    expect(scoreQuiz(q, a).outcomeIds).toEqual(["empty"]);
  });
});

describe("conflict-horsemen", () => {
  const q = get("conflict-horsemen");
  const pick = (dim: string) =>
    fill(q, (it) =>
      Math.max(
        0,
        (it.options ?? []).findIndex((o) => o.scores[dim] === 1),
      ),
    );
  it("always first option: criticism and contempt tie, shown in order", () => {
    const r = scoreQuiz(q, all(q, 0));
    expect(r.outcomeIds).toEqual(["criticism", "contempt"]);
    expect(Object.values(r.scores).reduce((a, b) => a + b, 0)).toBe(12);
  });
  it("always last option: criticism leads", () => {
    expect(scoreQuiz(q, all(q, 4)).outcomeIds).toEqual(["criticism"]);
  });
  it("repair >= 7 wins", () => {
    const r = scoreQuiz(q, pick("repair"));
    expect(r.outcomeIds).toEqual(["repair"]);
    expect(r.scores.repair).toBe(12);
  });
  it("single top horseman", () => {
    expect(scoreQuiz(q, pick("defensiveness")).outcomeIds).toEqual([
      "defensiveness",
    ]);
  });
  it("completeness requires valid option indexes", () => {
    expect(isComplete(q, all(q, 0))).toBe(true);
    expect(isComplete(q, all(q, 9))).toBe(false);
  });
});

describe("love-styles", () => {
  const q = get("love-styles");
  it("all-min and all-max tie everywhere: first two by tie order", () => {
    expect(scoreQuiz(q, all(q, 1)).outcomeIds).toEqual(["eros", "storge"]);
    expect(scoreQuiz(q, all(q, 7)).outcomeIds).toEqual(["eros", "storge"]);
  });
  it("one clear top style", () => {
    expect(scoreQuiz(q, byDim(q, { agape: 7 }, 3)).outcomeIds).toEqual([
      "agape",
    ]);
  });
  it("highest mean first when two are close", () => {
    const a = byDim(q, { ludus: 7 }, 2);
    a.fmania1 = 7;
    a.fmania2 = 7;
    a.fmania3 = 6; // mania mean 6.67 vs ludus 7 (within 0.34)
    expect(scoreQuiz(q, a).outcomeIds).toEqual(["ludus", "mania"]);
  });
});

describe("love-map", () => {
  const q = get("love-map");
  it("confidence bands", () => {
    expect(scoreQuiz(q, all(q, 1)).outcomeIds).toEqual(["curious"]);
    expect(scoreQuiz(q, all(q, 3)).outcomeIds).toEqual(["growing"]);
    expect(scoreQuiz(q, all(q, 5)).outcomeIds).toEqual(["well-mapped"]);
  });
  it("skips unrated prompts and handles none", () => {
    expect(scoreQuiz(q, { c1: 5, c2: 4 }).outcomeIds).toEqual(["well-mapped"]);
    const none = scoreQuiz(q, {});
    expect(none.outcomeIds).toEqual(["curious"]);
    expect(none.scores.rated).toBe(0);
  });
});

describe("helpers", () => {
  it("every outcome id the engine can return exists in the JSON", () => {
    for (const q of quizzes) {
      const ids = new Set(q.results.outcomes.map((o) => o.id));
      expect(ids.size).toBe(q.results.outcomes.length);
    }
  });
  it("normalise clamps", () => {
    expect(normalise(7, { key: "a", label: "a", min: 1, max: 7 })).toBe(1);
    expect(normalise(0, { key: "a", label: "a", min: 1, max: 7 })).toBe(0);
  });
});

describe("daily insight", () => {
  it("is stable within a local day and rotates daily", () => {
    const a = insightForDate(new Date(2025, 9, 15, 0, 5));
    const b = insightForDate(new Date(2025, 9, 15, 23, 55));
    const c = insightForDate(new Date(2025, 9, 16, 12));
    expect(a.id).toBe(b.id);
    expect(c.id).not.toBe(a.id);
  });
  it("covers all insights over 60 days", () => {
    const ids = new Set<string>();
    for (let d = 1; d <= insights.length; d++)
      ids.add(insightForDate(new Date(2025, 0, d)).id);
    expect(ids.size).toBe(insights.length);
  });
});
