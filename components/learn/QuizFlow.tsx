"use client";

import { format } from "date-fns";
import { ChevronLeft, Clock, Info, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Quiz } from "@/lib/content";
import { db, type QuizResult } from "@/lib/db";
import { type Answers, scoreQuiz } from "@/lib/quiz";
import { Button, cx } from "../ui";
import { outcomesFor, personalize, QuizResultView } from "./QuizResultView";

type Stage =
  | { k: "intro" }
  | { k: "q"; idx: number }
  | { k: "result"; answers: Answers; at: number; saveFailed?: boolean };

const ADVANCE_MS = 200;

function OptionRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "flex min-h-[52px] w-full items-center rounded-card px-4 py-3 text-left text-body transition-colors duration-150",
        selected
          ? "bg-accent-soft ring-2 ring-accent"
          : "bg-card active:bg-card-2",
      )}
    >
      {children}
    </button>
  );
}

export function QuizFlow({
  quiz,
  history,
  partner,
  onClose,
}: {
  quiz: Quiz;
  /** Saved results for this quiz, newest first. */
  history: QuizResult[];
  partner: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>({ k: "intro" });
  const [answers, setAnswers] = useState<Answers>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const total = quiz.items.length;
  const personal = (t: string) => personalize(t, partner);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus to the new screen's heading so VoiceOver announces it.
  const stageKey = stage.k === "q" ? `q${stage.idx}` : stage.k;
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus on every screen change
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stageKey]);

  const finish = useCallback(
    async (final: Answers, finalTexts: Record<string, string>) => {
      const at = Date.now();
      const { outcomeIds, scores } = scoreQuiz(quiz, final);
      let saveFailed = false;
      try {
        await db.quizResults.add({
          quizId: quiz.id,
          at,
          answers: final,
          outcomeId: outcomeIds[0],
          scores,
          ...(quiz.id === "love-map" && { texts: finalTexts }),
        });
      } catch {
        saveFailed = true;
      }
      setStage({ k: "result", answers: final, at, saveFailed });
    },
    [quiz],
  );

  const go = (idx: number, next: Answers, nextTexts = texts) => {
    clearTimeout(timer.current);
    if (idx >= total) void finish(next, nextTexts);
    else setStage({ k: "q", idx });
  };

  const choose = (idx: number, itemId: string, value: number) => {
    const next = { ...answers, [itemId]: value };
    setAnswers(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(idx + 1, next), ADVANCE_MS);
  };

  const start = () => {
    setAnswers({});
    setTexts({});
    setStage({ k: "q", idx: 0 });
  };

  const item = stage.k === "q" ? quiz.items[stage.idx] : undefined;
  const scale = quiz.scale;

  const body = (() => {
    if (stage.k === "intro") {
      const Icon = Info;
      const strong = quiz.id === "love-expression";
      return (
        <div className="px-4 pb-8">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="pt-2 text-large-title font-bold tracking-tight outline-none"
          >
            {quiz.title}
          </h1>
          <p className="flex items-center gap-1.5 pt-1 text-subhead text-label-2">
            <Clock size={15} aria-hidden /> {quiz.minutes} min · {total}{" "}
            {total === 1 ? "prompt" : "prompts"}
          </p>
          <p className="pt-3 text-body text-label/90">{quiz.subtitle}</p>

          <div
            className={cx(
              "mt-5 rounded-card bg-accent-soft p-4",
              strong && "ring-2 ring-accent",
            )}
          >
            <p className="flex items-center gap-1.5 text-subhead font-semibold text-accent">
              <Icon size={16} aria-hidden />
              {strong ? "How sure are we? Honestly, not very." : "Good to know"}
            </p>
            <p className={cx("pt-1.5", strong ? "text-body" : "text-subhead")}>
              {quiz.caveat}
            </p>
          </div>
          <p className="pt-3 text-footnote text-label-2">
            Not a diagnosis — a mirror for conversation. Your answers stay on
            this phone.
          </p>

          <div className="pt-5">
            <Button onClick={start}>
              {history.length ? "Take it again" : "Start"}
            </Button>
          </div>

          {history.length > 0 && (
            <div className="pt-6">
              <h2 className="text-headline font-semibold">
                Your earlier results
              </h2>
              <ul className="mt-2 overflow-hidden rounded-card bg-card [&>*+*]:border-t [&>*+*]:border-separator">
                {history.map((r) => {
                  const titles = outcomesFor(quiz, r.answers)
                    .map((o) => o.title)
                    .join(" & ");
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setStage({
                            k: "result",
                            answers: r.answers,
                            at: r.at,
                          })
                        }
                        className="flex min-h-12 w-full flex-col justify-center px-4 py-2 text-left active:bg-card-2"
                      >
                        <span className="text-body">{titles}</span>
                        <span className="text-footnote text-label-2">
                          {format(r.at, "d MMM yyyy, p")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (stage.k === "result") {
      return (
        <QuizResultView
          quiz={quiz}
          answers={stage.answers}
          at={stage.at}
          partner={partner}
          saveFailed={stage.saveFailed}
          onRetake={start}
          onDone={onClose}
        />
      );
    }

    if (!item) return null;
    const idx = (stage as { idx: number }).idx;
    return (
      <div className="px-4 pb-8">
        <h2
          ref={headingRef}
          tabIndex={-1}
          id="quiz-q"
          className="pt-2 pb-5 text-title-2 font-bold outline-none"
        >
          {personal(item.text)}
        </h2>

        {scale.type === "likert" && (
          // biome-ignore lint/a11y/useSemanticElements: labelled button group, not a form fieldset
          <div role="group" aria-labelledby="quiz-q" className="space-y-2">
            {scale.labels.map((label, i) => {
              const value = scale.min + i;
              return (
                <OptionRow
                  key={label}
                  selected={answers[item.id] === value}
                  onClick={() => choose(idx, item.id, value)}
                >
                  {label}
                </OptionRow>
              );
            })}
          </div>
        )}

        {scale.type === "choice" && item.options && (
          // biome-ignore lint/a11y/useSemanticElements: labelled button group, not a form fieldset
          <div role="group" aria-labelledby="quiz-q" className="space-y-2">
            {item.options.map((o, i) => (
              <OptionRow
                key={o.text}
                selected={answers[item.id] === i}
                onClick={() => choose(idx, item.id, i)}
              >
                {personal(o.text)}
              </OptionRow>
            ))}
          </div>
        )}

        {scale.type === "open" && (
          <div>
            <label className="sr-only" htmlFor="quiz-text">
              Your answer
            </label>
            <textarea
              id="quiz-text"
              rows={4}
              value={texts[item.id] ?? ""}
              onChange={(e) =>
                setTexts((t) => ({ ...t, [item.id]: e.target.value }))
              }
              placeholder="Write what you think, or leave it blank"
              className="w-full resize-none rounded-card bg-card p-4 text-body outline-none placeholder:text-label-3 focus:ring-2 focus:ring-accent"
            />
            <p id="quiz-conf" className="pt-5 text-subhead text-label-2">
              {scale.selfRating.question} (optional)
            </p>
            {/* biome-ignore lint/a11y/useSemanticElements: labelled button group */}
            <div
              role="group"
              aria-labelledby="quiz-conf"
              className="grid grid-cols-5 gap-2 pt-2"
            >
              {Array.from(
                { length: scale.selfRating.max - scale.selfRating.min + 1 },
                (_, i) => scale.selfRating.min + i,
              ).map((v) => {
                const sel = answers[item.id] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={sel}
                    aria-label={`${v}, ${scale.selfRating.labels[v - scale.selfRating.min]}`}
                    onClick={() =>
                      setAnswers((a) => {
                        const n = { ...a };
                        if (sel) delete n[item.id];
                        else n[item.id] = v;
                        return n;
                      })
                    }
                    className={cx(
                      "tnum h-12 rounded-card font-rounded text-title-3 font-semibold",
                      sel
                        ? "bg-accent-soft text-accent ring-2 ring-accent"
                        : "bg-card active:bg-card-2",
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <p className="min-h-5 pt-1.5 text-center text-footnote text-label-2">
              {answers[item.id] !== undefined
                ? scale.selfRating.labels[
                    answers[item.id] - scale.selfRating.min
                  ]
                : "Tap again to clear"}
            </p>
            <div className="space-y-2 pt-4">
              <Button onClick={() => go(idx + 1, answers)}>
                {idx + 1 >= total ? "See my reflection" : "Next"}
              </Button>
              <Button variant="plain" onClick={() => go(idx + 1, answers)}>
                Skip this one
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  })();

  const inQuestion = stage.k === "q";
  const progress = stage.k === "q" ? stage.idx / total : 1;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={quiz.title}
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="pt-safe pb-safe fixed inset-0 z-[60] flex flex-col bg-bg"
    >
      <div className="mx-auto flex w-full max-w-[520px] items-center gap-2 px-2 pt-2">
        {inQuestion && stage.k === "q" ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() =>
              stage.idx === 0
                ? setStage({ k: "intro" })
                : go(stage.idx - 1, answers)
            }
            className="flex size-11 shrink-0 items-center justify-center text-accent"
          >
            <ChevronLeft size={26} />
          </button>
        ) : (
          <span className="size-11 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {inQuestion && stage.k === "q" && (
            <>
              <div
                role="progressbar"
                aria-label="Progress"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={stage.idx + 1}
                aria-valuetext={`Question ${stage.idx + 1} of ${total}`}
                className="h-1 overflow-hidden rounded-full bg-card-3"
              >
                <motion.div
                  className="h-full origin-left rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleX: Math.max(progress, 0.03) }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                />
              </div>
              <p className="tnum pt-1 text-center text-caption text-label-2">
                {stage.idx + 1} of {total}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-label-2"
        >
          <X size={22} />
        </button>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-[520px] flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stageKey}
            initial={{ opacity: 0, x: reduce ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body,
  );
}
