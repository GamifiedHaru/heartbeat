"use client";

import { Heart, Lock, Share, SquarePlus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { updateSettings } from "@/lib/db";
import { Button, cx, Toggle } from "./ui";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [partner, setPartner] = useState("");
  const [me, setMe] = useState("");
  const [autoLog, setAutoLog] = useState(false);
  const reduce = useReducedMotion();
  const installed = isStandalone();
  const steps = installed ? 2 : 3;

  const finish = () =>
    updateSettings({
      partnerName: partner.trim(),
      myName: me.trim(),
      autoLogOnOpen: autoLog,
      onboarded: true,
      createdAt: Date.now(),
    });

  return (
    <div className="pt-safe pb-safe mx-auto flex h-dvh max-w-[520px] flex-col px-6">
      <div className="flex justify-center gap-1.5 pt-4" aria-hidden>
        {Array.from({ length: steps }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static dots
            key={i}
            className={cx(
              "h-1.5 rounded-full transition-all duration-300",
              i === step ? "w-5 bg-accent" : "w-1.5 bg-card-3",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col"
        >
          {step === 0 && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <motion.div
                  animate={
                    reduce ? undefined : { scale: [1, 1.08, 1, 1.05, 1] }
                  }
                  transition={{
                    duration: 1.4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 0.6,
                  }}
                  className="grid size-28 place-items-center rounded-full bg-gradient-to-b from-accent to-accent-deep shadow-[0_12px_48px_-8px_var(--accent)]"
                >
                  <Heart
                    size={52}
                    fill="currentColor"
                    strokeWidth={0}
                    className="text-label"
                  />
                </motion.div>
                <h1 className="pt-8 text-large-title font-bold tracking-tight">
                  Heartbeat
                </h1>
                <p className="max-w-[300px] pt-3 text-body text-label-2">
                  Every time you think of them, tap. Each thought is a beat —
                  and over time, they tell a love story.
                </p>
                <p className="flex items-center gap-1.5 pt-6 text-footnote text-label-3">
                  <Lock size={13} /> Private. Everything stays on this phone.
                </p>
              </div>
              <Button onClick={() => setStep(1)} className="mb-4">
                Begin
              </Button>
            </>
          )}

          {step === 1 && (
            <form
              className="flex flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                if (partner.trim()) setStep(installed ? steps : 2);
                if (partner.trim() && installed) finish();
              }}
            >
              <div className="flex-1 pt-12">
                <h1 className="text-title-1 font-bold">Who's on your mind?</h1>
                <p className="pt-2 text-subhead text-label-2">
                  You can change this any time in Settings.
                </p>
                <label className="block pt-8">
                  <span className="text-footnote uppercase text-label-2">
                    Their name
                  </span>
                  <input
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    maxLength={30}
                    autoComplete="off"
                    placeholder="e.g. Maya"
                    className="mt-1.5 h-12 w-full rounded-[12px] bg-card px-4 text-body outline-none placeholder:text-label-3 focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="block pt-4">
                  <span className="text-footnote uppercase text-label-2">
                    Your name (optional)
                  </span>
                  <input
                    value={me}
                    onChange={(e) => setMe(e.target.value)}
                    maxLength={30}
                    autoComplete="off"
                    className="mt-1.5 h-12 w-full rounded-[12px] bg-card px-4 text-body outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <div className="mt-6 flex items-center gap-3 rounded-card bg-card p-4">
                  <div className="flex-1">
                    <p className="text-body">Log a beat when I open the app</p>
                    <p className="pt-0.5 text-footnote text-label-2">
                      Opening Heartbeat becomes the tap. You can always undo.
                    </p>
                  </div>
                  <Toggle
                    checked={autoLog}
                    onChange={setAutoLog}
                    label="Log a beat when I open the app"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!partner.trim()}
                className="mb-4 h-[50px] rounded-[12px] bg-accent-strong text-headline font-semibold disabled:opacity-40"
              >
                Continue
              </button>
            </form>
          )}

          {step === 2 && !installed && (
            <>
              <div className="flex-1 pt-12">
                <h1 className="text-title-1 font-bold">
                  Put it on your Home Screen
                </h1>
                <p className="pt-2 text-subhead text-label-2">
                  So one tap opens it full-screen, like a real app. Do this
                  before logging: Safari and the Home Screen app keep separate
                  data.
                </p>
                <ol className="mt-8 space-y-3">
                  {[
                    {
                      icon: <Share size={20} />,
                      text: "Tap Share in Safari's toolbar",
                    },
                    {
                      icon: <SquarePlus size={20} />,
                      text: "Choose “Add to Home Screen”",
                    },
                    {
                      icon: <Heart size={20} />,
                      text: "Open Heartbeat from your Home Screen",
                    },
                  ].map((s, i) => (
                    <li
                      key={s.text}
                      className="flex items-center gap-4 rounded-card bg-card p-4"
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                        {s.icon}
                      </span>
                      <span className="text-body">
                        <span className="tnum text-label-2">{i + 1}. </span>
                        {s.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <Button onClick={finish} variant="secondary" className="mb-4">
                Continue in the browser
              </Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
