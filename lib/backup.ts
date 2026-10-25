import {
  type Beat,
  type BeatSource,
  DEFAULT_SETTINGS,
  db,
  type Mood,
  type QuizResult,
  type Settings,
} from "./db";

export interface Backup {
  app: "heartbeat";
  version: 1;
  exportedAt: number;
  settings: Settings;
  beats: Beat[];
  quizResults: QuizResult[];
}

export type ValidateResult =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

const MOODS: readonly Mood[] = [
  "warm",
  "missing",
  "grateful",
  "excited",
  "calm",
];
const SOURCES: readonly BeatSource[] = ["tap", "hold", "launch"];
const MAX_STR = 2000;
const MAX_NAME = 80;
const MIN_AT = Date.UTC(2000, 0, 1);

export async function exportData(): Promise<Backup> {
  const [row, beats, quizResults] = await Promise.all([
    db.settings.get("me"),
    db.beats.orderBy("at").toArray(),
    db.quizResults.orderBy("at").toArray(),
  ]);
  return {
    app: "heartbeat",
    version: 1,
    exportedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, ...row },
    beats: beats.map(({ id: _id, ...b }) => b),
    quizResults: quizResults.map(({ id: _id, ...r }) => r),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown, max = MAX_STR): v is string =>
  typeof v === "string" && v.length <= max;

function numRecord(v: unknown): v is Record<string, number> {
  return (
    isObj(v) &&
    Object.keys(v).length <= 500 &&
    Object.entries(v).every(([k, n]) => k.length <= 100 && isNum(n))
  );
}

function strRecord(v: unknown): v is Record<string, string> {
  return (
    isObj(v) &&
    Object.keys(v).length <= 500 &&
    Object.entries(v).every(([k, s]) => k.length <= 100 && isStr(s, 2000))
  );
}

function fail(error: string): ValidateResult {
  return { ok: false, error };
}

export function validateBackup(input: unknown): ValidateResult {
  if (!isObj(input) || input.app !== "heartbeat") {
    return fail("This doesn't look like a Heartbeat backup file.");
  }
  if (input.version !== 1) {
    return fail("This backup comes from a version of Heartbeat I don't know.");
  }
  const maxAt = Date.now() + 2 * 86_400_000;
  const plausible = (at: unknown): at is number =>
    isNum(at) && at >= MIN_AT && at <= maxAt;

  const s = input.settings;
  if (!isObj(s)) return fail("The backup is missing its settings.");
  if (!isStr(s.partnerName, MAX_NAME) || !isStr(s.myName, MAX_NAME)) {
    return fail("A name in the settings is missing or too long.");
  }
  if (
    !isNum(s.minutesPerBeat) ||
    s.minutesPerBeat < 0 ||
    s.minutesPerBeat > 600
  ) {
    return fail("Minutes per beat in the settings is out of range.");
  }
  if (
    typeof s.autoLogOnOpen !== "boolean" ||
    typeof s.haptics !== "boolean" ||
    typeof s.onboarded !== "boolean"
  ) {
    return fail("Some settings have the wrong type.");
  }
  const optNum = (v: unknown) => v === undefined || isNum(v);
  if (
    !isNum(s.createdAt) ||
    !optNum(s.lastBackupAt) ||
    !optNum(s.backupNudgeDismissedAt)
  ) {
    return fail("Some dates in the settings are invalid.");
  }
  const settings: Settings = {
    key: "me",
    partnerName: s.partnerName,
    myName: s.myName,
    minutesPerBeat: s.minutesPerBeat,
    autoLogOnOpen: s.autoLogOnOpen,
    haptics: s.haptics,
    onboarded: s.onboarded,
    createdAt: s.createdAt,
    lastBackupAt: s.lastBackupAt as number | undefined,
    backupNudgeDismissedAt: s.backupNudgeDismissedAt as number | undefined,
  };

  if (!Array.isArray(input.beats)) return fail("The backup has no beats list.");
  if (!Array.isArray(input.quizResults)) {
    return fail("The backup has no quiz results list.");
  }
  const beats: Beat[] = [];
  for (const [i, b] of input.beats.entries()) {
    if (!isObj(b)) return fail(`Beat ${i + 1} isn't readable.`);
    if (!plausible(b.at)) return fail(`Beat ${i + 1} has an unusual date.`);
    if (!isNum(b.minutes) || b.minutes < 0 || b.minutes > 600) {
      return fail(`Beat ${i + 1} has an unusual length.`);
    }
    if (!SOURCES.includes(b.source as BeatSource)) {
      return fail(`Beat ${i + 1} has an unknown source.`);
    }
    if (b.note !== undefined && !isStr(b.note)) {
      return fail(`Beat ${i + 1} has a note that is too long.`);
    }
    if (b.mood !== undefined && !MOODS.includes(b.mood as Mood)) {
      return fail(`Beat ${i + 1} has an unknown mood.`);
    }
    beats.push({
      at: b.at,
      minutes: b.minutes,
      source: b.source as BeatSource,
      ...(b.note !== undefined && { note: b.note as string }),
      ...(b.mood !== undefined && { mood: b.mood as Mood }),
    });
  }
  const quizResults: QuizResult[] = [];
  for (const [i, r] of input.quizResults.entries()) {
    if (
      !isObj(r) ||
      !isStr(r.quizId, 100) ||
      !isStr(r.outcomeId, 100) ||
      !plausible(r.at) ||
      !numRecord(r.answers) ||
      !numRecord(r.scores) ||
      (r.texts !== undefined && !strRecord(r.texts))
    ) {
      return fail(`Quiz result ${i + 1} isn't readable.`);
    }
    quizResults.push({
      quizId: r.quizId,
      outcomeId: r.outcomeId,
      at: r.at,
      answers: r.answers,
      scores: r.scores,
      ...(r.texts !== undefined && {
        texts: r.texts as Record<string, string>,
      }),
    });
  }
  return {
    ok: true,
    backup: {
      app: "heartbeat",
      version: 1,
      exportedAt: isNum(input.exportedAt) ? input.exportedAt : Date.now(),
      settings,
      beats,
      quizResults,
    },
  };
}

export interface ImportSummary {
  beatsAdded: number;
  quizResultsAdded: number;
}

export async function importData(
  backup: Backup,
  mode: "merge" | "replace",
): Promise<ImportSummary> {
  return db.transaction(
    "rw",
    db.beats,
    db.quizResults,
    db.settings,
    async () => {
      const seen = new Set<string>();
      const quizSeen = new Set<string>();
      if (mode === "replace") {
        await db.beats.clear();
        await db.quizResults.clear();
        await db.settings.put({ ...backup.settings, key: "me" });
      } else {
        for (const b of await db.beats.toArray()) {
          seen.add(`${b.at}:${b.minutes}`);
        }
        for (const q of await db.quizResults.toArray()) {
          quizSeen.add(`${q.quizId}:${q.at}`);
        }
        const cur = await db.settings.get("me");
        if (!cur) await db.settings.put({ ...backup.settings, key: "me" });
      }
      const beats = backup.beats.filter((b) => {
        const k = `${b.at}:${b.minutes}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const quizResults = backup.quizResults.filter((q) => {
        const k = `${q.quizId}:${q.at}`;
        if (quizSeen.has(k)) return false;
        quizSeen.add(k);
        return true;
      });
      await db.beats.bulkAdd(beats);
      await db.quizResults.bulkAdd(quizResults);
      return { beatsAdded: beats.length, quizResultsAdded: quizResults.length };
    },
  );
}

/** Removes every beat and quiz result and resets settings (back to onboarding). */
export async function deleteAllData() {
  await db.transaction(
    "rw",
    db.beats,
    db.quizResults,
    db.settings,
    async () => {
      await db.beats.clear();
      await db.quizResults.clear();
      await db.settings.clear();
    },
  );
}
