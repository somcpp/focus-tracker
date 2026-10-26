import { createRemoteJWKSet, jwtVerify } from "jose";

const jwksUrl =
  process.env.NEON_AUTH_JWKS_URL ||
  "https://ep-spring-feather-b5nho1yr.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json";

const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export interface AuthSession {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Verify a JWT token issued by Neon Auth using the JWKS endpoint.
 */
export async function verifyNeonAuthToken(token: string): Promise<AuthSession | null> {
  // 1. Try JWT verification first
  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (payload.sub) {
      return {
        userId: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        name: typeof payload.name === "string" ? payload.name : undefined,
      };
    }
  } catch {
    // Not a valid JWT — check database session table below
  }

  // 2. Check Neon Auth DB session table (handles opaque session tokens)
  try {
    const { prisma } = await import("@/lib/prisma");

    // Check Prisma session table
    const dbSess = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    }).catch(() => null);

    if (dbSess && dbSess.user) {
      return {
        userId: dbSess.userId,
        email: dbSess.user.email,
        name: dbSess.user.name || undefined,
      };
    }

    interface SessionDbRow {
      userId: string;
      email: string;
      name: string | null;
    }
    const rows = await prisma.$queryRawUnsafe<SessionDbRow[]>(
      `SELECT s."userId", u.email, u.name 
       FROM neon_auth.session s 
       JOIN neon_auth.user u ON s."userId" = u.id 
       WHERE s.token = $1 AND s."expiresAt" > NOW() 
       LIMIT 1`,
      token
    ).catch(() => [] as SessionDbRow[]);
    if (rows && rows.length > 0) {
      return {
        userId: rows[0].userId,
        email: rows[0].email,
        name: rows[0].name || undefined,
      };
    }
  } catch (dbErr) {
    console.warn("DB session verification error:", dbErr);
  }

  return null;
}

/**
 * Extract token from Authorization header or cookie.
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const t = authHeader.substring(7).trim();
    if (t && t !== "null" && t !== "undefined") return t;
  }

  const customHeader = req.headers.get("x-session-token");
  if (customHeader) {
    const t = customHeader.trim();
    if (t && t !== "null" && t !== "undefined") return t;
  }

  // Also check session cookies if present
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(
      /(?:__Secure-neonauth\.session_token|neonauth\.session_token|better-auth\.session_token|auth_token)=([^;]+)/
    );
    if (match) return decodeURIComponent(match[1].trim());
  }

  return null;
}
