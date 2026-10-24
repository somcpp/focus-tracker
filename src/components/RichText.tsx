"use client";

import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { splitLinks, type PrettyLink } from "@/lib/links";

export function LeetCodeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      role="img"
      viewBox="-4 -3 102 119"
      width={size}
      height={size}
      className="shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>LeetCode</title>
      {/* Orange / amber lower hook & inner curve */}
      <path
        d="M67.5068339,83.0664138 C70.0005384,80.5763786 74.0371402,80.5828822 76.5228362,83.0809398 C79.0085322,85.5789975 79.00204,89.6226456 76.5083355,92.1126808 L65.4351451,103.169577 C55.2192332,113.370744 38.5604663,113.518673 28.1722578,103.513204 C28.112217,103.455678 23.486583,98.9201326 8.22702585,83.9570195 C-1.92478479,74.0028895 -2.93614945,58.0748736 6.61697549,47.8463644 L24.4286944,28.7745461 C33.9100043,18.6218594 51.3874487,17.5122246 62.2279907,26.2789232 L78.4052912,39.3620235 C81.1448956,41.5776292 81.5728103,45.5984975 79.3610655,48.3428842 C77.1493207,51.0872709 73.1354592,51.5159327 70.3958548,49.300327 L54.2186634,36.2173149 C48.5492813,31.6325105 38.631911,32.2621597 33.7398535,37.5006265 L15.9279056,56.5726899 C11.2772073,61.552182 11.7865613,69.5740156 17.1461283,74.8292186 C28.3515339,85.8169393 36.9874071,94.2846214 36.9973988,94.294225 C42.3981571,99.4959838 51.130862,99.418438 56.43358,94.1233737 L67.5068339,83.0664138 Z"
        fill="#FFA116"
      />
      {/* Gray horizontal middle bar */}
      <path
        d="M40.6069914,72.0014117 C37.086019,72.0014117 34.2317068,69.142117 34.2317068,65.6149982 C34.2317068,62.0878794 37.086019,59.2285847 40.6069914,59.2285847 L87.6247154,59.2285847 C91.1456879,59.2285847 94,62.0878794 94,65.6149982 C94,69.142117 91.1456879,72.0014117 87.6247154,72.0014117 L40.6069914,72.0014117 Z"
        fill="#B3B3B3"
      />
      {/* Dark outer chevron (black in light mode, white in dark mode) */}
      <path
        d="M49.4124315,2.02335002 C51.8178981,-0.552320454 55.852269,-0.686893945 58.4234511,1.72277172 C60.9946333,4.13243738 61.1289722,8.17385083 58.7235056,10.7495213 L15.9282277,56.5728697 C11.2773659,61.551984 11.7867168,69.5737689 17.1459309,74.8291832 L36.9094236,94.2091099 C39.4255514,96.6764051 39.4686234,100.719828 37.0056277,103.240348 C34.5426319,105.760868 30.5062548,105.804016 27.990127,103.33672 L8.22654289,83.9567041 C-1.92467414,74.0021005 -2.93603527,58.0741402 6.61751533,47.846311 L49.4124315,2.02335002 Z"
        className="fill-zinc-900 dark:fill-white"
      />
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
