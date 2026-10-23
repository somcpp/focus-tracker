"use client";

import { Check, CornerDownRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { solid, tint } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { RichText } from "./RichText";
import { toast } from "./ui";

/**
 * Checklist of plan items stored on the journal for `date`.
 * Items can be ticked off, edited (when `editable`) and turned into a task on `taskDate`.
 */
export function PlanList({ date, taskDate, editable }: { date: string; taskDate: string; editable: boolean }) {
  const plan = useStore((s) => s.journals[date]?.plan);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const { addPlanItem, updatePlanItem, removePlanItem, planItemToTask } = useStore.getState();
  const [draft, setDraft] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const active = categories.filter((c) => !c.archived);
  const items = plan ?? [];

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : undefined;
        const taskCat = task ? categories.find((c) => c.id === task.categoryId) : undefined;
        const done = item.done || !!task?.done;
        return (
          <div key={item.id} className="group border-b border-line py-2 last:border-b-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePlanItem(date, item.id, { done: !item.done })}
                aria-label={done ? "Mark as not done" : "Mark as done"}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors ${
                  done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong text-transparent hover:border-emerald-500"
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </button>
              {editable ? (
                <input
                  value={item.text}
                  onChange={(e) => updatePlanItem(date, item.id, { text: e.target.value })}
                  onBlur={(e) => !e.target.value.trim() && removePlanItem(date, item.id)}
                  className={`min-w-0 flex-1 bg-transparent text-sm ${done ? "text-muted line-through" : ""}`}
                />
              ) : (
                <span className={`min-w-0 flex-1 text-sm ${done ? "text-muted line-through" : ""}`}>
                  <RichText text={item.text} size="sm" />
                </span>
              )}
              {task && taskCat ? (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: solid(taskCat.color), background: tint(taskCat.color, 12) }}
                >
                  <CornerDownRight size={11} /> {taskCat.name}
                </span>
              ) : (
                !done &&
                active.length > 0 && (
                  <button
                    onClick={() => setPicking(picking === item.id ? null : item.id)}
                    className="shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold text-accent hover:bg-accent-soft"
                  >
                    + Add as task
                  </button>
                )
              )}
              {editable && (
                <button
                  onClick={() => removePlanItem(date, item.id)}
                  aria-label="Remove item"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted opacity-0 hover:bg-card-2 hover:text-ink group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {picking === item.id && (
              <div className="ml-8 mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted">Add to</span>
                {active.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      planItemToTask(date, item.id, c.id, taskDate);
                      setPicking(null);
                      toast({ tone: "success", text: `Added to ${c.name}` });
                    }}
                    className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2.5 text-[12px] font-semibold"
                    style={{ background: tint(c.color, 11), color: solid(c.color) }}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="xs" variant="solid" />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addPlanItem(date, draft);
            setDraft("");
          }}
          className="flex items-center gap-3 py-2"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-line-strong text-muted">
            <Plus size={11} strokeWidth={3} />
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={items.length ? "Add another item" : "What will you work on? Press Enter to add"}
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted"
          />
        </form>
      )}
    </div>
  );
}
