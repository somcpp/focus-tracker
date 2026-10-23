"use client";

import { useState } from "react";
import { COLOR_KEYS, COLORS, EMOJIS } from "@/lib/colors";
import type { Category, ColorKey } from "@/lib/types";
import { Button, Modal } from "./ui";

export function CategoryForm({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Category;
  onSave: (v: { name: string; emoji: string; color: ColorKey }) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit category" : "New category ✨"}>
      {/* keyed so state resets each time it opens */}
      {open && <Form key={initial?.id ?? "new"} initial={initial} onSave={onSave} onClose={onClose} />}
    </Modal>
  );
}

function Form({
  initial,
  onSave,
  onClose,
}: {
  initial?: Category;
  onSave: (v: { name: string; emoji: string; color: ColorKey }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[3]);
  const [color, setColor] = useState<ColorKey>(initial?.color ?? "tangerine");

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji, color });
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-3">
        <span
          className="pop-btn grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl"
          style={{ background: COLORS[color].solid }}
        >
          {emoji}
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. DSA, Dev, Reading"
          className="w-full rounded-2xl border-2 border-line bg-card-2 px-4 py-3 font-display text-lg"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-muted">Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={COLORS[c].label}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 border-line transition-transform ${
                color === c ? "scale-110 ring-4 ring-ink/20" : "hover:scale-105"
              }`}
              style={{ background: COLORS[c].solid }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-muted">Icon</p>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setEmoji(e)}
              className={`grid aspect-square place-items-center rounded-xl text-xl transition-all ${
                emoji === e ? "scale-110 bg-card-2 ring-2 ring-line" : "hover:bg-card-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={!name.trim()}>
        {initial ? "Save" : "Create category"}
      </Button>
    </form>
  );
}
