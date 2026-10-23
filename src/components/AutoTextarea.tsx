"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** Textarea that grows with its content */
export function AutoTextarea({ value, minRows = 2, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} value={value} rows={minRows} className={`resize-none overflow-hidden ${className}`} {...rest} />;
}
