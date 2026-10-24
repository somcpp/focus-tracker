/** Turns pasted URLs into short, readable names (Notion-style link mentions). */

export interface PrettyLink {
  url: string;
  domain: string;
  site: string;
  /** Readable page name, or null when only the site is known */
  title: string | null;
  /** Favicon sources to try in order */
  favicons: string[];
}

const URL_RE = /https?:\/\/[^\s<>"']+/g;

const SITES: Record<string, string> = {
  "leetcode.com": "LeetCode",
  "leetcode.cn": "LeetCode",
  "codeforces.com": "Codeforces",
  "geeksforgeeks.org": "GeeksforGeeks",
  "hackerrank.com": "HackerRank",
  "codechef.com": "CodeChef",
  "atcoder.jp": "AtCoder",
  "cses.fi": "CSES",
  "github.com": "GitHub",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "takeuforward.org": "takeUforward",
  "interviewbit.com": "InterviewBit",
  "naukri.com": "Code360",
  "spoj.com": "SPOJ",
  "stackoverflow.com": "Stack Overflow",
  "medium.com": "Medium",
  "dev.to": "DEV",
  "notion.so": "Notion",
  "docs.google.com": "Google Docs",
  "drive.google.com": "Google Drive",
  "developer.mozilla.org": "MDN",
  "wikipedia.org": "Wikipedia",
  "neetcode.io": "NeetCode",
  "vercel.app": "Vercel",
};

/** "two-sum" -> "Two Sum", keeps short all-caps tokens like "ii" -> "II" */
function titleCase(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (/^(i{1,3}|iv|v|vi{0,3})$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function siteName(domain: string): string {
  for (const [d, name] of Object.entries(SITES)) {
    if (domain === d || domain.endsWith(`.${d}`)) return name;
  }
  // "example.co.uk" -> "Example"
  const main = domain.split(".").slice(-2, -1)[0] ?? domain;
  return main.charAt(0).toUpperCase() + main.slice(1);
}

function pageTitle(domain: string, parts: string[], u: URL): string | null {
  const at = (i: number) => parts[i] ?? "";
  if (domain.endsWith("leetcode.com") || domain.endsWith("leetcode.cn")) {
    const i = parts.indexOf("problems");
    return i >= 0 && parts[i + 1] ? titleCase(parts[i + 1]) : null;
  }
  if (domain.endsWith("codeforces.com")) {
    // /problemset/problem/1234/A  or  /contest/1234/problem/A
    if (at(0) === "problemset" && at(1) === "problem") return `Problem ${at(2)}${at(3)}`;
    if ((at(0) === "contest" || at(0) === "gym") && at(2) === "problem") return `Problem ${at(1)}${at(3)}`;
    if (at(0) === "contest") return `Contest ${at(1)}`;
    return null;
  }
  if (domain.endsWith("geeksforgeeks.org")) {
    const slug = at(0) === "problems" ? at(1) : parts.at(-1);
    return slug ? titleCase(slug.replace(/-\d{3,}$/, "")) : null;
  }
  if (domain.endsWith("hackerrank.com")) {
    const i = parts.indexOf("challenges");
    return i >= 0 && parts[i + 1] ? titleCase(parts[i + 1]) : null;
  }
  if (domain.endsWith("codechef.com")) {
    const i = parts.indexOf("problems");
    return i >= 0 && parts[i + 1] ? parts[i + 1].toUpperCase() : null;
  }
  if (domain.endsWith("atcoder.jp")) {
    // /contests/abc300/tasks/abc300_a
    const i = parts.indexOf("tasks");
    if (i >= 0 && parts[i + 1]) return parts[i + 1].replace("_", " ").toUpperCase();
    return at(0) === "contests" && at(1) ? at(1).toUpperCase() : null;
  }
  if (domain.endsWith("cses.fi")) {
    const i = parts.indexOf("task");
    return i >= 0 && parts[i + 1] ? `Task ${parts[i + 1]}` : null;
  }
  if (domain.endsWith("github.com")) {
    if (!at(0)) return null;
    if (!at(1)) return at(0);
    const base = `${at(0)}/${at(1)}`;
    if ((at(2) === "issues" || at(2) === "pull") && at(3)) return `${base} #${at(3)}`;
    return base;
  }
  if (domain === "youtu.be" || domain.endsWith("youtube.com")) {
    return u.searchParams.get("list") ? "Playlist" : "Video";
  }
  if (domain.endsWith("takeuforward.org")) {
    const slug = parts.at(-1);
    return slug ? titleCase(slug) : null;
  }
  // Generic: last path segment that looks like words
  const slug = [...parts].reverse().find((p) => /[a-z]{3,}/i.test(p) || /[-_]/.test(p));
  if (!slug) return null;
  const clean = slug.replace(/\.(html?|php|aspx?)$/i, "");
  return clean.length > 2 ? titleCase(clean) : null;
}

export function prettyLink(raw: string): PrettyLink | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const domain = u.hostname.replace(/^www\.|^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const site = siteName(domain);

  const directFavicons: string[] = [];
  if (domain.endsWith("leetcode.com") || domain.endsWith("leetcode.cn")) {
    directFavicons.push(
      "https://assets.leetcode.com/static_assets/public/icons/favicon-32x32.png",
      "https://leetcode.com/favicon.ico",
      "https://assets.leetcode.com/static_assets/public/icons/favicon.ico",
    );
  }

  return {
    url: u.href,
    domain,
    site,
    title: pageTitle(domain, parts, u),
    favicons: [
      ...directFavicons,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    ],
  };
}

export type TextPart = { type: "text"; value: string } | { type: "link"; link: PrettyLink };

/** Split text into plain text and recognised links */
export function splitLinks(text: string): TextPart[] {
  const out: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    // Drop trailing punctuation that is usually not part of the URL
    const url = m[0].replace(/[),.;:!?\]]+$/, "");
    const start = m.index ?? 0;
    const link = prettyLink(url);
    if (!link) continue;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    out.push({ type: "link", link });
    last = start + url.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

export const hasLink = (text: string) => new RegExp(URL_RE.source).test(text);

/** Text with links replaced by their readable names, for plain-text spots (tab title, toasts) */
export function plainText(text: string): string {
  return splitLinks(text)
    .map((p) => (p.type === "text" ? p.value : p.link.title ?? p.link.site))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
