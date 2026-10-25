// Pure analytics over beats. All math is in local time; weeks start Monday.
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  getDay,
  getHours,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export interface BeatLike {
  at: number;
  minutes: number;
}

export type Range = "D" | "W" | "M" | "6M" | "Y";

export interface Bucket {
  /** Start of bucket, epoch ms. */
  start: number;
  label: string;
  count: number;
  minutes: number;
}

export interface RangeSummary {
  range: Range;
  start: number;
  end: number;
  buckets: Bucket[];
  total: number;
  totalMinutes: number;
  /** Average beats per day over the days elapsed in the range (not the full length). */
  avgPerDay: number;
  avgMinutesPerDay: number;
  /** Average per bucket, for the dashed reference line. */
  avgPerBucket: number;
  title: string;
}

const WEEK = { weekStartsOn: 1 as const };

/** Monday=0 … Sunday=6. */
export function weekdayIndex(d: Date | number) {
  return (getDay(d) + 6) % 7;
}

function sum(beats: BeatLike[]) {
  let count = 0;
  let minutes = 0;
  for (const b of beats) {
    count++;
    minutes += b.minutes;
  }
  return { count, minutes };
}

export function rangeBounds(range: Range, now: number, offset = 0) {
  const n = new Date(now);
  switch (range) {
    case "D": {
      const s = addDays(startOfDay(n), offset);
      return { start: s.getTime(), end: addDays(s, 1).getTime() };
    }
    case "W": {
      const s = addWeeks(startOfWeek(n, WEEK), offset);
      return { start: s.getTime(), end: addWeeks(s, 1).getTime() };
    }
    case "M": {
      const s = addMonths(startOfMonth(n), offset);
      return { start: s.getTime(), end: addMonths(s, 1).getTime() };
    }
    case "6M": {
      // Six whole months ending with the current month.
      const s = addMonths(startOfMonth(n), offset * 6 - 5);
      return { start: s.getTime(), end: addMonths(s, 6).getTime() };
    }
    case "Y": {
      const s = addMonths(startOfMonth(n), offset * 12 - 11);
      return { start: s.getTime(), end: addMonths(s, 12).getTime() };
    }
  }
}

function bucketStarts(range: Range, start: number, end: number): number[] {
  const out: number[] = [];
  let d = new Date(start);
  const step =
    range === "D"
      ? // Real elapsed hours: DST days get 23 or 25 buckets, none merged.
        (x: Date) => new Date(x.getTime() + 3600_000)
      : range === "W" || range === "M"
        ? (x: Date) => addDays(x, 1)
        : range === "6M"
          ? (x: Date) => addWeeks(x, 1)
          : (x: Date) => addMonths(x, 1);
  if (range === "6M") d = startOfWeek(d, WEEK);
  while (d.getTime() < end) {
    out.push(d.getTime());
    d = step(d);
  }
  return out;
}

function bucketLabel(range: Range, start: number) {
  switch (range) {
    case "D":
      return format(start, "H");
    case "W":
      return format(start, "EEEEE");
    case "M":
      return format(start, "d");
    case "6M":
      return format(start, "MMM d");
    case "Y":
      return format(start, "MMMMM");
  }
}

function rangeTitle(range: Range, start: number, end: number) {
  const last = end - 1;
  switch (range) {
    case "D":
      return format(start, "EEEE, d MMM yyyy");
    case "W":
    case "6M":
    case "Y":
      return `${format(start, "d MMM")} – ${format(last, "d MMM yyyy")}`;
    case "M":
      return format(start, "MMMM yyyy");
  }
}

/** Sorted ascending by `at` is assumed for speed but not required. */
export function summarize(
  beats: BeatLike[],
  range: Range,
  now: number,
  offset = 0,
): RangeSummary {
  const { start, end } = rangeBounds(range, now, offset);
  const starts = bucketStarts(range, start, end);
  const buckets: Bucket[] = starts.map((s) => ({
    start: s,
    label: bucketLabel(range, s),
    count: 0,
    minutes: 0,
  }));
  let total = 0;
  let totalMinutes = 0;
  for (const b of beats) {
    if (b.at < start || b.at >= end) continue;
    total++;
    totalMinutes += b.minutes;
    // Binary search the bucket.
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= b.at) lo = mid;
      else hi = mid - 1;
    }
    buckets[lo].count++;
    buckets[lo].minutes += b.minutes;
  }
  // Days elapsed: whole range if past, up to and including today if current.
  const effectiveEnd = Math.min(end, startOfDay(now).getTime() + 86_400_000);
  const days = Math.max(
    1,
    differenceInCalendarDays(effectiveEnd - 1, start) + 1,
  );
  const elapsedBuckets = Math.max(
    1,
    buckets.filter((b) => b.start <= now).length,
  );
  return {
    range,
    start,
    end,
    buckets,
    total,
    totalMinutes,
    avgPerDay: range === "D" ? total : total / days,
    avgMinutesPerDay: range === "D" ? totalMinutes : totalMinutes / days,
    avgPerBucket: total / elapsedBuckets,
    title: rangeTitle(range, start, end),
  };
}

export function dayTotals(beats: BeatLike[], day: number) {
  const s = startOfDay(day).getTime();
  const e = addDays(s, 1).getTime();
  return sum(beats.filter((b) => b.at >= s && b.at < e));
}

/** Counts per local hour 0–23. */
export function hourHistogram(beats: BeatLike[]) {
  const h = new Array<number>(24).fill(0);
  for (const b of beats) h[getHours(b.at)]++;
  return h;
}

/** grid[weekday Mon=0][hour]. */
export function weekdayHourGrid(beats: BeatLike[]) {
  const g = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const b of beats) g[weekdayIndex(b.at)][getHours(b.at)]++;
  return g;
}

export function weekdayTotals(beats: BeatLike[]) {
  const w = new Array<number>(7).fill(0);
  for (const b of beats) w[weekdayIndex(b.at)]++;
  return w;
}

export interface HeatCell {
  day: number;
  count: number;
  /** 0 = none, 1–4 = intensity quartiles of non-zero days. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** Columns are weeks (oldest first), rows Mon–Sun. */
export function heatmap(
  beats: BeatLike[],
  now: number,
  weeks = 26,
): HeatCell[][] {
  const first = addWeeks(startOfWeek(now, WEEK), -(weeks - 1)).getTime();
  const counts = new Map<number, number>();
  for (const b of beats) {
    if (b.at < first) continue;
    const k = startOfDay(b.at).getTime();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const nonZero = [...counts.values()].sort((a, b) => a - b);
  const q = (p: number) =>
    nonZero.length ? nonZero[Math.floor((nonZero.length - 1) * p)] : 0;
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  const today = startOfDay(now).getTime();
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(first, w * 7 + d).getTime();
      const count = counts.get(day) ?? 0;
      const level: HeatCell["level"] =
        count === 0
          ? 0
          : count <= t1
            ? 1
            : count <= t2
              ? 2
              : count <= t3
                ? 3
                : 4;
      col.push({ day, count, level, future: day > today });
    }
    cols.push(col);
  }
  return cols;
}

/** Longest stretch between consecutive beats, in ms, with its endpoints. */
export function longestGap(beats: BeatLike[]) {
  const sorted = beats.map((b) => b.at).sort((a, b) => a - b);
  let best = { ms: 0, from: 0, to: 0 };
  for (let i = 1; i < sorted.length; i++) {
    const ms = sorted[i] - sorted[i - 1];
    if (ms > best.ms) best = { ms, from: sorted[i - 1], to: sorted[i] };
  }
  return best;
}

/** Days in the last `n` days (including today) with at least one beat. */
export function activeDays(beats: BeatLike[], now: number, n = 14) {
  const from = addDays(startOfDay(now), -(n - 1)).getTime();
  const days = new Set<number>();
  for (const b of beats)
    if (b.at >= from && b.at <= now) days.add(startOfDay(b.at).getTime());
  return { active: days.size, of: n };
}

/** Percent change; null when there's no baseline. */
export function pctChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type HighlightTone = "up" | "down" | "neutral";
export interface Highlight {
  id: string;
  title: string;
  body: string;
  tone: HighlightTone;
}

function hourLabel(h: number) {
  const d = new Date(2000, 0, 1, h);
  return format(d, "h a");
}

function partOfDay(h: number) {
  if (h < 5) return "late at night";
  if (h < 12) return "in the morning";
  if (h < 17) return "in the afternoon";
  if (h < 21) return "in the evening";
  return "at night";
}

/**
 * Plain-English, never-judgemental highlights. Each needs enough data to say
 * something honest; otherwise it is left out.
 */
export function highlights(
  beats: BeatLike[],
  now: number,
  partner: string,
): Highlight[] {
  const name = partner.trim() || "them";
  const out: Highlight[] = [];
  // Compare like with like: this week so far vs last week up to this same
  // moment (same weekday and time), so mornings aren't measured against a
  // full day.
  const weekStart = startOfWeek(now, WEEK).getTime();
  const lastStart = addWeeks(weekStart, -1).getTime();
  const lastCut = addWeeks(now, -1).getTime();
  let thisSpan = 0;
  let lastSameSpan = 0;
  for (const b of beats) {
    if (b.at >= weekStart && b.at <= now) thisSpan++;
    else if (b.at >= lastStart && b.at <= lastCut) lastSameSpan++;
  }
  if (lastSameSpan >= 3 || thisSpan >= 3) {
    const diff = thisSpan - lastSameSpan;
    if (diff === 0) {
      out.push({
        id: "wow",
        title: "Steady as ever",
        body: `You've thought of ${name} as often this week as at this point last week.`,
        tone: "neutral",
      });
    } else {
      const n = Math.abs(diff);
      out.push({
        id: "wow",
        title: diff > 0 ? "More on your mind" : "A quieter week",
        body:
          diff > 0
            ? `${name} has crossed your mind ${n} more ${n === 1 ? "time" : "times"} this week than by this point last week.`
            : `${n} fewer ${n === 1 ? "beat" : "beats"} than by this point last week. Every beat still counts.`,
        tone: diff > 0 ? "up" : "neutral",
      });
    }
  }

  if (beats.length >= 10) {
    const hist = hourHistogram(beats);
    let peak = 0;
    for (let h = 1; h < 24; h++) if (hist[h] > hist[peak]) peak = h;
    out.push({
      id: "peak-hour",
      title: "Your most thoughtful hour",
      body: `You think of ${name} most around ${hourLabel(peak)}, usually ${partOfDay(peak)}.`,
      tone: "neutral",
    });

    const wd = weekdayTotals(beats);
    let top = 0;
    for (let d = 1; d < 7; d++) if (wd[d] > wd[top]) top = d;
    const names = [
      "Mondays",
      "Tuesdays",
      "Wednesdays",
      "Thursdays",
      "Fridays",
      "Saturdays",
      "Sundays",
    ];
    out.push({
      id: "peak-day",
      title: "Your most thoughtful day",
      body: `${names[top]} bring the most thoughts of ${name}.`,
      tone: "neutral",
    });
  }

  const ad = activeDays(beats, now, 14);
  if (ad.active >= 3) {
    out.push({
      id: "active",
      title: "Days with a beat",
      body: `${name} was on your mind on ${ad.active} of the last ${ad.of} days.`,
      tone: "up",
    });
  }

  const totalMin = beats.reduce((a, b) => a + b.minutes, 0);
  if (totalMin >= 60) {
    const hours = totalMin / 60;
    out.push({
      id: "lifetime",
      title: "Time well spent",
      body: `About ${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hours of thinking about ${name}, all told.`,
      tone: "up",
    });
  }
  return out;
}

export function formatMinutes(min: number) {
  if (min < 60) return { value: `${Math.round(min)}`, unit: "min" };
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return { value: m ? `${h}h ${m}` : `${h}`, unit: m ? "min" : "hr" };
}
