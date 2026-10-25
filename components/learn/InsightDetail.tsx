"use client";

import { ExternalLink, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import type { Insight } from "@/lib/content";

/** Outbound link (new tab). The only kind of external link in the app. */
export function ExtLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 text-subhead text-accent ${className ?? ""}`}
    >
      <span>{children}</span>
      <ExternalLink size={14} aria-hidden className="shrink-0" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Full insight card, used inside sheets. */
export function InsightDetail({ insight }: { insight: Insight }) {
  return (
    <article className="pb-2">
      <p className="text-footnote font-semibold uppercase tracking-wide text-accent">
        {insight.concept}
      </p>
      <h3 className="pt-1 text-title-2 font-bold">{insight.title}</h3>
      <p className="pt-3 text-body text-label/90">{insight.body}</p>
      <div className="mt-4 rounded-card bg-accent-soft p-4">
        <p className="flex items-center gap-1.5 text-subhead font-semibold text-accent">
          <Lightbulb size={16} aria-hidden /> Try this
        </p>
        <p className="pt-1 text-body">{insight.try}</p>
      </div>
      <p className="pt-4 text-footnote text-label-2">
        Source: {insight.source}
      </p>
      <ExtLink href={insight.url}>Read the source</ExtLink>
      <p className="pt-2 text-caption text-label-3">
        For reflection, not therapy advice.
      </p>
    </article>
  );
}
