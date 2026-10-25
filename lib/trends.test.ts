import { describe, expect, it } from "vitest";
import {
  approxTime,
  beatsOnDay,
  clockSummary,
  formatAvg,
  formatGap,
  latestNotes,
  monthMarkers,
  niceTicks,
  peakHour,
  sliceWindow,
  sqrtRadius,
  wedgePath,
  xAxisInterval,
} from "./trends";

const b = (at: number, note?: string) => ({ at, minutes: 1, note });

describe("sliceWindow / beatsOnDay", () => {
  const beats = [b(10), b(20), b(30), b(40)];
  it("slices half-open", () => {
    expect(sliceWindow(beats, 20, 40).map((x) => x.at)).toEqual([20, 30]);
    expect(sliceWindow(beats, 100, 200)).toEqual([]);
    expect(sliceWindow([], 0, 10)).toEqual([]);
  });
  it("finds a local day", () => {
    const d = new Date(2025, 9, 15, 12).getTime();
    const all = [
      b(new Date(2025, 9, 14, 23, 59).getTime()),
      b(new Date(2025, 9, 15, 0, 1).getTime()),
      b(new Date(2025, 9, 15, 23, 59).getTime()),
      b(new Date(2025, 9, 16, 0, 0).getTime()),
    ];
    expect(beatsOnDay(all, d)).toHaveLength(2);
  });
});

describe("latestNotes", () => {
  it("returns newest first, skips blanks, respects limit", () => {
    const l = [b(1, "a"), b(2), b(3, "  "), b(4, "d"), b(5, "e")];
    expect(latestNotes(l, 2).map((x) => x.at)).toEqual([5, 4]);
    expect(latestNotes(l).map((x) => x.at)).toEqual([5, 4, 1]);
  });
});

describe("formatGap", () => {
  it("humanises", () => {
    expect(formatGap(0)).toBe("—");
    expect(formatGap(Number.NaN)).toBe("—");
    expect(formatGap((2 * 1440 + 4 * 60) * 60_000)).toBe("2 days 4 h");
    expect(formatGap(1440 * 60_000)).toBe("1 day");
    expect(formatGap(310 * 60_000)).toBe("5 h 10 min");
    expect(formatGap(12 * 60_000)).toBe("12 min");
  });
});

describe("niceTicks", () => {
  it("always starts at 0, covers max, 3–4 ticks", () => {
    for (const m of [0, 1, 2, 3, 4, 7, 10, 23, 99, 480, 1234]) {
      const { ticks, top } = niceTicks(m);
      expect(ticks[0]).toBe(0);
      expect(top).toBeGreaterThanOrEqual(m);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks.length).toBeLessThanOrEqual(4);
      expect(ticks.every(Number.isInteger)).toBe(true);
    }
    expect(niceTicks(Number.NaN).top).toBe(1);
  });
});

describe("misc formatting", () => {
  it("xAxisInterval thins dense ranges", () => {
    expect(xAxisInterval("W")).toBe(0);
    expect(xAxisInterval("M")).toBeGreaterThan(0);
  });
  it("approxTime", () => {
    expect(approxTime(0)).toBe("No time logged yet");
    expect(approxTime(14.2, "a day")).toBe("≈ 14 min a day");
  });
  it("formatAvg", () => {
    expect(formatAvg(0)).toBe("0");
    expect(formatAvg(Number.NaN)).toBe("0");
    expect(formatAvg(2.0)).toBe("2");
    expect(formatAvg(2.46)).toBe("2.5");
    expect(formatAvg(12.6)).toBe("13");
  });
});

describe("clock helpers", () => {
  const hist = new Array(24).fill(0);
  it("peakHour null when empty", () => {
    expect(peakHour(hist)).toBeNull();
    expect(clockSummary(hist)).toMatch(/appears/);
  });
  it("summarises the peak", () => {
    hist[21] = 5;
    hist[9] = 2;
    expect(peakHour(hist)).toBe(21);
    expect(clockSummary(hist)).toContain("9 PM");
  });
  it("sqrtRadius scales by sqrt", () => {
    expect(sqrtRadius(0, 10, 5, 25)).toBe(5);
    expect(sqrtRadius(10, 10, 5, 25)).toBe(25);
    expect(sqrtRadius(2.5, 10, 0, 10)).toBeCloseTo(5);
    expect(sqrtRadius(3, 0, 5, 25)).toBe(5);
  });
  it("wedgePath is finite and closed", () => {
    for (let h = 0; h < 24; h++) {
      const p = wedgePath(100, 100, 10, 50, h);
      expect(p).not.toMatch(/NaN/);
      expect(p.endsWith("Z")).toBe(true);
    }
  });
});

describe("monthMarkers", () => {
  it("labels month changes, skipping crowded ones", () => {
    const wk = (m: number, d: number) => new Date(2025, m, d).getTime();
    const cols = [wk(8, 29), wk(9, 6), wk(9, 13), wk(9, 20), wk(10, 3)];
    const m = monthMarkers(cols);
    expect(m.map((x) => x.label)).toEqual(["Oct", "Nov"]);
  });
});
