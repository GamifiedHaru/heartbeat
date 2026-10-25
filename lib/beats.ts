"use client";

import { toast } from "sonner";
import { addBeat, type Beat, deleteBeat, getSettings } from "./db";
import { haptic } from "./haptics";

const AFFIRMATIONS = [
  "Thinking of {name}",
  "Beat saved",
  "{name} would smile",
  "Noted with love",
  "Another little beat",
];

function affirmation(name: string) {
  const t = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
  return t.replace("{name}", name || "them");
}

/** Logs a beat with an undo toast. Returns the new id. */
export async function logBeat(
  partial: Partial<Omit<Beat, "id">> & Pick<Beat, "source">,
) {
  haptic();
  const s = await getSettings();
  const beat: Omit<Beat, "id"> = {
    at: Date.now(),
    minutes: s.minutesPerBeat,
    ...partial,
  };
  const id = await addBeat(beat);
  toast(affirmation(s.partnerName), {
    id: "beat",
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => {
        deleteBeat(id);
      },
    },
  });
  return id;
}
