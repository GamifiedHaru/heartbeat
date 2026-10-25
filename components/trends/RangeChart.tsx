"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Range, RangeSummary } from "@/lib/analytics";
import { approxTime, formatAvg, niceTicks, xAxisInterval } from "@/lib/trends";
import { Card, Stat } from "../ui";

function bucketTitle(range: Range, start: number) {
  switch (range) {
    case "D":
      return format(start, "h a");
    case "W":
    case "M":
      return format(start, "EEEE, d MMM yyyy");
    case "6M":
      return `Week of ${format(start, "d MMM yyyy")}`;
    case "Y":
      return format(start, "MMMM yyyy");
  }
}

export function RangeChart({
  summary,
  range,
  offset,
  selected,
  onSelect,
  onStep,
}: {
  summary: RangeSummary;
  range: Range;
  offset: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onStep: (delta: number) => void;
}) {
  const sel = selected !== null ? summary.buckets[selected] : undefined;
  const maxCount = Math.max(0, ...summary.buckets.map((b) => b.count));
  const { ticks, top } = niceTicks(Math.max(maxCount, summary.avgPerBucket));
  const data = summary.buckets.map((b, i) => ({
    i,
    label: b.label,
    count: b.count,
  }));

  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  const perDay = range !== "D";
  const label = sel ? "BEATS" : perDay ? "AVERAGE" : "TOTAL";
  const value = sel
    ? sel.count
    : perDay
      ? formatAvg(summary.avgPerDay)
      : summary.total;
  const unit = sel
    ? sel.count === 1
      ? "beat"
      : "beats"
    : perDay
      ? "beats/day"
      : "beats";
  const timeLine = sel
    ? approxTime(sel.minutes)
    : approxTime(
        perDay ? summary.avgMinutesPerDay : summary.totalMinutes,
        perDay ? "a day" : "",
      );
  const dateLine = sel ? bucketTitle(range, sel.start) : summary.title;

  const summaryText = `${summary.title}: ${summary.total} beats. ${data
    .filter((d) => d.count)
    .map((d) => `${d.label}: ${d.count}`)
    .join(", ")}`;

  return (
    <Card className="mt-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-footnote font-semibold uppercase tracking-wide text-label-2">
            {label}
          </p>
          <Stat value={value} unit={unit} />
          <p className="text-subhead text-label-2">{timeLine}</p>
          <p className="text-subhead text-label-2">{dateLine}</p>
        </div>
        <div className="-mt-2 -mr-2 flex shrink-0">
          <button
            type="button"
            aria-label="Earlier"
            onClick={() => onStep(-1)}
            className="flex size-11 items-center justify-center text-accent active:opacity-50"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Later"
            disabled={offset >= 0}
            onClick={() => onStep(1)}
            className="flex size-11 items-center justify-center text-accent active:opacity-50 disabled:text-label-3"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      <div
        role="img"
        aria-label={summaryText}
        className="relative -mx-1 mt-3 h-[220px] touch-pan-y"
        onPointerDown={(e) => {
          startX.current = e.clientX;
          moved.current = false;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) {
            moved.current = true;
            onStep(dx > 0 ? -1 : 1);
          }
        }}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={range === "M" || range === "6M" ? "12%" : "22%"}
          >
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={xAxisInterval(range)}
              tick={{ fill: "var(--label-3)", fontSize: 11 }}
              height={24}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              ticks={ticks}
              domain={[0, top]}
              width={28}
              allowDecimals={false}
              tick={{ fill: "var(--label-3)", fontSize: 11 }}
            />
            {ticks.slice(1).map((t) => (
              <ReferenceLine
                key={t}
                y={t}
                stroke="var(--separator)"
                strokeOpacity={0.5}
              />
            ))}
            {summary.avgPerBucket > 0 && (
              <ReferenceLine
                y={summary.avgPerBucket}
                stroke="var(--label-2)"
                strokeDasharray="4 3"
                label={{
                  value: "avg",
                  position: "insideTopLeft",
                  fill: "var(--label-2)",
                  fontSize: 11,
                }}
              />
            )}
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              minPointSize={0}
              onClick={(_, i) => {
                if (moved.current) return;
                onSelect(selected === i ? null : i);
              }}
            >
              {data.map((d) => (
                <Cell
                  key={d.i}
                  fill="var(--accent)"
                  fillOpacity={selected === null || selected === d.i ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {summary.total === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[40%] text-center text-subhead text-label-3">
            {offset === 0
              ? "No beats yet — the next one starts it"
              : "No beats in this period"}
          </p>
        )}
      </div>
    </Card>
  );
}
