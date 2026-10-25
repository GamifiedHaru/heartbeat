"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Backup,
  deleteAllData,
  exportData,
  importData,
  validateBackup,
} from "@/lib/backup";
import { updateSettings } from "@/lib/db";
import { useBeats, useSettings } from "@/lib/hooks";
import {
  Button,
  Card,
  cx,
  List,
  Row,
  ScreenHeader,
  Sheet,
  Toggle,
} from "../ui";

const DAY = 86_400_000;
const VERSION = "1.0";
const MINUTE_CHOICES = [1, 2, 3, 5];

function NameRow({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const t = text.trim();
    if (t !== value) onSave(t);
  };
  return (
    <label className="flex min-h-11 items-center gap-3 px-4 py-1.5 text-body">
      <span className="w-24 shrink-0">{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        maxLength={40}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-right text-[16px] text-label outline-none placeholder:text-label-3"
      />
    </label>
  );
}

function HowItWorks() {
  const p = "text-subhead text-label-2";
  const h = "pt-4 pb-1 text-headline font-semibold";
  return (
    <div className="pb-2">
      <h3 className={cx(h, "pt-0")}>Tap, hold, undo</h3>
      <p className={p}>
        Tap the heart each time they cross your mind. That is one beat. Hold the
        heart to log a longer thought, with an optional note and mood. Every
        beat can be undone for a few seconds, or deleted later.
      </p>
      <h3 className={h}>Private by design</h3>
      <p className={p}>
        Everything stays on this phone. There are no accounts, no tracking and
        no network calls. Only you decide when to export a backup.
      </p>
      <h3 className={h}>Add it to your Home Screen</h3>
      <ol className={cx(p, "list-decimal space-y-1 pl-5")}>
        <li>Open this page in Safari.</li>
        <li>Tap the Share button, then Add to Home Screen.</li>
        <li>Open Heartbeat from the new icon. It works offline.</li>
      </ol>
      <p className={cx(p, "pt-3")}>
        Tip: drag the icon into your Dock so it is always one tap away.
      </p>
    </div>
  );
}

export function SettingsScreen() {
  const settings = useSettings();
  const beats = useBeats();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [importing, setImporting] = useState<Backup | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  if (!settings) return <ScreenHeader title="Settings" />;
  const total = beats?.length ?? 0;
  const now = Date.now();
  const nudge =
    !settings.backupNudgeDismissedAt ||
    now - settings.backupNudgeDismissedAt > 7 * DAY
      ? settings.lastBackupAt
        ? now - settings.lastBackupAt > 30 * DAY
        : total > 50
      : false;

  const doExport = async () => {
    try {
      const backup = await exportData();
      const name = `heartbeat-backup-${format(Date.now(), "yyyy-MM-dd")}.json`;
      const file = new File([JSON.stringify(backup)], name, {
        type: "application/json",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Heartbeat backup" });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      await updateSettings({ lastBackupAt: Date.now() });
      toast.success("Backup saved. Keep it somewhere safe.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error("Couldn't make the backup. Please try again.");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 50_000_000) throw new Error("big");
      const result = validateBackup(JSON.parse(await file.text()));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setImporting(result.backup);
    } catch {
      toast.error("That file couldn't be read as a Heartbeat backup.");
    }
  };

  const runImport = async (mode: "merge" | "replace") => {
    if (!importing) return;
    try {
      const r = await importData(importing, mode);
      setImporting(null);
      toast.success(
        mode === "merge"
          ? `Added ${r.beatsAdded} beats. Nothing was overwritten.`
          : `Restored ${r.beatsAdded} beats.`,
      );
    } catch {
      toast.error("Import didn't finish, and nothing was changed.");
    }
  };

  const runDelete = async () => {
    await deleteAllData();
    setDeleteOpen(false);
    setConfirmText("");
    toast("All data deleted.");
  };

  return (
    <div className="pb-8">
      <ScreenHeader title="Settings" />

      {nudge && (
        <div className="px-4 pt-3">
          <Card>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={22} />
              <div className="flex-1">
                <p className="text-headline font-semibold">
                  A gentle backup reminder
                </p>
                <p className="pt-0.5 text-subhead text-label-2">
                  Your beats live only on this phone. A quick export keeps them
                  safe if anything happens.
                </p>
                <div className="flex gap-2 pt-3">
                  <Button className="h-11" onClick={doExport}>
                    Back up now
                  </Button>
                  <Button
                    className="h-11"
                    variant="secondary"
                    onClick={() =>
                      updateSettings({ backupNudgeDismissedAt: Date.now() })
                    }
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <List header="Partner">
        <NameRow
          label="Their name"
          value={settings.partnerName}
          placeholder="Their name"
          onSave={(v) => updateSettings({ partnerName: v })}
        />
        <NameRow
          label="Your name"
          value={settings.myName}
          placeholder="Optional"
          onSave={(v) => updateSettings({ myName: v })}
        />
      </List>

      <List
        header="Beats"
        footer="Opening the app logs one beat per cold launch, and you can undo it right away. Haptics work on recent iPhones; not all iOS versions support web haptics."
      >
        <div className="flex min-h-11 items-center gap-3 px-4 py-2">
          <span className="flex-1 text-body">Minutes per beat</span>
          <div className="flex gap-1">
            {MINUTE_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={settings.minutesPerBeat === m}
                aria-label={`${m} minutes per beat`}
                onClick={() => updateSettings({ minutesPerBeat: m })}
                className={cx(
                  "tnum size-11 rounded-full text-body font-semibold",
                  settings.minutesPerBeat === m
                    ? "bg-accent text-label"
                    : "bg-card-2 text-label-2",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Row
          right={
            <Toggle
              label="Log a beat when I open the app"
              checked={settings.autoLogOnOpen}
              onChange={(v) => updateSettings({ autoLogOnOpen: v })}
            />
          }
        >
          Log a beat when I open the app
        </Row>
        <Row
          right={
            <Toggle
              label="Haptics"
              checked={settings.haptics}
              onChange={(v) => updateSettings({ haptics: v })}
            />
          }
        >
          Haptics
        </Row>
      </List>

      <List
        header="Your data"
        footer={
          persisted === null
            ? "Your data lives only on this phone."
            : persisted
              ? "Protected from automatic cleanup."
              : "Not yet protected. Export a backup now and then."
        }
      >
        <Row onClick={doExport}>Export backup</Row>
        <Row onClick={() => fileRef.current?.click()}>Import backup</Row>
        <Row
          right={<span className="text-label-2">{total.toLocaleString()}</span>}
        >
          Total beats
        </Row>
        <Row
          right={
            <span className="text-label-2">
              {settings.lastBackupAt
                ? `${formatDistanceToNowStrict(settings.lastBackupAt)} ago`
                : "Not yet"}
            </span>
          }
        >
          Last backup
        </Row>
      </List>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <List header="About">
        <Row right={<span className="text-label-2">{VERSION}</span>}>
          Heartbeat
        </Row>
        <Row onClick={() => setHowOpen(true)}>How Heartbeat works</Row>
        <Row onClick={() => location.reload()}>Reload app</Row>
      </List>

      <List header="Danger zone">
        <Row destructive onClick={() => setDeleteOpen(true)}>
          Delete all data
        </Row>
      </List>

      <Sheet
        open={howOpen}
        onOpenChange={setHowOpen}
        title="How Heartbeat works"
      >
        <HowItWorks />
        <Button variant="secondary" onClick={() => setHowOpen(false)}>
          Got it
        </Button>
      </Sheet>

      <Sheet
        open={importing !== null}
        onOpenChange={(o) => !o && setImporting(null)}
        title="Import backup"
      >
        {importing && (
          <div className="space-y-3">
            <p className="text-center text-subhead text-label-2">
              This backup has {importing.beats.length.toLocaleString()} beats
              from {format(importing.exportedAt, "d MMM yyyy")}.
            </p>
            <Button onClick={() => runImport("merge")}>
              <HeartPulse size={20} />
              Merge with what I have
            </Button>
            <p className="px-2 text-center text-footnote text-label-2">
              Merge adds beats you don't have yet and keeps everything else.
            </p>
            <Button variant="secondary" onClick={() => runImport("replace")}>
              Replace everything
            </Button>
            <p className="px-2 text-center text-footnote text-label-2">
              Replace swaps your current data for the backup.
            </p>
            <Button variant="plain" onClick={() => setImporting(null)}>
              Cancel
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setConfirmText("");
        }}
        title="Delete all data?"
      >
        <div className="space-y-3">
          <p className="text-subhead text-label-2">
            This removes every beat, quiz result and setting from this phone,
            and takes you back to the start. It can't be undone, so consider
            exporting a backup first.
          </p>
          <label className="block text-footnote text-label-2">
            Type DELETE to confirm
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              className="mt-1.5 h-11 w-full rounded-[10px] bg-card-2 px-3 text-[16px] text-label outline-none"
            />
          </label>
          <Button
            disabled={confirmText.trim() !== "DELETE"}
            onClick={runDelete}
          >
            Delete everything
          </Button>
          <Button variant="plain" onClick={() => setDeleteOpen(false)}>
            Keep my data
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
