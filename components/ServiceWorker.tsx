"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const announce = (worker: ServiceWorker) => {
      toast("New version ready", {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Reload",
          onClick: () => {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
            worker.postMessage("SKIP_WAITING");
          },
        },
      });
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register(`${base}/sw.js`, {
          scope: `${base}/`,
        });
        if (reg.waiting && navigator.serviceWorker.controller) {
          announce(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) {
              announce(w);
            }
          });
        });
      } catch {
        // Offline support is a bonus; the app works without it.
      }
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
