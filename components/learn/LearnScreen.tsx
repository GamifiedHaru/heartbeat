"use client";

import { format } from "date-fns";
import {
  BookOpenText,
  Clock,
  Flower2,
  HandHeart,
  HeartHandshake,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  MessageCircleHeart,
  MessagesSquare,
  Triangle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { insights, loadQuizzes, type Quiz } from "@/lib/content";
import type { QuizResult } from "@/lib/db";
import { partnerName, useQuizResults, useSettings } from "@/lib/hooks";
import { Card, cx, List, Row, ScreenHeader, SectionTitle, Sheet } from "../ui";
import { DailyInsightCard } from "./DailyInsightCard";
import { ExtLink, InsightDetail } from "./InsightDetail";
import { QuizFlow } from "./QuizFlow";
import { outcomesFor } from "./QuizResultView";
import { SafetyContent } from "./SafetyContent";

const QUIZ_ICONS: Record<string, LucideIcon> = {
  "love-expression": MessageCircleHeart,
  "attachment-style": HeartHandshake,
  "love-map": MapPin,
  triangle: Triangle,
  "conflict-horsemen": MessagesSquare,
  "love-styles": Flower2,
};

type SheetKind = "insight" | "sources" | "help" | null;

function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  useEffect(() => {
    let live = true;
    loadQuizzes().then((q) => live && setQuizzes(q));
    return () => {
      live = false;
    };
  }, []);
  return quizzes;
}

function QuizCard({
  quiz,
  latest,
  onOpen,
}: {
  quiz: Quiz;
  latest?: QuizResult;
  onOpen: () => void;
}) {
  const Icon = QUIZ_ICONS[quiz.id] ?? HandHeart;
  const titles = latest
    ? outcomesFor(quiz, latest.answers)
        .map((o) => o.title)
        .join(" & ")
    : "";
  return (
    <Card
      onClick={onOpen}
      label={`${quiz.title}. ${quiz.minutes} minutes.${
        latest ? ` Last result: ${titles}, ${format(latest.at, "d MMMM")}.` : ""
      }`}
      className="flex h-full min-h-[168px] flex-col p-3.5"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={19} aria-hidden />
      </span>
      <span className="block pt-2 text-subhead font-semibold leading-tight">
        {quiz.title}
      </span>
      <span className="line-clamp-2 block pt-0.5 text-footnote text-label-2">
        {quiz.subtitle}
      </span>
      <span className="mt-auto flex flex-col gap-0.5 pt-2 text-footnote">
        <span className="flex items-center gap-1 text-label-3">
          <Clock size={12} aria-hidden /> {quiz.minutes} min
        </span>
        {latest && (
          <span className="line-clamp-2 font-semibold text-accent">
            {titles} · {format(latest.at, "d MMM")}
          </span>
        )}
      </span>
    </Card>
  );
}

export function LearnScreen() {
  const settings = useSettings();
  const partner = partnerName(settings);
  const quizzes = useQuizzes();
  const results = useQuizResults();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [insightId, setInsightId] = useState(insights[0].id);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [concept, setConcept] = useState("All");

  const concepts = useMemo(
    () => ["All", ...Array.from(new Set(insights.map((i) => i.concept)))],
    [],
  );
  const groups = useMemo(() => {
    const m = new Map<string, typeof insights>();
    for (const i of insights) {
      if (concept !== "All" && i.concept !== concept) continue;
      m.set(i.concept, [...(m.get(i.concept) ?? []), i]);
    }
    return [...m.entries()];
  }, [concept]);

  const byQuiz = useMemo(() => {
    const m = new Map<string, QuizResult[]>();
    for (const r of results ?? []) {
      m.set(r.quizId, [r, ...(m.get(r.quizId) ?? [])]);
    }
    return m;
  }, [results]);

  const sources = useMemo(() => {
    const m = new Map<string, { cite: string; url: string }>();
    for (const i of insights) m.set(i.url, { cite: i.source, url: i.url });
    for (const s of (quizzes ?? []).flatMap((q) => q.sources)) {
      const prev = m.get(s.url);
      if (!prev || s.cite.length > prev.cite.length) m.set(s.url, s);
    }
    return [...m.values()].sort((a, b) => a.cite.localeCompare(b.cite));
  }, [quizzes]);

  const insight = insights.find((i) => i.id === insightId) ?? insights[0];
  const openQuiz = quizzes?.find((q) => q.id === quizId);

  return (
    <div>
      <ScreenHeader title="Learn" />
      <p className="px-4 text-subhead text-label-2">
        Small ideas from relationship research, for you and{" "}
        {partner === "them" ? "your partner" : partner}. For reflection, not
        therapy advice.
      </p>

      <div className="px-4">
        <DailyInsightCard
          onOpenLearn={() =>
            document
              .getElementById("browse-insights")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>

      <SectionTitle>Quizzes</SectionTitle>
      <div className="grid grid-cols-2 gap-3 px-4">
        {quizzes
          ? quizzes.map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                latest={byQuiz.get(q.id)?.[0]}
                onOpen={() => setQuizId(q.id)}
              />
            ))
          : Array.from({ length: 6 }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                key={i}
                aria-hidden
                className="h-[168px] rounded-card bg-card"
              />
            ))}
      </div>

      <div id="browse-insights">
        <SectionTitle>Browse insights</SectionTitle>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: labelled chip group */}
      <div
        className="no-scrollbar -mt-1 flex gap-2 overflow-x-auto px-4"
        role="group"
        aria-label="Filter by concept"
      >
        {concepts.map((c) => {
          const active = c === concept;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setConcept(c)}
              className="flex h-11 shrink-0 items-center"
            >
              <span
                className={cx(
                  "flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-footnote font-semibold",
                  active ? "bg-accent text-label" : "bg-card text-label-2",
                )}
              >
                {c}
              </span>
            </button>
          );
        })}
      </div>

      {groups.map(([name, list]) => (
        <div key={name} className="px-4 pt-3">
          <p className="px-4 pb-1.5 text-footnote uppercase text-label-2">
            {name}
          </p>
          <div className="overflow-hidden rounded-card bg-card [&>*+*]:border-t [&>*+*]:border-separator">
            {list.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => {
                  setInsightId(i.id);
                  setSheet("insight");
                }}
                className="block min-h-11 w-full px-4 py-2.5 text-left active:bg-card-2"
              >
                <span className="block text-body">{i.title}</span>
                <span className="line-clamp-2 block text-footnote text-label-2">
                  {i.body}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <List>
        <Row onClick={() => setSheet("sources")}>
          <span className="flex items-center gap-3">
            <BookOpenText size={20} className="text-accent" aria-hidden />
            Sources
          </span>
        </Row>
        <Row onClick={() => setSheet("help")}>
          <span className="flex items-center gap-3">
            <LifeBuoy size={20} className="text-accent" aria-hidden />
            If things don&apos;t feel right
          </span>
        </Row>
      </List>

      <Sheet
        open={sheet === "insight"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Insight"
      >
        <InsightDetail insight={insight} />
      </Sheet>

      <Sheet
        open={sheet === "sources"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Sources"
      >
        <p className="pb-2 text-subhead text-label-2">
          Every idea in Heartbeat traces back to published research. Some
          popular ideas have limited evidence; the cards and quizzes say so.
          Links open in a new tab.
        </p>
        <ul>
          {sources.map((s) => (
            <li
              key={s.url}
              className="border-t border-separator py-2 first:border-t-0"
            >
              <p className="text-footnote text-label">{s.cite}</p>
              <ExtLink href={s.url}>Open source</ExtLink>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet
        open={sheet === "help"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="If things don't feel right"
      >
        <SafetyContent />
      </Sheet>

      {openQuiz && (
        <QuizFlow
          // Remount for each quiz so state never leaks between them.
          key={openQuiz.id}
          quiz={openQuiz}
          history={byQuiz.get(openQuiz.id) ?? []}
          partner={partner}
          onClose={() => setQuizId(null)}
        />
      )}
    </div>
  );
}
