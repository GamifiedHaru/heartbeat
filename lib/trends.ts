// Extra pure helpers for the Trends tab. Local time, weeks start Monday.
import { addDays, format, startOfDay } from "date-fns";
import { type BeatLike, formatMinutes, type Range } from "./analytics";

/** Beats with `start <= at < end`. Input must be sorted ascending by `at`. */
export function sliceWindow<T extends BeatLike>(
  sorted: T[],
  start: number,
  end: number,
): T[] {
  const lower = (t: number) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].at < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return sorted.slice(lower(start), lower(end));
}

/** Beats on the local day containing `day`, ascending. */
export function beatsOnDay<T extends BeatLike>(sorted: T[], day: number): T[] {
  const s = startOfDay(day).getTime();
  return sliceWindow(sorted, s, addDays(s, 1).getTime());
}

/** Latest `limit` beats that carry a non-empty note, newest first. */
export function latestNotes<T extends BeatLike & { note?: string }>(
  sorted: T[],
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const out: T[] = [];
  for (let i = sorted.length - 1; i >= 0 && out.length < limit; i--) {
    if (sorted[i].note?.trim()) out.push(sorted[i]);
  }
  return out;
}

/** "2 days 4 h", "5 h 10 min", "12 min"; "—" when there is no gap. */
export function formatGap(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return "under a minute";
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const dayStr = `${days} ${days === 1 ? "day" : "days"}`;
  if (days > 0) return hours ? `${dayStr} ${hours} h` : dayStr;
  if (hours > 0) return mins ? `${hours} h ${mins} min` : `${hours} h`;
  return `${mins} min`;
}

/** 3–4 integer y ticks starting at 0 and a domain top that covers `max`. */
export function niceTicks(max: number): { ticks: number[]; top: number } {
  const m = Math.max(1, Math.ceil(Number.isFinite(max) ? max : 1));
  if (m <= 3)
    return { ticks: Array.from({ length: m + 1 }, (_, i) => i), top: m };
  const raw = m / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s * 3 >= m) ?? raw;
  const stepInt = Math.max(1, Math.ceil(step));
  return {
    ticks: [0, stepInt, stepInt * 2, stepInt * 3],
    top: stepInt * 3,
  };
}

/** Recharts XAxis `interval` (labels skipped between shown ones). */
export function xAxisInterval(range: Range): number {
  switch (range) {
    case "D":
      return 5; // 0, 6, 12, 18
    case "W":
      return 0;
    case "M":
      return 4; // 1, 6, 11 …
    case "6M":
      return 3;
    case "Y":
      return 0;
  }
}

/** Approximate-time line, e.g. "≈ 14 min a day". */
export function approxTime(minutes: number, suffix = ""): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "No time logged yet";
  const f = formatMinutes(minutes);
  return `≈ ${f.value} ${f.unit}${suffix ? ` ${suffix}` : ""}`;
}

/** 1 decimal below 10, whole above; never NaN. */
export function formatAvg(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return n >= 10 ? `${Math.round(n)}` : n.toFixed(1).replace(/\.0$/, "");
}

export function peakHour(hist: number[]): number | null {
  let best = 0;
  let idx: number | null = null;
  for (let h = 0; h < hist.length; h++) {
    if (hist[h] > best) {
      best = hist[h];
      idx = h;
    }
  }
  return idx;
}

function partOfDayPhrase(h: number): string {
  if (h < 5) return "late at night";
  if (h < 12) return "in the morning";
  if (h < 17) return "in the afternoon";
  if (h < 21) return "in the evening";
  return "at night";
}

/** One-line summary of when the thoughts happen. */
export function clockSummary(hist: number[]): string {
  const p = peakHour(hist);
  if (p === null) return "Your daily rhythm appears once you log a few beats.";
  const label = format(new Date(2000, 0, 1, p), "h a");
  return `Most thoughts land around ${label}, ${partOfDayPhrase(p)}.`;
}

/** Radius for a wedge using a sqrt scale (area ∝ count). */
export function sqrtRadius(
  count: number,
  max: number,
  rMin: number,
  rMax: number,
): number {
  if (count <= 0 || max <= 0) return rMin;
  return rMin + (rMax - rMin) * Math.sqrt(Math.min(1, count / max));
}

/**
 * SVG path of an annular wedge for hour `h` (0 = top, clockwise), with a small
 * angular gap so neighbours do not touch.
 */
export function wedgePath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  h: number,
  gap = 0.02,
): string {
  const a0 = ((h + gap * 6) / 24) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((h + 1 - gap * 6) / 24) * Math.PI * 2 - Math.PI / 2;
  const p = (r: number, a: number) =>
    `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}

/** Month-label positions for heatmap columns (first column of each new month). */
export function monthMarkers(
  colStarts: number[],
): { col: number; label: string }[] {
  const out: { col: number; label: string }[] = [];
  let prev = -1;
  colStarts.forEach((t, col) => {
    const m = new Date(t).getMonth();
    if (m !== prev) {
      // A label squeezed against the previous one replaces it.
      if (out.length && col - out[out.length - 1].col < 3) out.pop();
      out.push({ col, label: format(t, "MMM") });
      prev = m;
    }
  });
  return out;
}
