"use client";

import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { splitLinks, type PrettyLink } from "@/lib/links";

/** Notion-style link mention: favicon + readable name, opens in a new tab */
export function LinkChip({ link, size = "md" }: { link: PrettyLink; size?: "sm" | "md" }) {
  // index into link.favicons; past the end means fall back to a globe icon
  const [src, setSrc] = useState(0);
  const broken = src >= link.favicons.length;
  const icon = size === "sm" ? 12 : 14;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.url}
      onClick={(e) => e.stopPropagation()}
      className={`group/link inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-card-2 align-middle font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft ${
        size === "sm" ? "px-1.5 py-px text-[12px]" : "px-2 py-0.5 text-[13px]"
      }`}
    >
      {broken ? (
        <Globe size={icon} className="shrink-0 text-muted" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- tiny external favicon, no optimisation needed
        <img
          src={link.favicons[src]}
          alt=""
          width={icon}
          height={icon}
          className="shrink-0 rounded-sm"
          onError={() => setSrc((i) => i + 1)}
        />
      )}
      <span className="truncate">{link.title ?? link.site}</span>
      {link.title && <span className="shrink-0 font-normal text-muted">· {link.site}</span>}
      <ExternalLink size={icon - 2} className="shrink-0 text-muted opacity-0 transition-opacity group-hover/link:opacity-100" />
    </a>
  );
}

/** Renders text with any URLs replaced by link chips */
export function RichText({ text, size = "md" }: { text: string; size?: "sm" | "md" }) {
  const parts = splitLinks(text);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <LinkChip key={i} link={p.link} size={size} />
        ),
      )}
    </>
  );
}
