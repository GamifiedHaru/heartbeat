import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { exportData, importData, validateBackup } from "./backup";
import { db, updateSettings } from "./db";

const T = Date.UTC(2026, 5, 1);

beforeEach(async () => {
  await db.beats.clear();
  await db.quizResults.clear();
  await db.settings.clear();
});

async function seed() {
  await updateSettings({ partnerName: "Maya", onboarded: true, createdAt: T });
  await db.beats.bulkAdd([
    { at: T, minutes: 1, source: "tap" },
    { at: T + 60_000, minutes: 15, source: "hold", note: "hi", mood: "warm" },
  ]);
  await db.quizResults.add({
    quizId: "q",
    at: T,
    answers: { a: 1 },
    outcomeId: "o",
    scores: { x: 2 },
  });
}

describe("backup", () => {
  it("round-trips through JSON and replace", async () => {
    await seed();
    const json = JSON.parse(JSON.stringify(await exportData()));
    await db.beats.clear();
    await db.quizResults.clear();
    await db.settings.clear();
    const v = validateBackup(json);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    await importData(v.backup, "replace");
    const again = await exportData();
    expect(again.beats).toEqual(json.beats);
    expect(again.quizResults).toEqual(json.quizResults);
    expect(again.settings.partnerName).toBe("Maya");
  });

  it("merge de-duplicates by at + minutes", async () => {
    await seed();
    const backup = await exportData();
    backup.beats.push({ at: T + 5000, minutes: 1, source: "tap" });
    const r = await importData(backup, "merge");
    expect(r.beatsAdded).toBe(1);
    expect(await db.beats.count()).toBe(3);
    expect(await db.quizResults.count()).toBe(1);
  });

  it("rejects malformed files", async () => {
    await seed();
    const good = JSON.parse(JSON.stringify(await exportData()));
    const ok = (
      mut: (
        b: // biome-ignore lint/suspicious/noExplicitAny: test mutation helper
        Record<string, any>,
      ) => void,
    ) => {
      const c = structuredClone(good);
      mut(c);
      return validateBackup(c).ok;
    };
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ app: "other" }).ok).toBe(false);
    expect(ok((b) => (b.version = 2))).toBe(false);
    expect(ok((b) => (b.beats[0].minutes = 9999))).toBe(false);
    expect(ok((b) => (b.beats[0].at = "x"))).toBe(false);
    expect(ok((b) => (b.beats[0].at = 5))).toBe(false);
    expect(ok((b) => (b.beats[0].source = "nope"))).toBe(false);
    expect(ok((b) => (b.beats[0].note = "x".repeat(5000)))).toBe(false);
    expect(ok((b) => (b.settings.partnerName = 3))).toBe(false);
    expect(ok((b) => (b.quizResults[0].scores = { a: "z" }))).toBe(false);
    expect(ok(() => {})).toBe(true);
  });
});
