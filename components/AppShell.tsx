"use client";

import { BookHeart, ChartColumn, Heart, Settings } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { setHapticsEnabled } from "@/lib/haptics";
import { useSettings } from "@/lib/hooks";
import { Onboarding } from "./Onboarding";
import { TodayScreen } from "./today/TodayScreen";
import { cx, preloadSheet } from "./ui";

// Recharts is heavy: keep it off the critical path of the Today tab.
const TrendsScreen = dynamic(
  () => import("./trends/TrendsScreen").then((m) => m.TrendsScreen),
  { ssr: false },
);
const LearnScreen = dynamic(
  () => import("./learn/LearnScreen").then((m) => m.LearnScreen),
  { ssr: false },
);
const SettingsScreen = dynamic(
  () => import("./settings/SettingsScreen").then((m) => m.SettingsScreen),
  { ssr: false },
);

export type Tab = "today" | "trends" | "learn" | "settings";

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: "today", label: "Today", icon: Heart },
  { id: "trends", label: "Trends", icon: ChartColumn },
  { id: "learn", label: "Learn", icon: BookHeart },
  { id: "settings", label: "Settings", icon: Settings },
];

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "today";
  const h = window.location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? "today") as Tab;
}

/** App-wide providers: OS reduced-motion for every Motion animation, and toasts on every screen. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="top-center"
        offset="calc(env(safe-area-inset-top) + 8px)"
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
        toastOptions={{
          style: {
            background: "var(--card-2)",
            color: "var(--label)",
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
          },
        }}
      />
    </MotionConfig>
  );
}

export function AppShell() {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("today");
  const scroller = useRef<HTMLElement>(null);

  useEffect(() => {
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      import("@/lib/demo").then((m) => {
        (window as unknown as { seedDemo: typeof m.seedDemo }).seedDemo =
          m.seedDemo;
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(preloadSheet, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (settings) setHapticsEnabled(settings.haptics);
  }, [settings]);

  const go = (t: Tab) => {
    if (t === tab) {
      scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    history.replaceState(null, "", t === "today" ? " " : `#${t}`);
    setTab(t);
    scroller.current?.scrollTo({ top: 0 });
  };

  if (!settings) {
    return <div className="h-dvh bg-bg" />;
  }

  if (!settings.onboarded) {
    return (
      <Frame>
        <Onboarding />
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex h-dvh flex-col overflow-hidden">
        <main
          ref={scroller}
          className="pt-safe no-scrollbar flex-1 overflow-y-auto overscroll-contain"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="mx-auto max-w-[520px] pb-8"
            >
              {tab === "today" && <TodayScreen onNavigate={go} />}
              {tab === "trends" && <TrendsScreen />}
              {tab === "learn" && <LearnScreen />}
              {tab === "settings" && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav
          aria-label="Tabs"
          className="pb-safe shrink-0 border-t border-separator bg-tabbar backdrop-blur-xl"
        >
          <div className="mx-auto grid h-[49px] max-w-[520px] grid-cols-4">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                    active ? "text-accent" : "text-label-3",
                  )}
                >
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.2 : 1.8}
                    fill={active && id === "today" ? "currentColor" : "none"}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </Frame>
  );
}
