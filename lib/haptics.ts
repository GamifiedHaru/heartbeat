// iOS has no Vibration API. Toggling a hidden <input type="checkbox" switch>
// fires the system selection haptic on iOS 17.4+ (not guaranteed in every
// iOS version or in standalone mode), so this is a best-effort enhancement.
let label: HTMLLabelElement | null = null;

function ensureSwitch() {
  if (label || typeof document === "undefined") return label;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "__haptic";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  label = document.createElement("label");
  label.htmlFor = "__haptic";
  label.setAttribute("aria-hidden", "true");
  label.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

let enabled = true;
export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function haptic() {
  if (!enabled) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
      return;
    }
    ensureSwitch()?.click();
  } catch {
    // Haptics are a nicety; never let them break a tap.
  }
}
