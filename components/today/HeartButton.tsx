"use client";

import { Heart } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { useRef, useState } from "react";

interface Burst {
  id: number;
  particles: { angle: number; dist: number; size: number; delay: number }[];
}

const HOLD_MS = 500;
const MAX_BURSTS = 3;

/**
 * The hero button. Tap logs a beat; press-and-hold opens the "longer thought"
 * sheet instead. Visual feedback is immediate; persistence happens in onTap.
 */
export function HeartButton({
  onTap,
  onHold,
  label,
}: {
  onTap: () => void;
  onHold: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [rings, setRings] = useState<number[]>([]);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const seq = useRef(0);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const celebrate = () => {
    const id = ++seq.current;
    if (!reduce) {
      const n = 9;
      const particles = Array.from({ length: n }, (_, i) => ({
        angle: (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6,
        dist: 90 + Math.random() * 50,
        size: 8 + Math.random() * 8,
        delay: Math.random() * 0.05,
      }));
      setBursts((b) => [...b.slice(-(MAX_BURSTS - 1)), { id, particles }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 950);
    }
    setRings((r) => [...r.slice(-2), id]);
    setTimeout(() => setRings((r) => r.filter((x) => x !== id)), 700);
    controls.start({
      scale: reduce ? 1 : [0.92, 1.1, 1],
      transition: reduce
        ? { duration: 0 }
        : { duration: 0.42, times: [0, 0.35, 1], ease: "easeOut" },
    });
  };

  return (
    <div className="relative mx-auto grid size-[240px] place-items-center">
      {/* Soft resting glow */}
      <div
        aria-hidden
        className="absolute size-[200px] rounded-full bg-accent/20 blur-3xl"
      />

      <AnimatePresence>
        {rings.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            className="absolute size-[180px] rounded-full border-2 border-accent"
            initial={{ scale: 0.9, opacity: 0.55 }}
            animate={{ scale: reduce ? 0.9 : 1.45, opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {bursts.map((b) =>
        b.particles.map((p, i) => (
          <motion.span
            key={`${b.id}-${i}`}
            aria-hidden
            className="pointer-events-none absolute text-accent"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{
              x: Math.cos(p.angle) * p.dist,
              y: Math.sin(p.angle) * p.dist,
              opacity: 0,
              scale: 1,
            }}
            transition={{ duration: 0.85, ease: "easeOut", delay: p.delay }}
          >
            <Heart size={p.size} fill="currentColor" strokeWidth={0} />
          </motion.span>
        )),
      )}

      <motion.button
        type="button"
        aria-label={label}
        animate={controls}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onPointerDown={() => {
          held.current = false;
          clearHold();
          holdTimer.current = setTimeout(() => {
            held.current = true;
            onHold();
          }, HOLD_MS);
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={() => {
          held.current = false;
        }}
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          celebrate();
          onTap();
        }}
        className="relative grid size-[180px] touch-manipulation place-items-center rounded-full bg-gradient-to-b from-accent to-accent-deep shadow-[0_12px_48px_-8px_var(--accent)] outline-none focus-visible:ring-4 focus-visible:ring-accent/50"
        style={{ willChange: "transform" }}
      >
        <Heart
          size={84}
          className="text-label drop-shadow-sm"
          fill="currentColor"
          strokeWidth={0}
        />
      </motion.button>
    </div>
  );
}
