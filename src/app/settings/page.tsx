"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { Archive, ArchiveRestore, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { solid, tint } from "@/lib/colors";
import { formatDuration } from "@/lib/time";
import type { Category, PersistedState } from "@/lib/types";
import { CategoryForm } from "@/components/CategoryForm";
import { Button, IconButton, toast } from "@/components/ui";

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Settings ⚙️</h1>

      <Section title="You" emoji="🙋">
        <Field label="Your name" hint="Used in the greeting">
          <input
            value={settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
            placeholder="Champ"
            className="w-48 rounded-xl border-2 border-line bg-card-2 px-3 py-1.5 font-semibold"
          />
        </Field>
        <Field label="Theme">
          <div className="flex rounded-full border-2 border-line p-1">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateSettings({ theme: t })}
                className={`rounded-full px-4 py-1 text-sm font-bold capitalize ${settings.theme === t ? "bg-ink text-bg" : "text-muted"}`}
              >
                {t === "light" ? "☀️" : "🌙"} {t}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Goals & streaks" emoji="🎯">
        <Slider
          label="Daily goal"
          hint="A full progress ring and the darkest calendar green"
          value={settings.dailyGoalMinutes}
          min={30}
          max={720}
          step={30}
          onChange={(v) => updateSettings({ dailyGoalMinutes: v })}
        />
        <Slider
          label="Streak minimum"
          hint="Track at least this much in a day to keep the streak"
          value={settings.streakMinMinutes}
          min={15}
          max={240}
          step={15}
          onChange={(v) => updateSettings({ streakMinMinutes: v })}
        />
        <Slider
          label="“Still working?” check"
          hint="Ask if a single timer runs longer than this"
          value={settings.idleLimitMinutes}
          min={30}
          max={480}
          step={30}
          onChange={(v) => updateSettings({ idleLimitMinutes: v })}
        />
      </Section>

      <Section title="Pomodoro mode" emoji="🍅">
        <Field label="Enable" hint="Auto-pause after a focus block and remind you to take a break">
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
              label="Break"
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

      <Section title="Shortcuts" emoji="⌨️">
        <ul className="flex flex-col gap-2 text-sm font-semibold">
          <li><Kbd>Space</Kbd> Pause or resume your last task</li>
          <li><Kbd>Enter</Kbd> Add a task &nbsp;·&nbsp; <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> add and start it</li>
          <li><Kbd>Esc</Kbd> Close dialogs</li>
        </ul>
      </Section>
    </div>
  );
}

function Categories() {
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const { addCategory, updateCategory, deleteCategory } = useStore.getState();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const totalFor = (id: string) => {
    const ids = new Set(tasks.filter((t) => t.categoryId === id).map((t) => t.id));
    return sessions.filter((s) => ids.has(s.taskId)).reduce((sum, s) => sum + ((s.end ?? Date.now()) - s.start), 0);
  };

  return (
    <Section title="Categories" emoji="🗂️" action={<Button variant="plain" className="!py-1.5" onClick={() => setCreating(true)}><Plus size={16} /> New</Button>}>
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 rounded-2xl border-2 border-line px-3 py-2 ${c.archived ? "opacity-50" : ""}`}
            style={{ background: tint(c.color, 18) }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: solid(c.color) }}>
              {c.emoji}
            </span>
            <span className="flex-1 font-display text-lg font-semibold">
              {c.name} {c.archived && <span className="text-sm text-muted">(archived)</span>}
            </span>
            <span className="text-sm font-bold text-muted">{formatDuration(totalFor(c.id))} all-time</span>
            <IconButton label="Edit" onClick={() => setEditing(c)}><Pencil size={16} /></IconButton>
            <IconButton label={c.archived ? "Unarchive" : "Archive (hide from pickers)"} onClick={() => updateCategory(c.id, { archived: !c.archived })}>
              {c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </IconButton>
            <IconButton
              label="Delete"
              onClick={() => {
                if (confirm(`Delete "${c.name}" and ALL its tasks and tracked time? Archiving keeps your history instead.`)) deleteCategory(c.id);
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      <CategoryForm open={creating} onClose={() => setCreating(false)} onSave={(v) => addCategory(v.name, v.emoji, v.color)} />
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
  const counts = {
    tasks: useStore((s) => s.tasks.length),
    sessions: useStore((s) => s.sessions.length),
  };
  const bytes = typeof localStorage !== "undefined" ? (localStorage.getItem("grindlog-v1") ?? "").length : 0;

  const exportData = () => {
    const { categories, tasks, sessions, journals, dayCategories, settings } = useStore.getState();
    const data: PersistedState = { categories, tasks, sessions, journals, dayCategories, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grindlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as PersistedState;
      if (!Array.isArray(data.categories) || !Array.isArray(data.tasks) || !Array.isArray(data.sessions)) throw new Error();
      if (!confirm("Replace all current data with this backup?")) return;
      useStore.getState().importData(data);
      toast({ emoji: "📥", text: "Backup restored!" });
    } catch {
      toast({ emoji: "😵", text: "That file doesn't look like a GrindLog backup." });
    }
  };

  return (
    <Section title="Your data" emoji="💾">
      <p className="text-sm font-semibold text-muted">
        Everything lives in this browser&apos;s local storage: {counts.tasks} tasks, {counts.sessions} sessions,{" "}
        {(bytes / 1024).toFixed(1)} KB used of roughly 5 MB. Export a backup now and then, because clearing browser data
        deletes it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="mint" onClick={exportData}><Download size={16} /> Export backup</Button>
        <Button variant="plain" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import backup</Button>
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
          variant="danger"
          className="ml-auto"
          onClick={() => {
            if (confirm("Erase ALL data? This can't be undone. Export a backup first if unsure.")) {
              useStore.getState().resetAll();
              toast({ emoji: "🧹", text: "Fresh start!" });
            }
          }}
        >
          <Trash2 size={16} /> Reset everything
        </Button>
      </div>
    </Section>
  );
}

/* ---------- little building blocks ---------- */

function Section({ title, emoji, children, action }: { title: string; emoji: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <h2 className="flex-1 font-display text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-bold">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Slider({ label, hint, value, min, max, step, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-bold">{label}</p>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
        <span className="rounded-full border-2 border-line bg-card-2 px-3 py-0.5 font-display font-semibold">
          {formatDuration(value * 60000)}
        </span>
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
      className={`relative h-8 w-14 rounded-full border-2 border-line transition-colors ${checked ? "bg-[#7bd389]" : "bg-card-2"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full border-2 border-line bg-white transition-all ${checked ? "left-6" : "left-0.5"}`} />
    </button>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-lg border-2 border-line bg-card-2 px-2 py-0.5 font-mono text-xs">{children}</kbd>;
}

export default function Page() {
  return (
    <ClientOnly>
      <SettingsPage />
    </ClientOnly>
  );
}
