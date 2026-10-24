"use client";

import { useState } from "react";
import { Check, Trash2, AlertTriangle } from "lucide-react";
import { COLOR_KEYS, COLORS, solid, tint } from "@/lib/colors";
import { CategoryIcon, ICON_KEYS, ICONS } from "@/lib/icons";
import type { Category, ColorKey } from "@/lib/types";
import { Button, Modal, toast } from "./ui";
import { useStore } from "@/lib/store";

export function CategoryForm({
  open,
  onClose,
  initial,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Category;
  onSave: (v: { name: string; icon: string; color: ColorKey }) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit category" : "New category"}>
      {/* keyed so state resets each time it opens */}
      {open && <Form key={initial?.id ?? "new"} initial={initial} onSave={onSave} onClose={onClose} onDelete={onDelete} />}
    </Modal>
  );
}

function Form({
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  initial?: Category;
  onSave: (v: { name: string; icon: string; color: ColorKey }) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "target");
  const [color, setColor] = useState<ColorKey>(initial?.color ?? "orange");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const handleDelete = () => {
    if (!initial) return;
    if (onDelete) {
      onDelete(initial.id);
    } else {
      deleteCategory(initial.id);
      toast({ tone: "success", text: `Category "${initial.name}" deleted` });
    }
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), icon, color });
        onClose();
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
        <div className="field flex items-center gap-2.5 px-2.5 py-2">
          <CategoryIcon icon={icon} color={color} size="sm" />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DSA, Development, Reading"
            className="w-full bg-transparent text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={COLORS[c].label}
              title={COLORS[c].label}
              onClick={() => setColor(c)}
              className="grid h-7 w-7 place-items-center rounded-full text-white transition-transform hover:scale-110"
              style={{
                background: solid(c),
                boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 4px ${solid(c)}` : undefined,
              }}
            >
              {color === c && <Check size={14} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Icon</label>
        <div className="grid grid-cols-7 gap-1.5">
          {ICON_KEYS.map((k) => {
            const Icon = ICONS[k];
            const selected = icon === k;
            return (
              <button
                type="button"
                key={k}
                aria-label={k}
                onClick={() => setIcon(k)}
                className={`grid aspect-square place-items-center rounded-lg border transition-colors ${
                  selected ? "border-transparent" : "border-line text-muted hover:bg-card-2 hover:text-ink"
                }`}
                style={selected ? { background: tint(color, 16), color: solid(color) } : undefined}
              >
                <Icon size={17} />
              </button>
            );
          })}
        </div>
      </div>

      {initial && confirmDelete && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-50/70 p-3 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Delete this category and all its tasks?</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleDelete}
              className="!bg-red-600 !text-white hover:!bg-red-700"
            >
              Yes, delete
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        {initial && !confirmDelete ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            className="text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 size={14} /> Delete
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {initial ? "Save changes" : "Create category"}
          </Button>
        </div>
      </div>
    </form>
  );
}
