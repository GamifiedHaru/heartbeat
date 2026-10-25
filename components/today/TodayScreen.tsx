"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { ChartColumn, Clock, NotebookPen } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { formatMinutes, summarize } from "@/lib/analytics";
import { logBeat } from "@/lib/beats";
import { getSettings } from "@/lib/db";
import { partnerName, useBeats, useNow, useSettings } from "@/lib/hooks";
import type { Tab } from "../AppShell";
import { DailyInsightCard } from "../learn/DailyInsightCard";
import { Card, CardHeader, cx } from "../ui";
import { HeartButton } from "./HeartButton";
import { ThoughtSheet } from "./ThoughtSheet";

const LAUNCH_KEY = "hb-launched";

/** Logs one beat on a cold launch when the user opted in. */
function useAutoLogOnLaunch() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(LAUNCH_KEY)) return;
      sessionStorage.setItem(LAUNCH_KEY, "1");
    } catch {
      return;
    }
    (async () => {
      const s = await getSettings();
      if (!s.autoLogOnOpen) return;
      const { db } = await import("@/lib/db");
      const last = await db.beats.orderBy("at").last();
      if (last && Date.now() - last.at < 60_000) return;
      await logBeat({ source: "launch" });
    })();
  }, []);
}

function RollingNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? { opacity: 0 } : { y: "60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-60%", opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function TodayScreen({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  useAutoLogOnLaunch();
  const beats = useBeats();
  const settings = useSettings();
  const now = useNow();
  const name = partnerName(settings);
  const [sheet, setSheet] = useState<"new" | "edit" | null>(null);

  const today = useMemo(() => summarize(beats ?? [], "D", now), [beats, now]);
  const week = useMemo(() => summarize(beats ?? [], "W", now), [beats, now]);
  const last = beats?.at(-1);
  const lastIsRecent = last && now - last.at < 30 * 60_000;
  const minutes = formatMinutes(today.totalMinutes);
  const peakHour = Math.max(1, ...today.buckets.map((b) => b.count));
  const currentHour = new Date(now).getHours();
  const weekMax = Math.max(1, ...week.buckets.map((b) => b.count));
  const todayIdx = (new Date(now).getDay() + 6) % 7;

  return (
    <div>
      <header className="px-4 pt-3">
        <p className="text-footnote font-semibold uppercase tracking-wide text-label-2">
          {format(now, "EEEE, d MMMM")}
        </p>
        <h1 className="text-large-title font-bold tracking-tight">Today</h1>
      </header>

      <div className="pt-4">
        <HeartButton
          label={`Log a beat: I'm thinking of ${name}`}
          onTap={() => logBeat({ source: "tap" })}
          onHold={() => setSheet("new")}
        />
        <p className="px-8 pt-1 text-center text-subhead text-label-2">
          Tap whenever {name} crosses your mind.
          <br />
          <span className="text-label-3">Hold for a longer thought.</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-6">
        <Card className="px-3 py-3">
          <p className="text-footnote font-semibold text-accent">Beats</p>
          <p className="tnum pt-0.5 font-rounded text-title-1 font-semibold">
            <RollingNumber value={today.total} />
          </p>
        </Card>
        <Card className="px-3 py-3">
          <p className="text-footnote font-semibold text-accent">Time</p>
          <p className="tnum pt-0.5 font-rounded">
            <span className="text-title-1 font-semibold">{minutes.value}</span>
            <span className="ml-0.5 text-footnote font-semibold text-label-2">
              {minutes.unit}
            </span>
          </p>
        </Card>
        <Card className="px-3 py-3">
          <p className="text-footnote font-semibold text-accent">Last</p>
          <p className="pt-1.5 text-subhead font-semibold leading-tight">
            {last
              ? now - last.at < 60_000
                ? "Just now"
                : `${formatDistanceToNowStrict(last.at)
                    .replace(/ minutes?/, " min")
                    .replace(/ hours?/, " h")} ago`
              : "—"}
          </p>
        </Card>
      </div>

      <AnimatePresence initial={false}>
        {lastIsRecent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4"
          >
            <button
              type="button"
              onClick={() => setSheet("edit")}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-card bg-card text-subhead font-semibold text-accent active:bg-card-2"
            >
              <NotebookPen size={17} />
              {last?.note || last?.mood
                ? "Edit the last beat"
                : "Add a note to the last beat"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-2">
        <Card className="mt-2">
          <CardHeader
            icon={<Clock size={16} />}
            title="Today's rhythm"
            meta={today.total ? `${today.total} today` : undefined}
          />
          <div
            className="mt-4 flex h-16 items-end gap-[3px]"
            role="img"
            aria-label={`Beats by hour today: ${
              today.buckets
                .filter((b) => b.count)
                .map((b) => `${b.count} at ${b.label}:00`)
                .join(", ") || "none yet"
            }`}
          >
            {today.buckets.map((b, h) => (
              <div
                key={b.start}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <motion.div
                  className={cx(
                    "w-full rounded-[2px]",
                    b.count
                      ? "bg-accent"
                      : h <= currentHour
                        ? "bg-card-3"
                        : "bg-card-2",
                  )}
                  initial={false}
                  animate={{
                    height: b.count
                      ? `${Math.max(14, (b.count / peakHour) * 100)}%`
                      : "6%",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            ))}
          </div>
          <div className="tnum mt-1.5 flex justify-between text-caption text-label-3">
            <span>12 AM</span>
            <span>6</span>
            <span>12 PM</span>
            <span>6</span>
            <span>12</span>
          </div>
        </Card>

        <DailyInsightCard onOpenLearn={() => onNavigate("learn")} />

        <Card
          className="mt-3"
          onClick={() => onNavigate("trends")}
          label="Open trends"
        >
          <CardHeader
            icon={<ChartColumn size={16} />}
            title="This week"
            chevron
          />
          <div className="flex items-end justify-between gap-4 pt-3">
            <div>
              <p className="text-footnote text-label-2">Daily average</p>
              <p className="tnum font-rounded">
                <span className="text-title-1 font-semibold">
                  {week.avgPerDay >= 10
                    ? Math.round(week.avgPerDay)
                    : week.avgPerDay.toFixed(1).replace(/\.0$/, "")}
                </span>
                <span className="ml-1 text-subhead font-semibold text-label-2">
                  beats
                </span>
              </p>
            </div>
            <div className="flex h-12 items-end gap-1.5" aria-hidden>
              {week.buckets.map((b, i) => (
                <div key={b.start} className="flex flex-col items-center gap-1">
                  <div className="flex h-9 w-3.5 items-end">
                    <div
                      className={cx(
                        "w-full rounded-[3px]",
                        i === todayIdx ? "bg-accent" : "bg-accent/45",
                        !b.count && "bg-card-3",
                      )}
                      style={{
                        height: b.count
                          ? `${Math.max(12, (b.count / weekMax) * 100)}%`
                          : "8%",
                      }}
                    />
                  </div>
                  <span
                    className={cx(
                      "text-[10px]",
                      i === todayIdx ? "text-label" : "text-label-3",
                    )}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {beats && beats.length === 0 && (
          <p className="px-4 pt-6 text-center text-footnote text-label-3">
            Your first beat starts the story. Everything stays on this phone.
          </p>
        )}
      </div>

      <ThoughtSheet
        open={sheet !== null}
        onOpenChange={(o) => !o && setSheet(null)}
        editing={sheet === "edit" ? last : undefined}
        defaultMinutes={settings?.minutesPerBeat ?? 1}
        partner={name}
      />
    </div>
  );
}
