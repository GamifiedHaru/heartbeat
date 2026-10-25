"use client";

import { format } from "date-fns";
import { CalendarDays, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { type BeatLike, heatmap } from "@/lib/analytics";
import { type Beat, db } from "@/lib/db";
import { beatsOnDay, monthMarkers } from "@/lib/trends";
import { MOODS } from "../today/ThoughtSheet";
import { Card, CardHeader, Sheet } from "../ui";

const LEVEL_PCT = [0, 28, 50, 75, 100];

function levelBg(level: number) {
  return level === 0
    ? "var(--card-3)"
    : `color-mix(in oklab, var(--accent) ${LEVEL_PCT[level]}%, transparent)`;
}

export function Heatmap({ beats, now }: { beats: Beat[]; now: number }) {
  const cols = useMemo(
    () => heatmap(beats as BeatLike[], now, 26),
    [beats, now],
  );
  const months = useMemo(() => monthMarkers(cols.map((c) => c[0].day)), [cols]);
  const [day, setDay] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const dayBeats = useMemo(
    () => (day === null ? [] : beatsOnDay(beats, day)),
    [beats, day],
  );

  return (
    <Card className="mt-3">
      <CardHeader icon={<CalendarDays size={16} />} title="Last 26 weeks" />
      <div className="relative mt-3 h-4">
        {months.map((m) => (
          <span
            key={m.col}
            className="absolute whitespace-nowrap text-caption text-label-3"
            style={{ left: `${(m.col / 26) * 100}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div
        className="grid grid-flow-col gap-[2px]"
        style={{
          gridTemplateColumns: "repeat(26, 1fr)",
          gridTemplateRows: "repeat(7, auto)",
        }}
      >
        {cols.map((col) =>
          col.map((c) =>
            c.future ? (
              <span key={c.day} className="aspect-square" aria-hidden />
            ) : (
              <button
                key={c.day}
                type="button"
                aria-label={`${format(c.day, "EEE d MMM")}: ${c.count} ${c.count === 1 ? "beat" : "beats"}`}
                onClick={() => {
                  setConfirmId(null);
                  setDay(c.day);
                }}
                className="aspect-square rounded-[2px]"
                style={{ background: levelBg(c.level) }}
              />
            ),
          ),
        )}
      </div>
      <div className="flex items-center justify-end gap-1 pt-3 text-caption text-label-3">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="size-[10px] rounded-[2px]"
            style={{ background: levelBg(l) }}
          />
        ))}
        More
      </div>

      <Sheet
        open={day !== null}
        onOpenChange={(o) => !o && setDay(null)}
        title={day !== null ? format(day, "EEEE, d MMM") : ""}
      >
        {dayBeats.length === 0 ? (
          <p className="py-6 text-center text-subhead text-label-2">
            No beats this day. That&apos;s okay.
          </p>
        ) : (
          <ul className="divide-y divide-separator">
            {dayBeats.map((b) => (
              <li key={b.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="tnum text-body">
                    {format(b.at, "h:mm a")}
                    <span className="text-label-2">
                      {" "}
                      · {b.minutes} min{" "}
                      {MOODS.find((m) => m.id === b.mood)?.emoji}
                    </span>
                  </p>
                  {b.note && (
                    <p className="pt-0.5 text-subhead text-label-2">{b.note}</p>
                  )}
                </div>
                {confirmId === b.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (b.id !== undefined) await db.beats.delete(b.id);
                      setConfirmId(null);
                    }}
                    className="h-11 shrink-0 rounded-[10px] bg-accent px-3 text-subhead font-semibold"
                  >
                    Delete beat
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete this beat"
                    onClick={() => setConfirmId(b.id ?? null)}
                    className="flex size-11 shrink-0 items-center justify-center text-label-2 active:text-accent"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </Card>
  );
}
