"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { insightForDate } from "@/lib/content";
import { useNow, useSettings } from "@/lib/hooks";
import { Button, Card, CardHeader, Sheet } from "../ui";
import { InsightDetail } from "./InsightDetail";

export function DailyInsightCard({ onOpenLearn }: { onOpenLearn: () => void }) {
  const now = useNow(60_000);
  const since = useSettings()?.createdAt;
  const insight = useMemo(
    () => insightForDate(new Date(now), undefined, since || undefined),
    [now, since],
  );
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        className="mt-3"
        onClick={() => setOpen(true)}
        label={`Today's insight: ${insight.title}. Open`}
      >
        <CardHeader
          icon={<Sparkles size={16} />}
          title="Today's insight"
          chevron
        />
        <h3 className="pt-2 text-headline font-semibold">{insight.title}</h3>
        <p className="line-clamp-3 pt-0.5 text-subhead text-label-2">
          {insight.body}
        </p>
        <div className="mt-3 border-t border-separator pt-3">
          <p className="text-subhead">
            <span className="font-semibold text-accent">Try this </span>
            {insight.try}
          </p>
          <p className="pt-2 text-caption text-label-3">{insight.source}</p>
        </div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen} title="Today's insight">
        <InsightDetail insight={insight} />
        <div className="pt-3">
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              onOpenLearn();
            }}
          >
            More in Learn
          </Button>
        </div>
      </Sheet>
    </>
  );
}
