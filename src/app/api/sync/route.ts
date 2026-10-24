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
    const { categories, tasks, sessions, journals, settings, deletedCategoryIds } = body;

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
      // Remove any explicitly deleted categories
      if (Array.isArray(deletedCategoryIds) && deletedCategoryIds.length > 0) {
        await tx.category.deleteMany({
          where: {
            userId,
            id: { in: deletedCategoryIds },
          },
        });
      }

      // Sync categories
      const categoryIdSet = new Set<string>();
      if (Array.isArray(categories)) {
        for (const c of categories) {
          if (!c.id) continue;
          categoryIdSet.add(c.id);
          await tx.category.upsert({
            where: { id: c.id },
            update: {
              userId,
              name: c.name || "General",
              icon: c.icon || "layers",
              color: c.color || "blue",
              archived: !!c.archived,
            },
            create: {
              id: c.id,
              userId,
              name: c.name || "General",
              icon: c.icon || "layers",
              color: c.color || "blue",
              archived: !!c.archived,
            },
          });
        }
      }

      // Also register any existing categories for this user from DB
      const dbCategories = await tx.category.findMany({
        where: { userId },
        select: { id: true },
      });
      dbCategories.forEach((c) => categoryIdSet.add(c.id));

      // Sync tasks
      const taskIdSet = new Set<string>();
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          if (!t.id || !t.title) continue;

          let categoryId = t.categoryId;
          if (!categoryId || !categoryIdSet.has(categoryId)) {
            // Create fallback category if category was missing or orphaned
            const fallbackId = categoryId || `cat_${Date.now()}`;
            await tx.category.upsert({
              where: { id: fallbackId },
              update: { userId },
              create: {
                id: fallbackId,
                userId,
                name: "General",
                icon: "layers",
                color: "blue",
                archived: false,
              },
            });
            categoryIdSet.add(fallbackId);
            categoryId = fallbackId;
          }

          taskIdSet.add(t.id);
          await tx.task.upsert({
            where: { id: t.id },
            update: {
              userId,
              categoryId,
              date: t.date || new Date().toISOString().slice(0, 10),
              title: t.title,
              notes: t.notes ?? "",
              done: !!t.done,
              difficulty: t.difficulty ?? null,
              carriedTo: t.carriedTo ?? null,
            },
            create: {
              id: t.id,
              userId,
              categoryId,
              date: t.date || new Date().toISOString().slice(0, 10),
              title: t.title,
              notes: t.notes ?? "",
              done: !!t.done,
              difficulty: t.difficulty ?? null,
              carriedTo: t.carriedTo ?? null,
            },
          });
        }
      }

      const dbTasks = await tx.task.findMany({
        where: { userId },
        select: { id: true },
      });
      dbTasks.forEach((t) => taskIdSet.add(t.id));

      // Sync sessions
      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          if (!s.id || !s.taskId || !taskIdSet.has(s.taskId)) continue;
          const startNum = Math.floor(Number(s.start));
          if (isNaN(startNum) || startNum <= 0) continue;
          const endNum = s.end !== null && s.end !== undefined ? Math.floor(Number(s.end)) : null;

          await tx.focusSession.upsert({
            where: { id: s.id },
            update: {
              userId,
              taskId: s.taskId,
              start: BigInt(startNum),
              end: endNum !== null && !isNaN(endNum) ? BigInt(endNum) : null,
            },
            create: {
              id: s.id,
              userId,
              taskId: s.taskId,
              start: BigInt(startNum),
              end: endNum !== null && !isNaN(endNum) ? BigInt(endNum) : null,
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

export async function DELETE(req: Request) {
  try {
    const token = extractAuthToken(req);
    const session = token ? await verifyNeonAuthToken(token) : null;
    const userId = session?.userId ?? "default_local_user";

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const taskId = searchParams.get("taskId");

    if (categoryId) {
      await prisma.category.deleteMany({
        where: { id: categoryId, userId },
      });
      return NextResponse.json({ success: true, deleted: "category" });
    }

    if (taskId) {
      await prisma.task.deleteMany({
        where: { id: taskId, userId },
      });
      return NextResponse.json({ success: true, deleted: "task" });
    }

    return NextResponse.json({ error: "Missing entity id to delete" }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete entity in Neon:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
