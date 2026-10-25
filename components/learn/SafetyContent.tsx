"use client";

import { ExtLink } from "./InsightDetail";

const RESOURCES = [
  {
    name: "National Domestic Violence Hotline (US)",
    site: "thehotline.org",
    url: "https://www.thehotline.org",
  },
  {
    name: "National Domestic Abuse Helpline (UK)",
    site: "nationaldahelpline.org.uk",
    url: "https://www.nationaldahelpline.org.uk",
  },
  {
    name: "1800RESPECT (Australia)",
    site: "1800respect.org.au",
    url: "https://www.1800respect.org.au",
  },
  {
    name: "American Psychological Association: couples therapy guide",
    site: "apa.org",
    url: "https://www.apa.org/topics/divorce/couples-therapy",
  },
];

/** Calm, non-alarmist text on healthy vs harmful patterns, plus resources.
 *  Organisation names and websites only (phone numbers change). */
export function SafetyContent() {
  return (
    <div className="pb-2 text-body">
      <p className="text-label/90">
        Every couple argues, and most rough patches are about habits that can
        change. A few things are different in kind. They are worth noticing, and
        they are never your job to fix.
      </p>

      <h3 className="pt-5 text-headline font-semibold">
        Often part of a healthy relationship
      </h3>
      <ul className="list-disc space-y-1 pt-2 pl-5 text-subhead text-label-2">
        <li>You can say no, or disagree, and still feel safe.</li>
        <li>Each of you has your own friends, time and say over money.</li>
        <li>After a tense moment, one of you reaches out and repairs.</li>
        <li>Apologies are real, and things change afterwards.</li>
      </ul>

      <h3 className="pt-5 text-headline font-semibold">
        Patterns that deserve support
      </h3>
      <ul className="list-disc space-y-1 pt-2 pl-5 text-subhead text-label-2">
        <li>Feeling afraid of your partner, or walking on eggshells.</li>
        <li>Being monitored, or kept from friends and family.</li>
        <li>Money, phone or movements controlled by someone else.</li>
        <li>Threats, intimidation, or being humiliated or belittled.</li>
        <li>Pressure around sex or intimacy.</li>
      </ul>
      <p className="pt-3 text-subhead text-label-2">
        Contempt or long silences are signs a relationship needs attention, not
        a verdict on a person. Communication tips are not meant for situations
        involving fear or control, and healthy relationships can also end.
        Whatever you choose is yours to choose.
      </p>

      <h3 className="pt-5 text-headline font-semibold">
        Where to find support
      </h3>
      <p className="pt-1 text-subhead text-label-2">
        If you ever feel afraid, controlled or unsafe, you deserve support. If
        you are in immediate danger, call your local emergency number.
        Elsewhere, search for a local domestic-violence helpline.
      </p>
      <ul className="pt-2">
        {RESOURCES.map((r) => (
          <li
            key={r.url}
            className="border-t border-separator py-2 first:border-t-0"
          >
            <p className="text-subhead font-semibold">{r.name}</p>
            <ExtLink href={r.url}>{r.site}</ExtLink>
          </li>
        ))}
      </ul>
      <p className="pt-1 text-subhead text-label-2">
        For ongoing stuck patterns, a licensed couples therapist (for example
        EFT or Gottman-trained) can help.
      </p>
      <p className="pt-3 text-caption text-label-3">
        Heartbeat is for reflection, not therapy advice. Nothing here leaves
        your phone.
      </p>
    </div>
  );
}
