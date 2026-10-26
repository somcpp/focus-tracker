import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAuthToken, verifyNeonAuthToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "claim";

    // 1. GENERATE: Authenticated user on Web generates a 6-digit pairing code
    if (action === "generate") {
      const token = extractAuthToken(req);
      const session = token ? await verifyNeonAuthToken(token) : null;
      if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Generate a 6-digit numeric PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const identifier = `desktop-pair:${pin}`;

      // Clean up any old pairing codes for this identifier if they exist
      await prisma.verification.deleteMany({
        where: { identifier },
      }).catch(() => {});

      // Create a 15-minute expiring pairing token
      await prisma.verification.create({
        data: {
          id: `pair_${Date.now()}_${pin}`,
          identifier,
          value: JSON.stringify({
            userId: session.userId,
            email: session.email,
            name: session.name || "Focus User",
            token: token,
          }),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      return NextResponse.json({ success: true, code: pin });
    }

    // 2. CLAIM: Desktop Island submits the 6-digit pairing code
    if (action === "claim") {
      const rawCode = String(body.code || "").trim().replace(/\s+/g, "");
      if (!rawCode || rawCode.length !== 6) {
        return NextResponse.json({ error: "Please enter a valid 6-digit code" }, { status: 400 });
      }

      const identifier = `desktop-pair:${rawCode}`;
      const record = await prisma.verification.findFirst({
        where: {
          identifier,
          expiresAt: { gt: new Date() },
        },
      });

      if (!record) {
        return NextResponse.json(
          { error: "Invalid or expired code. Please generate a fresh code in your web dashboard." },
          { status: 400 }
        );
      }

      let payload: { userId: string; email?: string; name?: string; token?: string };
      try {
        payload = JSON.parse(record.value);
      } catch {
        return NextResponse.json({ error: "Failed to read pairing payload" }, { status: 500 });
      }

      // Delete the record immediately (one-time use)
      await prisma.verification.delete({
        where: { id: record.id },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        token: payload.token,
        user: {
          id: payload.userId,
          email: payload.email,
          name: payload.name || "Focus User",
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Desktop pair error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
