import Dexie, { type EntityTable } from "dexie";

export type Mood = "warm" | "missing" | "grateful" | "excited" | "calm";
export type BeatSource = "tap" | "hold" | "launch";

export interface Beat {
  id?: number;
  /** Epoch ms. */
  at: number;
  minutes: number;
  note?: string;
  mood?: Mood;
  source: BeatSource;
}

export interface QuizResult {
  id?: number;
  quizId: string;
  at: number;
  answers: Record<string, number>;
  outcomeId: string;
  scores: Record<string, number>;
  /** Free-text answers (love map). */
  texts?: Record<string, string>;
}

export interface Settings {
  key: "me";
  partnerName: string;
  myName: string;
  minutesPerBeat: number;
  autoLogOnOpen: boolean;
  haptics: boolean;
  onboarded: boolean;
  createdAt: number;
  lastBackupAt?: number;
  backupNudgeDismissedAt?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  key: "me",
  partnerName: "",
  myName: "",
  minutesPerBeat: 1,
  autoLogOnOpen: false,
  haptics: true,
  onboarded: false,
  createdAt: 0,
};

export const db = new Dexie("heartbeat-v1") as Dexie & {
  beats: EntityTable<Beat, "id">;
  quizResults: EntityTable<QuizResult, "id">;
  settings: EntityTable<Settings, "key">;
};

db.version(1).stores({
  beats: "++id, at",
  quizResults: "++id, quizId, at",
  settings: "key",
});

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get("me");
  return { ...DEFAULT_SETTINGS, ...row };
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, key: "me" });
}

export async function addBeat(beat: Omit<Beat, "id">) {
  const id = (await db.beats.add(beat)) as number;
  // Ask once for durable storage so iOS is less likely to evict the data.
  if (navigator.storage?.persist) {
    navigator.storage.persisted().then((ok) => {
      if (!ok) navigator.storage.persist().catch(() => {});
    });
  }
  return id;
}

export async function deleteBeat(id: number) {
  await db.beats.delete(id);
}
