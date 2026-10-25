"use client";

import { useEffect, useState } from "react";
import { logBeat } from "@/lib/beats";
import { type Beat, db, type Mood } from "@/lib/db";
import { Button, cx, Sheet } from "../ui";

export const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: "warm", emoji: "🥰", label: "Warm" },
  { id: "missing", emoji: "🥺", label: "Missing" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "excited", emoji: "✨", label: "Excited" },
  { id: "calm", emoji: "😌", label: "Calm" },
];

const DURATIONS = [1, 5, 15, 30, 60];

/**
 * Logs a richer beat (longer duration, mood, note), or, when `editing` is
 * given, adds those details to an existing beat.
 */
export function ThoughtSheet({
  open,
  onOpenChange,
  editing,
  defaultMinutes,
  partner,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Beat;
  defaultMinutes: number;
  partner: string;
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [mood, setMood] = useState<Mood | undefined>();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setMinutes(editing?.minutes ?? (defaultMinutes > 1 ? defaultMinutes : 5));
    setMood(editing?.mood);
    setNote(editing?.note ?? "");
  }, [open, editing, defaultMinutes]);

  const save = async () => {
    const trimmed = note.trim().slice(0, 280) || undefined;
    if (editing?.id != null) {
      await db.beats.update(editing.id, { minutes, mood, note: trimmed });
    } else {
      await logBeat({ source: "hold", minutes, mood, note: trimmed });
    }
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Add to this beat" : "A longer thought"}
    >
      <p className="pb-2 text-footnote uppercase text-label-2">
        How long were you thinking of {partner}?
      </p>
      <div className="grid grid-cols-5 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setMinutes(d)}
            aria-pressed={minutes === d}
            className={cx(
              "tnum h-11 rounded-[10px] text-subhead font-semibold transition-colors",
              minutes === d ? "bg-accent text-label" : "bg-card-2 text-label-2",
            )}
          >
            {d === 60 ? "1 h" : `${d} m`}
          </button>
        ))}
      </div>

      <p className="pt-5 pb-2 text-footnote uppercase text-label-2">Feeling</p>
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMood(mood === m.id ? undefined : m.id)}
            aria-pressed={mood === m.id}
            className={cx(
              "flex h-16 flex-col items-center justify-center gap-0.5 rounded-[10px] transition-colors",
              mood === m.id ? "bg-accent-soft ring-2 ring-accent" : "bg-card-2",
            )}
          >
            <span className="text-title-3" aria-hidden>
              {m.emoji}
            </span>
            <span className="text-caption text-label-2">{m.label}</span>
          </button>
        ))}
      </div>

      <label className="block pt-5">
        <span className="block pb-2 text-footnote uppercase text-label-2">
          Note (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder={`What made you think of ${partner}?`}
          className="w-full resize-none rounded-[10px] bg-card-2 p-3 text-body text-label placeholder:text-label-3 outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      <Button onClick={save} className="mt-5">
        {editing ? "Save" : "Log this thought"}
      </Button>
    </Sheet>
  );
}
