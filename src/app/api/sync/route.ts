import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAuthToken, verifyNeonAuthToken } from "@/lib/auth";
import type { Journal } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const token = extractAuthToken(req);
    const session = token ? await verifyNeonAuthToken(token) : null;
    const userId = session?.userId ?? "default_local_user";

    // Ensure default user exists if using local/anonymous mode
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: session?.name || "Local User",
        email: session?.email || `${userId}@local.host`,
      },
    });

    const [categories, tasks, sessions, journals, settings] = await Promise.all([
      prisma.category.findMany({ where: { userId } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.focusSession.findMany({ where: { userId } }),
      prisma.journal.findMany({ where: { userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
    ]);

    return NextResponse.json({
      categories,
      tasks,
      sessions: sessions.map((s) => ({
        id: s.id,
        taskId: s.taskId,
        start: Number(s.start),
        end: s.end !== null ? Number(s.end) : null,
      })),
      journals: Object.fromEntries(journals.map((j) => [j.date, j])),
      settings,
    });
  } catch (error) {
    console.error("Failed to load sync data:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = extractAuthToken(req);
    const session = token ? await verifyNeonAuthToken(token) : null;
    const userId = session?.userId ?? "default_local_user";

    const body = await req.json();
    const { categories, tasks, sessions, journals, settings } = body;

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: session?.name || "Local User",
        email: session?.email || `${userId}@local.host`,
      },
    });

    // Run sync in transaction
    await prisma.$transaction(async (tx) => {
      // Sync categories
      if (Array.isArray(categories)) {
        for (const c of categories) {
          await tx.category.upsert({
            where: { id: c.id },
            update: {
              userId,
              name: c.name,
              icon: c.icon,
              color: c.color,
              archived: !!c.archived,
            },
            create: {
              id: c.id,
              userId,
              name: c.name,
              icon: c.icon,
              color: c.color,
              archived: !!c.archived,
            },
          });
        }
      }

      // Sync tasks
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          await tx.task.upsert({
            where: { id: t.id },
            update: {
              userId,
              categoryId: t.categoryId,
              date: t.date,
              title: t.title,
              notes: t.notes ?? "",
              done: !!t.done,
              difficulty: t.difficulty ?? null,
              carriedTo: t.carriedTo ?? null,
            },
            create: {
              id: t.id,
              userId,
              categoryId: t.categoryId,
              date: t.date,
              title: t.title,
              notes: t.notes ?? "",
              done: !!t.done,
              difficulty: t.difficulty ?? null,
              carriedTo: t.carriedTo ?? null,
            },
          });
        }
      }

      // Sync sessions
      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          await tx.focusSession.upsert({
            where: { id: s.id },
            update: {
              userId,
              taskId: s.taskId,
              start: BigInt(s.start),
              end: s.end !== null && s.end !== undefined ? BigInt(s.end) : null,
            },
            create: {
              id: s.id,
              userId,
              taskId: s.taskId,
              start: BigInt(s.start),
              end: s.end !== null && s.end !== undefined ? BigInt(s.end) : null,
            },
          });
        }
      }

      // Sync journals
      if (journals && typeof journals === "object") {
        for (const [date, j] of Object.entries(journals as Record<string, Journal>)) {
          await tx.journal.upsert({
            where: {
              userId_date: {
                userId,
                date,
              },
            },
            update: {
              mood: j.mood ?? null,
              wins: j.wins ?? "",
              challenges: j.challenges ?? "",
              learnings: j.learnings ?? "",
              notes: j.notes ?? "",
              plan: (j.plan ?? []) as unknown as import("@prisma/client").Prisma.InputJsonValue,
            },
            create: {
              userId,
              date,
              mood: j.mood ?? null,
              wins: j.wins ?? "",
              challenges: j.challenges ?? "",
              learnings: j.learnings ?? "",
              notes: j.notes ?? "",
              plan: (j.plan ?? []) as unknown as import("@prisma/client").Prisma.InputJsonValue,
            },
          });
        }
      }

      // Sync settings
      if (settings && typeof settings === "object") {
        await tx.userSettings.upsert({
          where: { userId },
          update: {
            name: settings.name ?? "",
            theme: settings.theme ?? "system",
            dailyGoalMinutes: settings.dailyGoalMinutes ?? 360,
            streakMinMinutes: settings.streakMinMinutes ?? 15,
            idleLimitMinutes: settings.idleLimitMinutes ?? 15,
            pomodoroFocus: settings.pomodoro?.focusMinutes ?? 25,
            pomodoroBreak: settings.pomodoro?.breakMinutes ?? 5,
            pomodoroEnabled: !!settings.pomodoro?.enabled,
            soundVolume: settings.sound?.volume ?? 0.7,
            soundMuted: !!settings.sound?.muted,
            showQuote: settings.showQuote ?? true,
            showHeatmap: settings.showHeatmap ?? true,
            showStreaks: settings.showStreaks ?? true,
          },
          create: {
            userId,
            name: settings.name ?? "",
            theme: settings.theme ?? "system",
            dailyGoalMinutes: settings.dailyGoalMinutes ?? 360,
            streakMinMinutes: settings.streakMinMinutes ?? 15,
            idleLimitMinutes: settings.idleLimitMinutes ?? 15,
            pomodoroFocus: settings.pomodoro?.focusMinutes ?? 25,
            pomodoroBreak: settings.pomodoro?.breakMinutes ?? 5,
            pomodoroEnabled: !!settings.pomodoro?.enabled,
            soundVolume: settings.sound?.volume ?? 0.7,
            soundMuted: !!settings.sound?.muted,
            showQuote: settings.showQuote ?? true,
            showHeatmap: settings.showHeatmap ?? true,
            showStreaks: settings.showStreaks ?? true,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync data to Neon:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
