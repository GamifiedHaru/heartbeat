"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { type Beat, DEFAULT_SETTINGS, db, type Settings } from "./db";

/** All beats, oldest first. `undefined` while loading. */
export function useBeats(): Beat[] | undefined {
  return useLiveQuery(() => db.beats.orderBy("at").toArray(), []);
}

/** Settings merged with defaults. `undefined` while loading. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get("me");
    return { ...DEFAULT_SETTINGS, ...row };
  }, []);
}

export function useQuizResults() {
  return useLiveQuery(() => db.quizResults.orderBy("at").toArray(), []);
}

/** Current time, re-rendering every `ms` so "x min ago" stays fresh. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    const onVis = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
  return now;
}

export function partnerName(s: Settings | undefined) {
  return s?.partnerName.trim() || "them";
}
