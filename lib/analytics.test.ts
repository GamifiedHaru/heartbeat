import { describe, expect, it } from "vitest";
import {
  activeDays,
  heatmap,
  highlights,
  hourHistogram,
  longestGap,
  pctChange,
  summarize,
  weekdayHourGrid,
} from "./analytics";

// Wednesday 15 Oct 2025, 14:30 local.
const NOW = new Date(2025, 9, 15, 14, 30).getTime();
const at = (d: number, h: number, m = 0) =>
  new Date(2025, 9, d, h, m).getTime();
const beat = (t: number, minutes = 1) => ({ at: t, minutes });

describe("summarize", () => {
  it("handles no data without NaN", () => {
    for (const r of ["D", "W", "M", "6M", "Y"] as const) {
      const s = summarize([], r, NOW);
      expect(s.total).toBe(0);
      expect(Number.isFinite(s.avgPerDay)).toBe(true);
      expect(Number.isFinite(s.avgPerBucket)).toBe(true);
    }
  });

  it("buckets a day by local hour", () => {
    const s = summarize(
      [beat(at(15, 0, 5)), beat(at(15, 9)), beat(at(15, 9, 59))],
      "D",
      NOW,
    );
    expect(s.buckets).toHaveLength(24);
    expect(s.buckets[0].count).toBe(1);
    expect(s.buckets[9].count).toBe(2);
    expect(s.total).toBe(3);
  });

  it("week starts Monday and averages over days elapsed", () => {
    // Mon 13, Tue 14, Wed 15 elapsed; Sun 12 belongs to previous week.
    const beats = [
      beat(at(12, 10)),
      beat(at(13, 10)),
      beat(at(14, 10)),
      beat(at(15, 10), 5),
    ];
    const s = summarize(beats, "W", NOW);
    expect(s.buckets).toHaveLength(7);
    expect(s.buckets[0].label).toBe("M");
    expect(s.total).toBe(3);
    expect(s.totalMinutes).toBe(7);
    expect(s.avgPerDay).toBeCloseTo(1);
  });

  it("previous week via offset", () => {
    const s = summarize([beat(at(12, 10)), beat(at(6, 0))], "W", NOW, -1);
    expect(s.total).toBe(2);
    expect(s.avgPerDay).toBeCloseTo(2 / 7);
  });

  it("month has a bucket per day", () => {
    expect(summarize([], "M", NOW).buckets).toHaveLength(31);
  });

  it("year has 12 monthly buckets ending this month", () => {
    const s = summarize([beat(at(1, 1))], "Y", NOW);
    expect(s.buckets).toHaveLength(12);
    expect(s.buckets[11].count).toBe(1);
  });
});

describe("distributions", () => {
  it("hour histogram and weekday grid", () => {
    const beats = [beat(at(13, 8)), beat(at(13, 8, 30)), beat(at(19, 23))];
    const h = hourHistogram(beats);
    expect(h[8]).toBe(2);
    expect(h[23]).toBe(1);
    const g = weekdayHourGrid(beats);
    expect(g[0][8]).toBe(2); // Monday
    expect(g[6][23]).toBe(1); // Sunday
  });

  it("longest gap", () => {
    const g = longestGap([beat(at(1, 0)), beat(at(1, 1)), beat(at(1, 5))]);
    expect(g.ms).toBe(4 * 3600_000);
    expect(longestGap([]).ms).toBe(0);
  });

  it("active days", () => {
    expect(
      activeDays([beat(at(15, 1)), beat(at(15, 2)), beat(at(10, 2))], NOW, 14)
        .active,
    ).toBe(2);
  });

  it("pct change guards zero baseline", () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
  });
});

describe("heatmap", () => {
  it("is weeks × 7 with future cells flagged", () => {
    const h = heatmap([beat(at(15, 1))], NOW, 4);
    expect(h).toHaveLength(4);
    expect(h[3]).toHaveLength(7);
    expect(h[3][2].count).toBe(1); // Wednesday of current week
    expect(h[3][2].level).toBeGreaterThan(0);
    expect(h[3][3].future).toBe(true);
  });
});

describe("highlights", () => {
  it("says nothing with too little data", () => {
    expect(highlights([beat(at(15, 1))], NOW, "Sam")).toEqual([]);
  });

  it("never uses shaming words", () => {
    const beats = Array.from({ length: 30 }, (_, i) =>
      beat(at(1 + (i % 10), 8 + (i % 5)), 3),
    );
    const text = highlights(beats, NOW, "Sam")
      .map((h) => h.body + h.title)
      .join(" ")
      .toLowerCase();
    expect(text).not.toMatch(/only|failed|missed|should/);
  });
});

describe("performance", () => {
  it("summarizes 50k beats quickly", () => {
    const beats = Array.from({ length: 50_000 }, (_, i) =>
      beat(NOW - i * 600_000),
    );
    const t = performance.now();
    for (const r of ["D", "W", "M", "6M", "Y"] as const)
      summarize(beats, r, NOW);
    heatmap(beats, NOW);
    expect(performance.now() - t).toBeLessThan(500);
  });
});

describe("week-over-week fairness", () => {
  it("compares against last week only up to the same moment", () => {
    // Monday 13 Oct 2025, 09:00. Last Monday (6 Oct): 4 beats before 9am, 4 after.
    const mon9 = new Date(2025, 9, 13, 9).getTime();
    const beats = [
      ...[6, 7, 8, 8].map((h) => beat(new Date(2025, 9, 6, h).getTime())),
      ...[12, 15, 18, 21].map((h) => beat(new Date(2025, 9, 6, h).getTime())),
      beat(new Date(2025, 9, 13, 8).getTime()),
    ];
    const wow = highlights(beats, mon9, "Sam").find((h) => h.id === "wow");
    expect(wow?.body).toMatch(/^3 fewer/);
  });
});
