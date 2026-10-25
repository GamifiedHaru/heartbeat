"use client";

import { format, startOfHour } from "date-fns";
import {
  CalendarCheck,
  ChartColumn,
  Clock,
  Heart,
  Hourglass,
  NotebookPen,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
  activeDays,
  formatMinutes,
  highlights,
  longestGap,
  type Range,
  rangeBounds,
  summarize,
  weekdayTotals,
} from "@/lib/analytics";
import { partnerName, useBeats, useNow, useSettings } from "@/lib/hooks";
import { formatGap, latestNotes, sliceWindow } from "@/lib/trends";
import { MOODS } from "../today/ThoughtSheet";
import {
  Card,
  CardHeader,
  EmptyState,
  ScreenHeader,
  Segmented,
  Sheet,
} from "../ui";
import { Heatmap } from "./Heatmap";
import { RangeChart } from "./RangeChart";
import { ClockCard, Punchcard } from "./Rhythms";

const RANGES = ["D", "W", "M", "6M", "Y"] as const;
const DAY_NAMES = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];

const HL_ICONS: Record<string, ReactNode> = {
  wow: <TrendingUp size={16} />,
  "peak-hour": <Clock size={16} />,
  "peak-day": <CalendarCheck size={16} />,
  active: <Heart size={16} />,
  lifetime: <Hourglass size={16} />,
};

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-card bg-card ${className}`} />;
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card className="px-3 py-3">
      <p className="text-footnote font-semibold text-accent">{label}</p>
      <p className="tnum pt-0.5 font-rounded">
        <span className="text-title-2 font-semibold">{value}</span>
        {unit && (
          <span className="ml-1 text-footnote font-semibold text-label-2">
            {unit}
          </span>
        )}
      </p>
    </Card>
  );
}

function NoteRow({
  at,
  note,
  mood,
}: {
  at: number;
  note?: string;
  mood?: string;
}) {
  return (
    <li className="py-3">
      <p className="text-footnote text-label-2">
        {format(at, "EEE d MMM, h:mm a")}{" "}
        {MOODS.find((m) => m.id === mood)?.emoji}
      </p>
      <p className="pt-0.5 text-body">{note}</p>
    </li>
  );
}

export function TrendsScreen() {
  const beats = useBeats();
  const settings = useSettings();
  const clock = useNow(30_000);
  const name = partnerName(settings);
  const [range, setRange] = useState<Range>("W");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // Heavy memos key off the hour so a 30 s tick does not redo O(n) work.
  const stamp = startOfHour(clock).getTime();
  const all = useMemo(() => beats ?? [], [beats]);

  const windowed = useMemo(() => {
    // Narrow once per range, then summarise only that slice.
    const { start, end } = rangeBounds(range, clock, offset);
    const slice = sliceWindow(all, start, end);
    return { slice, summary: summarize(slice, range, clock, offset) };
  }, [all, range, offset, clock]);
  const { slice, summary: sum } = windowed;

  const useAllTime = slice.length < 5;
  const scope = useAllTime ? all : slice;
  const scopeNote = useAllTime
    ? "Using all your beats so far, since this range has just a few."
    : `Based on the beats in ${sum.title}.`;

  const hl = useMemo(() => highlights(all, stamp, name), [all, stamp, name]);
  const stats = useMemo(() => {
    const total = all.length;
    const minutes = all.reduce((a, b) => a + b.minutes, 0);
    const wd = weekdayTotals(all);
    let top = 0;
    for (let d = 1; d < 7; d++) if (wd[d] > wd[top]) top = d;
    return {
      total,
      minutes: formatMinutes(minutes),
      active: activeDays(all, stamp, 14),
      gap: longestGap(all),
      topDay: wd[top] > 0 ? DAY_NAMES[top] : "—",
    };
  }, [all, stamp]);
  const notes = useMemo(() => latestNotes(all), [all]);

  const changeRange = (r: Range) => {
    setRange(r);
    setOffset(0);
    setSelected(null);
  };
  const step = (d: number) => {
    setOffset((o) => Math.min(0, o + d));
    setSelected(null);
  };

  return (
    <div className="pb-8">
      <ScreenHeader title="Trends" />
      {beats === undefined ? (
        <div className="space-y-3 px-4 pt-3" aria-busy>
          <Skeleton className="h-8" />
          <Skeleton className="h-[330px]" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : beats.length === 0 ? (
        <div className="px-4 pt-6">
          <Card>
            <EmptyState
              icon={<ChartColumn size={32} />}
              title="Nothing to chart yet"
              body={`Tap the heart whenever ${name} crosses your mind. Your patterns will bloom here.`}
            />
          </Card>
        </div>
      ) : (
        <>
          <Segmented
            label="Range"
            options={RANGES}
            value={range}
            onChange={changeRange}
          />
          <div className="px-4">
            <RangeChart
              summary={sum}
              range={range}
              offset={offset}
              selected={selected}
              onSelect={setSelected}
              onStep={step}
            />

            <h2 className="px-0 pt-6 pb-2 text-title-3 font-bold">
              Highlights
            </h2>
            {hl.length === 0 ? (
              <Card>
                <p className="text-subhead text-label-2">
                  Highlights appear after a few days of beats.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {hl.map((h) => (
                  <Card key={h.id}>
                    <CardHeader
                      icon={HL_ICONS[h.id] ?? <Sparkles size={16} />}
                      title={h.title}
                    />
                    <p className="pt-1.5 text-body">{h.body}</p>
                  </Card>
                ))}
              </div>
            )}

            <ClockCard
              beats={scope}
              scopeNote={scopeNote}
              name={name}
              currentHour={new Date(clock).getHours()}
            />
            <Punchcard beats={scope} />
            <Heatmap beats={all} now={stamp} />

            <h2 className="pt-6 pb-2 text-title-3 font-bold">All time</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Beats" value={stats.total.toLocaleString()} />
              <StatCard
                label="Time"
                value={stats.minutes.value}
                unit={stats.minutes.unit}
              />
              <StatCard
                label="Last 14 days"
                value={`${stats.active.active} of ${stats.active.of}`}
                unit="days"
              />
              <StatCard label="Longest pause" value={formatGap(stats.gap.ms)} />
              <StatCard label="Most thoughtful day" value={stats.topDay} />
            </div>

            <h2 className="pt-6 pb-2 text-title-3 font-bold">Notes</h2>
            <Card>
              <CardHeader icon={<NotebookPen size={16} />} title="Your notes" />
              {notes.length === 0 ? (
                <p className="pt-2 text-subhead text-label-2">
                  Hold the heart to add a note to a beat. They collect here.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-separator">
                    {notes.slice(0, 5).map((b) => (
                      <NoteRow
                        key={b.id}
                        at={b.at}
                        note={b.note}
                        mood={b.mood}
                      />
                    ))}
                  </ul>
                  {notes.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setNotesOpen(true)}
                      className="flex h-11 w-full items-center justify-center text-subhead font-semibold text-accent"
                    >
                      Show all {notes.length}
                    </button>
                  )}
                </>
              )}
            </Card>
          </div>
          <Sheet open={notesOpen} onOpenChange={setNotesOpen} title="All notes">
            <ul className="divide-y divide-separator">
              {notes.map((b) => (
                <NoteRow key={b.id} at={b.at} note={b.note} mood={b.mood} />
              ))}
            </ul>
          </Sheet>
        </>
      )}
    </div>
  );
}
