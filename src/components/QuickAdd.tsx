"use client";

import { ArrowRight, Layers } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { solid, tint } from "@/lib/colors";
import { ICONS } from "@/lib/icons";
import { toast } from "./ui";

/** Type a task, pick a category tile, Enter to add (Shift+Enter adds and starts) */
export function QuickAdd({ date }: { date: string }) {
  const allCategories = useStore((s) => s.categories);
  const categories = allCategories.filter((c) => !c.archived);
  const addTask = useStore((s) => s.addTask);
  const startTask = useStore((s) => s.startTask);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const catId = picked && categories.some((c) => c.id === picked) ? picked : categories[0]?.id;
  const cat = categories.find((c) => c.id === catId);

  const submit = (andStart: boolean) => {
    if (!title.trim() || !cat) return;
    const id = addTask(date, cat.id, title);
    if (andStart) startTask(id);
    toast({ tone: "success", text: `Added to ${cat.name}${andStart ? " and started" : ""}` });
    setTitle("");
  };

  return (
    <div>
      <h2 className="mb-3 text-[15px] font-semibold">Quick add</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="field flex items-center gap-2 py-1 pl-3 pr-1"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              submit(true);
            }
          }}
          placeholder={cat ? `Add a task to ${cat.name}…` : "Create a category first"}
          disabled={!cat}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!title.trim() || !cat}
          aria-label="Add task"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white transition-opacity disabled:opacity-40"
        >
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] ?? Layers;
          const sel = c.id === catId;
          return (
            <button
              key={c.id}
              onClick={() => setPicked(c.id)}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[11.5px] font-semibold transition-all"
              style={{
                background: tint(c.color, sel ? 18 : 9),
                color: solid(c.color),
                boxShadow: sel ? `inset 0 0 0 1.5px ${solid(c.color)}` : undefined,
              }}
            >
              <Icon size={19} strokeWidth={2.2} />
              <span className="w-full truncate px-1">{c.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">Enter to add · Shift+Enter to add and start</p>
    </div>
  );
}
