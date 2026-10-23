/**
 * Deterministic demo data in the app's persisted-store format (version 3).
 * Used by scripts/screenshots.mjs; also handy for local development:
 *   node -e "import('./scripts/demo-data.mjs').then(m => console.log(JSON.stringify(m.demoState())))"
 */

// Small seeded PRNG so screenshots are reproducible
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const CATEGORIES = [
  { id: "dsa", name: "DSA", icon: "code", color: "blue" },
  { id: "dev", name: "Development", icon: "terminal", color: "green" },
  { id: "sd", name: "System Design", icon: "layers", color: "orange" },
  { id: "college", name: "College", icon: "graduation", color: "purple" },
];

const POOL = {
  dsa: [
    ["https://leetcode.com/problems/two-sum/", "easy"],
    ["https://leetcode.com/problems/longest-substring-without-repeating-characters/", "medium"],
    ["https://leetcode.com/problems/coin-change/", "medium"],
    ["https://leetcode.com/problems/merge-k-sorted-lists/", "hard"],
    ["https://codeforces.com/problemset/problem/1352/C", "medium"],
    ["https://leetcode.com/problems/number-of-islands/", "medium"],
    ["https://www.geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1", "easy"],
    ["https://leetcode.com/problems/trapping-rain-water/", "hard"],
    ["https://leetcode.com/problems/course-schedule/", "medium"],
    ["https://leetcode.com/problems/lru-cache/", "medium"],
  ],
  dev: [["Portfolio: navbar + dark mode"], ["Auth flow with OAuth"], ["REST API for notes app"], ["Write tests for the parser"], ["Refactor dashboard charts"]],
  sd: [["Caching strategies"], ["Design a URL shortener"], ["Load balancing basics"], ["Consistent hashing"]],
  college: [["DBMS assignment"], ["OS lab: scheduling"], ["Revise computer networks"]],
};

const JOURNAL_LINES = {
  wins: ["Finally understood the DP transition for coin change.", "Shipped the navbar and it looks clean.", "Solved two mediums without hints.", "Kept focus for a full 2h block."],
  challenges: ["Got stuck on graph cycle detection for too long.", "Too many context switches after lunch.", "Slept late, slow start.", "Struggled with the system design trade-offs."],
  learnings: ["Topological sort via Kahn's algorithm.", "Sliding window needs a clear invariant.", "Cache-aside vs write-through.", "Write the brute force first, then optimise."],
};

export function demoState({ now = Date.now(), theme = "light", seed = 7 } = {}) {
  const rand = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const today = new Date(now);
  const tasks = [];
  const sessions = [];
  const journals = {};
  let n = 0;

  for (let i = 75; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = key(d);
    const isToday = i === 0;
    if (!isToday && rand() < (d.getDay() === 0 ? 0.45 : 0.15)) continue; // some rest days

    d.setHours(8 + Math.floor(rand() * 2), Math.floor(rand() * 60), 0, 0);
    let t = d.getTime();
    for (const cat of CATEGORIES) {
      const count = isToday ? (cat.id === "college" ? 0 : cat.id === "dsa" ? 3 : 1) : rand() < (cat.id === "college" ? 0.3 : 0.75) ? 1 + Math.floor(rand() * 2) : 0;
      for (let k = 0; k < count; k++) {
        const [title, difficulty] = pick(POOL[cat.id]);
        const id = `t${n++}`;
        const minutes = 25 + Math.floor(rand() * 85);
        const running = isToday && cat.id === "dsa" && k === 2;
        const done = isToday ? !running && !(cat.id === "sd") : rand() < 0.85;
        tasks.push({
          id,
          categoryId: cat.id,
          date,
          title,
          notes: cat.id === "dsa" && rand() < 0.4 ? "Approach: hashmap of seen values. Similar: https://leetcode.com/problems/3sum/" : "",
          done,
          difficulty: difficulty ?? null,
          createdAt: t,
          carriedTo: null,
        });
        if (running) {
          sessions.push({ id: `s${n}`, taskId: id, start: now - 23 * 60000 - 14000, end: null });
          continue;
        }
        if (isToday && t + minutes * 60000 > now - 30 * 60000) continue;
        sessions.push({ id: `s${n}a`, taskId: id, start: t, end: t + minutes * 60000 });
        t += minutes * 60000 + (10 + Math.floor(rand() * 60)) * 60000;
      }
    }

    if (!isToday && i <= 14 && rand() < 0.85) {
      journals[date] = {
        date,
        mood: 2 + Math.floor(rand() * 4),
        wins: pick(JOURNAL_LINES.wins),
        challenges: rand() < 0.7 ? pick(JOURNAL_LINES.challenges) : "",
        learnings: rand() < 0.7 ? pick(JOURNAL_LINES.learnings) : "",
        notes: "",
        plan: [],
      };
    }
  }

  // Yesterday's plan feeds today's "Start your day" card
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yKey = key(y);
  journals[yKey] = {
    date: yKey,
    mood: 4,
    wins: "Solved coin change and finally get bottom-up DP.",
    challenges: "Lost 40 minutes to a typo in the reducer.",
    learnings: "Draw the state table before coding.",
    notes: "Good energy in the morning. Do the hardest problem first tomorrow.",
    plan: [
      { id: "p1", text: "2 graph problems (BFS/DFS)", done: false, taskId: null },
      { id: "p2", text: "Finish OAuth callback handling", done: false, taskId: null },
      { id: "p3", text: "Read about consistent hashing", done: true, taskId: null },
    ],
  };

  return {
    state: {
      categories: CATEGORIES.map((c) => ({ ...c, archived: false, createdAt: 0 })),
      tasks,
      sessions,
      journals,
      dayCategories: {},
      settings: {
        name: "Alex",
        dailyGoalMinutes: 300,
        streakMinMinutes: 60,
        idleLimitMinutes: 180,
        theme,
        pomodoro: { enabled: false, focusMinutes: 25, breakMinutes: 5 },
        lastBackupAt: now - 3 * 86400000,
        startDayDismissedOn: null,
      },
    },
    version: 3,
  };
}
