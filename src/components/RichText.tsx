"use client";

import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { splitLinks, type PrettyLink } from "@/lib/links";

export function LeetCodeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="#FFA116"
      className="shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>LeetCode</title>
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
  );
}

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
      {link.site === "LeetCode" ? (
        <LeetCodeIcon size={icon} />
      ) : broken ? (
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
