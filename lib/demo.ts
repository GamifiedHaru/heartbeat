// Realistic fake history for screenshots and load testing. Never runs in
// production builds unless explicitly called.
import { type Beat, db, type Mood } from "./db";

const HOUR_WEIGHTS = [
  0.2, 0.1, 0.05, 0.02, 0.02, 0.1, 0.6, 1.4, 1.8, 1.0, 0.8, 0.9, 1.5, 1.0, 0.8,
  0.9, 1.0, 1.3, 1.6, 1.4, 1.5, 1.9, 2.2, 1.0,
];
const NOTES = [
  "Heard our song in the café",
  "Saw a dog that looks like hers",
  "Remembered her laugh at dinner",
  "Missing our Sunday walks",
  "She'd love this sunset",
  "Ate her favourite pasta",
];
const MOODS: Mood[] = ["warm", "missing", "grateful", "excited", "calm"];

function pickHour() {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let h = 0; h < 24; h++) {
    r -= HOUR_WEIGHTS[h];
    if (r <= 0) return h;
  }
  return 21;
}

export function makeDemoBeats(days = 200, perDay = 9, now = Date.now()) {
  const out: Omit<Beat, "id">[] = [];
  for (let d = days; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const n = Math.max(
      0,
      Math.round(perDay * (weekend ? 1.3 : 1) * (0.4 + Math.random() * 1.2)),
    );
    for (let i = 0; i < n; i++) {
      const t = new Date(day);
      t.setHours(pickHour(), Math.floor(Math.random() * 60), 0, 0);
      if (t.getTime() > now) continue;
      const rich = Math.random() < 0.08;
      out.push({
        at: t.getTime(),
        minutes: rich ? [5, 15, 30][Math.floor(Math.random() * 3)] : 1,
        source: rich ? "hold" : "tap",
        ...(rich && {
          mood: MOODS[Math.floor(Math.random() * MOODS.length)],
          note:
            Math.random() < 0.6
              ? NOTES[Math.floor(Math.random() * NOTES.length)]
              : undefined,
        }),
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export async function seedDemo(days?: number, perDay?: number) {
  await db.beats.clear();
  await db.beats.bulkAdd(makeDemoBeats(days, perDay));
}
