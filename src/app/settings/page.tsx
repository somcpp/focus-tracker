"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Download, Moon, Pencil, Plus, ShieldCheck, Sun, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isStoragePersisted, requestPersistentStorage } from "@/lib/persist";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/time";
import { CategoryIcon } from "@/lib/icons";
import type { Category, PersistedState } from "@/lib/types";
import { CategoryForm } from "@/components/CategoryForm";
import { Button, IconButton, PageHeader, toast } from "@/components/ui";

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Goals, categories, preferences and data." />
      <div className="flex flex-col gap-4">
        <Section title="General" description="How the app greets and looks for you.">
          <Field label="Display name" hint="Used in the greeting on Today">
            <input
              value={settings.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              placeholder="Your name"
              className="field h-9 w-52 px-3 text-sm"
            />
          </Field>
          <Field label="Appearance">
            <div className="flex rounded-lg border border-line bg-card-2 p-0.5">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    settings.theme === t ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {t === "light" ? <Sun size={13} /> : <Moon size={13} />} {t}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Goals & streaks" description="These drive the progress ring, calendar colors and streaks.">
          <Slider
            label="Daily focus goal"
            value={settings.dailyGoalMinutes}
            min={30}
            max={720}
            step={30}
            onChange={(v) => updateSettings({ dailyGoalMinutes: v })}
          />
          <Slider
            label="Minimum to count a streak day"
            value={settings.streakMinMinutes}
            min={15}
            max={240}
            step={15}
            onChange={(v) => updateSettings({ streakMinMinutes: v })}
          />
          <Slider
            label="Idle check after"
            hint="Ask whether you're still working when one timer runs this long"
            value={settings.idleLimitMinutes}
            min={30}
            max={480}
            step={30}
            onChange={(v) => updateSettings({ idleLimitMinutes: v })}
          />
        </Section>

        <Section title="Pomodoro" description="Automatically pause after a focus block and prompt a break.">
          <Field label="Enable Pomodoro mode">
            <Toggle
              checked={settings.pomodoro.enabled}
              onChange={(v) => updateSettings({ pomodoro: { ...settings.pomodoro, enabled: v } })}
            />
          </Field>
          {settings.pomodoro.enabled && (
            <>
              <Slider
                label="Focus block"
                value={settings.pomodoro.focusMinutes}
                min={5}
                max={90}
                step={5}
                onChange={(v) => updateSettings({ pomodoro: { ...settings.pomodoro, focusMinutes: v } })}
              />
              <Slider
                label="Break length"
                value={settings.pomodoro.breakMinutes}
                min={1}
                max={30}
                step={1}
                onChange={(v) => updateSettings({ pomodoro: { ...settings.pomodoro, breakMinutes: v } })}
              />
            </>
          )}
        </Section>

        <Categories />
        <DataSection />

        <Section title="Keyboard shortcuts">
          <ul className="flex flex-col gap-2.5 text-sm">
            <Shortcut keys={["Space"]}>Pause or resume your most recent task</Shortcut>
            <Shortcut keys={["Enter"]}>Add a task</Shortcut>
            <Shortcut keys={["Shift", "Enter"]}>Add a task and start its timer</Shortcut>
            <Shortcut keys={["Esc"]}>Close dialogs</Shortcut>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Categories() {
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const { addCategory, updateCategory, deleteCategory, moveCategory } = useStore.getState();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [now] = useState(() => Date.now());

  const totalFor = (id: string) => {
    const ids = new Set(tasks.filter((t) => t.categoryId === id).map((t) => t.id));
    return sessions.filter((s) => ids.has(s.taskId)).reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  };

  return (
    <Section
      title="Categories"
      description="Order here is the order everywhere. Archived categories keep their history but are hidden from pickers."
      action={
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={14} /> New
        </Button>
      }
    >
      <ul className="-mx-1 flex flex-col">
        {categories.map((c, i) => (
          <li key={c.id} className={`flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-subtle ${c.archived ? "opacity-55" : ""}`}>
            <CategoryIcon icon={c.icon} color={c.color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {c.name}
                {c.archived && <span className="ml-2 text-xs font-normal text-muted">Archived</span>}
              </p>
              <p className="text-xs text-muted tnum">{formatDuration(totalFor(c.id))} tracked</p>
            </div>
            <IconButton label="Move up" disabled={i === 0} className="disabled:opacity-30" onClick={() => moveCategory(c.id, -1)}>
              <ArrowUp size={15} />
            </IconButton>
            <IconButton
              label="Move down"
              disabled={i === categories.length - 1}
              className="disabled:opacity-30"
              onClick={() => moveCategory(c.id, 1)}
            >
              <ArrowDown size={15} />
            </IconButton>
            <IconButton label="Edit" onClick={() => setEditing(c)}>
              <Pencil size={15} />
            </IconButton>
            <IconButton label={c.archived ? "Unarchive" : "Archive"} onClick={() => updateCategory(c.id, { archived: !c.archived })}>
              {c.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            </IconButton>
            <IconButton
              label="Delete"
              className="hover:!text-red-600"
              onClick={() => {
                if (confirm(`Delete "${c.name}" and all its tasks and tracked time? Archive it instead to keep the history.`))
                  deleteCategory(c.id);
              }}
            >
              <Trash2 size={15} />
            </IconButton>
          </li>
        ))}
      </ul>
      <CategoryForm open={creating} onClose={() => setCreating(false)} onSave={(v) => addCategory(v.name, v.icon, v.color)} />
      <CategoryForm
        open={!!editing}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={(v) => editing && updateCategory(editing.id, v)}
      />
    </Section>
  );
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const taskCount = useStore((s) => s.tasks.length);
  const sessionCount = useStore((s) => s.sessions.length);
  const bytes = (localStorage.getItem("grindlog-v1") ?? "").length;
  const lastBackupAt = useStore((s) => s.settings.lastBackupAt);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    isStoragePersisted().then(setPersisted);
  }, []);

  const backupDays = lastBackupAt ? Math.floor((now - lastBackupAt) / 86400000) : null;
  const backupTone = backupDays === null || backupDays > 30 ? "#ef4444" : backupDays > 7 ? "#f59e0b" : "#12b76a";
  const backupText =
    backupDays === null ? "Never backed up" : backupDays === 0 ? "Backed up today" : `Last backup ${backupDays} day${backupDays === 1 ? "" : "s"} ago`;

  const exportData = () => {
    const { categories, tasks, sessions, journals, dayCategories, settings } = useStore.getState();
    const data: PersistedState = { categories, tasks, sessions, journals, dayCategories, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `focus-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    useStore.getState().updateSettings({ lastBackupAt: Date.now() });
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as PersistedState;
      if (!Array.isArray(data.categories) || !Array.isArray(data.tasks) || !Array.isArray(data.sessions)) throw new Error();
      if (!confirm("Replace all current data with this backup?")) return;
      useStore.getState().importData(data);
      toast({ tone: "success", text: "Backup restored" });
    } catch {
      toast({ tone: "error", text: "That file isn't a valid Focus Tracker backup" });
    }
  };

  return (
    <Section title="Data" description="Everything is stored locally in this browser. Clearing site data deletes it, so export a backup regularly.">
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm"
          style={{ background: `color-mix(in srgb, ${backupTone} 10%, var(--card))` }}
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: backupTone }}>
            <Download size={15} />
          </span>
          <div className="flex-1">
            <p className="font-semibold">{backupText}</p>
            <p className="text-xs text-muted">Export weekly so you can restore everything if browser data is cleared.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-card-2 px-3.5 py-2.5 text-sm">
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg text-white ${persisted ? "bg-emerald-500" : "bg-slate-400"}`}
          >
            <ShieldCheck size={15} />
          </span>
          <div className="flex-1">
            <p className="font-semibold">
              {persisted === null ? "Checking storage protection…" : persisted ? "Protected storage on" : "Protected storage off"}
            </p>
            <p className="text-xs text-muted">
              {persisted
                ? "The browser won't clear this data automatically to free up space."
                : "The browser may clear this data under storage pressure. Your browser decides whether to grant protection."}
            </p>
          </div>
          {persisted === false && (
            <Button size="sm" variant="secondary" onClick={() => requestPersistentStorage().then(setPersisted)}>
              Request
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Tasks" value={String(taskCount)} />
        <Metric label="Sessions" value={String(sessionCount)} />
        <Metric label="Storage used" value={`${(bytes / 1024).toFixed(1)} KB`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportData}>
          <Download size={15} /> Export backup
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          className="ml-auto !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40"
          onClick={() => {
            if (confirm("Erase ALL data? This can't be undone. Export a backup first if you're unsure.")) {
              useStore.getState().resetAll();
              toast({ tone: "info", text: "All data erased" });
            }
          }}
        >
          <Trash2 size={15} /> Erase all data
        </Button>
      </div>
    </Section>
  );
}

/* ---------- building blocks ---------- */

function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-5 px-5 py-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Slider({ label, hint, value, min, max, step, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <span className="rounded-md bg-card-2 px-2 py-0.5 text-xs font-semibold tnum">{formatDuration(value * 60000)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line-strong"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-semibold tnum">{value}</p>
    </div>
  );
}

function Shortcut({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-ink-2">{children}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="rounded-md border border-line bg-card-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
            {k}
          </kbd>
        ))}
      </span>
    </li>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <SettingsPage />
    </ClientOnly>
  );
}
