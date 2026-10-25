"use client";

import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { LifeBuoy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Quiz, QuizOutcome } from "@/lib/content";
import { db } from "@/lib/db";
import {
  type Answers,
  type DimensionMeta,
  dimensionsFor,
  normalise,
  scoreQuiz,
} from "@/lib/quiz";
import { Button, Card } from "../ui";
import { ExtLink } from "./InsightDetail";
import { SafetyContent } from "./SafetyContent";

/** Love-map free-text answers saved with the result taken at `at`. */
function useLoveMapText(at: number, enabled: boolean) {
  return (
    useLiveQuery(
      async () =>
        enabled
          ? ((await db.quizResults.where("at").equals(at).first())?.texts ?? {})
          : {},
      [at, enabled],
    ) ?? {}
  );
}

/** Swaps "your/my partner" for their name (when one is set). */
export function personalize(text: string, partner: string) {
  if (partner === "them") return text;
  return text.replace(
    /(?:your|my) partner('s)?/gi,
    (_m, poss) => partner + (poss ?? ""),
  );
}

/** Outcome titles for a stored or fresh result, joined for display. */
export function outcomesFor(quiz: Quiz, answers: Answers): QuizOutcome[] {
  const { outcomeIds } = scoreQuiz(quiz, answers);
  return outcomeIds
    .map((id) => quiz.results.outcomes.find((o) => o.id === id))
    .filter((o): o is QuizOutcome => !!o);
}

function fmt(v: number, d: DimensionMeta) {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return d.min === 0 ? `${n} of ${d.max}` : `${n} / ${d.max}`;
}

function Bars({
  dims,
  scores,
}: {
  dims: DimensionMeta[];
  scores: Record<string, number>;
}) {
  const reduce = useReducedMotion();
  return (
    <ul className="space-y-3">
      {dims.map((d, i) => {
        const v = scores[d.key] ?? 0;
        return (
          <li key={d.key}>
            <div className="flex items-baseline justify-between text-subhead">
              <span>{d.label}</span>
              <span className="tnum text-label-2">{fmt(v, d)}</span>
            </div>
            <div
              aria-hidden
              className="mt-1 h-2 overflow-hidden rounded-full bg-card-3"
            >
              <motion.div
                className="h-full origin-left rounded-full bg-accent"
                initial={{ scaleX: reduce ? normalise(v, d) : 0 }}
                animate={{ scaleX: normalise(v, d) }}
                transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Attachment: a dot with a soft ring on an anxiety x avoidance grid. */
function AttachmentGrid({
  anxiety,
  avoidance,
}: {
  anxiety: number;
  avoidance: number;
}) {
  const x = 20 + ((anxiety - 1) / 6) * 160;
  const y = 180 - ((avoidance - 1) / 6) * 160;
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto mt-4 w-full max-w-[220px]"
      role="img"
      aria-label={`Worry about closeness ${anxiety.toFixed(1)} of 7, need for distance ${avoidance.toFixed(1)} of 7. The dot is a rough position, not a label.`}
    >
      <rect
        x="20"
        y="20"
        width="160"
        height="160"
        rx="10"
        fill="var(--card-2)"
      />
      <line x1="100" y1="20" x2="100" y2="180" stroke="var(--separator)" />
      <line x1="20" y1="100" x2="180" y2="100" stroke="var(--separator)" />
      <circle cx={x} cy={y} r="22" fill="var(--accent-soft)" />
      <circle cx={x} cy={y} r="7" fill="var(--accent)" />
      <text
        x="100"
        y="196"
        textAnchor="middle"
        fontSize="10"
        fill="var(--label-2)"
      >
        worry about closeness
      </text>
      <text
        x="8"
        y="100"
        textAnchor="middle"
        fontSize="10"
        fill="var(--label-2)"
        transform="rotate(-90 8 100)"
      >
        need for distance
      </text>
    </svg>
  );
}

/** Triangle: sides scale with each mean / 7. */
function TriangleShape({ scores }: { scores: Record<string, number> }) {
  const c = { x: 100, y: 110 };
  const verts = [
    { k: "intimacy", a: -90, label: "Intimacy" },
    { k: "passion", a: 150, label: "Passion" },
    { k: "commitment", a: 30, label: "Commitment" },
  ];
  const pt = (a: number, r: number) => ({
    x: c.x + r * Math.cos((a * Math.PI) / 180),
    y: c.y + r * Math.sin((a * Math.PI) / 180),
  });
  const outer = verts.map((v) => pt(v.a, 80));
  const inner = verts.map((v) => pt(v.a, (80 * (scores[v.k] ?? 0)) / 7));
  const poly = (p: { x: number; y: number }[]) =>
    p.map((q) => `${q.x},${q.y}`).join(" ");
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto mt-4 w-full max-w-[220px]"
      role="img"
      aria-label="Triangle sized by intimacy, passion and commitment"
    >
      <polygon
        points={poly(outer)}
        fill="var(--card-2)"
        stroke="var(--separator)"
      />
      <polygon
        points={poly(inner)}
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {verts.map((v) => {
        const p = pt(v.a, 94);
        return (
          <text
            key={v.k}
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            fontSize="10"
            fill="var(--label-2)"
          >
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pt-1 pl-5 text-body">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

export function QuizResultView({
  quiz,
  answers,
  at,
  partner,
  onRetake,
  onDone,
  saveFailed,
}: {
  quiz: Quiz;
  answers: Answers;
  at: number;
  partner: string;
  onRetake: () => void;
  onDone: () => void;
  saveFailed?: boolean;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const { outcomeIds, scores } = scoreQuiz(quiz, answers);
  const outcomes = outcomesFor(quiz, answers);
  const dims = dimensionsFor(quiz.id);
  const isMap = quiz.id === "love-map";
  const texts = useLoveMapText(at, isMap);
  const written = quiz.items.filter((it) => texts[it.id]?.trim());
  const rated = scores.rated ?? 0;
  const showCare =
    quiz.id === "conflict-horsemen" || outcomeIds.includes("nonlove");
  const barTitle =
    quiz.id === "love-expression"
      ? "Your preferences today"
      : quiz.id === "conflict-horsemen"
        ? "How your answers landed"
        : isMap
          ? "How sure you felt"
          : "Your scores";

  return (
    <div className="px-4 pb-8">
      <p className="text-footnote font-semibold uppercase tracking-wide text-accent">
        {quiz.title} · {format(at, "d MMM yyyy")}
      </p>
      {outcomes.map((o, i) => (
        <section key={o.id} className={i ? "pt-6" : "pt-1"}>
          {i > 0 && <p className="text-footnote text-label-2">Also close to</p>}
          <h2 className="text-title-1 font-bold tracking-tight">{o.title}</h2>
          <p className="pt-2 text-body text-label/90">{o.summary}</p>
          <h3 className="pt-4 text-headline font-semibold">Strengths</h3>
          <List items={o.strengths} />
          <h3 className="pt-4 text-headline font-semibold">Room to grow</h3>
          <List items={o.growth} />
          <div className="mt-4 rounded-card bg-accent-soft p-4">
            <p className="text-subhead font-semibold text-accent">
              Try this week
            </p>
            <p className="pt-1 text-body">{o.tryThisWeek}</p>
          </div>
        </section>
      ))}

      {quiz.id === "love-expression" && (
        <p className="pt-4 text-footnote text-label-2">
          These are preferences today, not a type. Most people value all of
          them, and {partner === "them" ? "your partner" : partner} may see it
          differently.
        </p>
      )}

      <Card className="mt-6">
        <h3 className="text-headline font-semibold">{barTitle}</h3>
        {isMap && !rated ? (
          <p className="pt-2 text-subhead text-label-2">
            You did not rate any prompts, so there is no confidence picture yet.
            That is fine; the prompts are for chatting.
          </p>
        ) : (
          <div className="pt-3">
            <Bars dims={dims} scores={scores} />
          </div>
        )}
        {quiz.id === "attachment-style" && (
          <AttachmentGrid
            anxiety={scores.anxiety ?? 1}
            avoidance={scores.avoidance ?? 1}
          />
        )}
        {quiz.id === "triangle" && <TriangleShape scores={scores} />}
        {quiz.id === "conflict-horsemen" && (
          <p className="pt-3 text-footnote text-label-2">
            Counts out of 12 answers. They describe habits under stress, not a
            grade.
          </p>
        )}
        {isMap && rated > 0 && (
          <p className="pt-3 text-footnote text-label-2">
            You rated {rated} of {quiz.items.length} prompts. This shows
            confidence, not accuracy or worth.
          </p>
        )}
      </Card>

      {isMap && written.length > 0 && (
        <Card className="mt-3">
          <h3 className="text-headline font-semibold">
            What you wrote, for your next chat
          </h3>
          <p className="pt-1 text-footnote text-label-2">
            Stored only on this phone.
          </p>
          <ul className="space-y-3 pt-3">
            {written.map((it) => (
              <li key={it.id}>
                <p className="text-footnote text-label-2">
                  {personalize(it.text, partner)}
                </p>
                <p className="text-body">{texts[it.id]}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showCare && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 rounded-card bg-card px-4 text-left text-subhead"
          >
            <LifeBuoy size={18} className="text-accent" aria-hidden />
            <span className="flex-1">
              If things feel tense or unsafe, support is here
            </span>
          </button>
          {showHelp && (
            <div className="rounded-card bg-card p-4 mt-2">
              <SafetyContent />
            </div>
          )}
        </div>
      )}

      <h3 className="pt-6 text-headline font-semibold">Sources</h3>
      <ul>
        {quiz.sources.map((s) => (
          <li key={s.url} className="pt-2 text-footnote text-label-2">
            {s.cite}
            <br />
            <ExtLink href={s.url}>Open source</ExtLink>
          </li>
        ))}
      </ul>
      <p className="pt-4 text-caption text-label-3">
        Not a diagnosis — a mirror for conversation.
        {saveFailed ? " This result could not be saved on this device." : ""}
      </p>

      <div className="space-y-2 pt-5">
        <Button onClick={onDone}>Done</Button>
        <Button variant="secondary" onClick={onRetake}>
          Retake
        </Button>
      </div>
    </div>
  );
}
