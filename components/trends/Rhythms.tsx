"use client";

import { Clock, Grid3x3 } from "lucide-react";
import { useMemo } from "react";
import { hourHistogram, weekdayHourGrid } from "@/lib/analytics";
import { clockSummary, sqrtRadius, wedgePath } from "@/lib/trends";
import { Card, CardHeader } from "../ui";

const HOUR_LABELS: [number, string][] = [
  [0, "12AM"],
  [6, "6AM"],
  [12, "12PM"],
  [18, "6PM"],
];

export function ClockCard({
  beats,
  scopeNote,
  name,
  currentHour,
}: {
  beats: { at: number; minutes: number }[];
  scopeNote: string;
  name: string;
  currentHour: number;
}) {
  const hist = useMemo(() => hourHistogram(beats), [beats]);
  const max = Math.max(0, ...hist);
  const S = 240;
  const c = S / 2;
  const r0 = 22;
  const rMax = 84;
  const aria = `Beats by hour of day. ${clockSummary(hist)}`;
  return (
    <Card className="mt-3">
      <CardHeader
        icon={<Clock size={16} />}
        title={`When you think of ${name}`}
      />
      <svg
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-label={aria}
        className="mx-auto mt-2 block w-full max-w-[280px]"
      >
        <circle
          cx={c}
          cy={c}
          r={rMax}
          fill="none"
          stroke="var(--card-3)"
          strokeOpacity={0.5}
        />
        <circle
          cx={c}
          cy={c}
          r={r0}
          fill="none"
          stroke="var(--card-3)"
          strokeOpacity={0.5}
        />
        {hist.map((n, h) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 24 hours
            key={h}
            d={wedgePath(c, c, r0, sqrtRadius(n, max, r0 + 3, rMax), h)}
            fill={n ? "var(--accent)" : "var(--card-3)"}
            fillOpacity={n ? 0.4 + 0.6 * Math.sqrt(n / max) : 0.5}
          />
        ))}
        <path
          d={wedgePath(c, c, rMax + 3, rMax + 6, currentHour, 0)}
          fill="var(--label-2)"
        />
        {HOUR_LABELS.map(([h, t]) => {
          const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
          return (
            <text
              key={t}
              x={c + (rMax + 16) * Math.cos(a)}
              y={c + (rMax + 16) * Math.sin(a)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--label-3)"
            >
              {t}
            </text>
          );
        })}
      </svg>
      <p className="pt-2 text-subhead">{clockSummary(hist)}</p>
      <p className="text-footnote text-label-3">{scopeNote}</p>
    </Card>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Punchcard({
  beats,
}: {
  beats: { at: number; minutes: number }[];
}) {
  const grid = useMemo(() => weekdayHourGrid(beats), [beats]);
  const max = Math.max(0, ...grid.flat());
  const W = 326;
  const left = 28;
  const colW = (W - left) / 24;
  const rowH = 20;
  const H = rowH * 7 + 18;
  return (
    <Card className="mt-3">
      <CardHeader icon={<Grid3x3 size={16} />} title="Week rhythm" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Beats by weekday and hour of day"
        className="mt-3 block w-full"
      >
        {grid.map((row, d) => (
          <g key={DAYS[d]}>
            <text
              x={0}
              y={d * rowH + rowH / 2}
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--label-3)"
            >
              {DAYS[d]}
            </text>
            {row.map((n, h) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed 24 hours
                key={h}
                cx={left + h * colW + colW / 2}
                cy={d * rowH + rowH / 2}
                r={n ? 1.5 + sqrtRadius(n, max, 0, 1) * (colW / 2 - 1.5) : 1}
                fill={n ? "var(--accent)" : "var(--card-3)"}
              />
            ))}
          </g>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <text
            key={h}
            x={left + h * colW}
            y={H - 4}
            fontSize={10}
            fill="var(--label-3)"
          >
            {h === 0
              ? "12AM"
              : h === 12
                ? "12PM"
                : h > 12
                  ? `${h - 12}PM`
                  : `${h}AM`}
          </text>
        ))}
      </svg>
    </Card>
  );
}
