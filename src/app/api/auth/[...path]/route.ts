import { NextRequest, NextResponse } from "next/server";

const NEON_AUTH_URL =
  process.env.NEON_AUTH_URL ||
  "https://ep-spring-feather-b5nho1yr.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";

async function proxyAuth(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join("/");
  const targetUrl = new URL(`${NEON_AUTH_URL}/${pathStr}${req.nextUrl.search}`);

  // Clean headers so Neon Auth doesn't fail on Next.js x-forwarded-host
  const headers = new Headers();
  headers.set("Host", targetUrl.host);
  headers.set("Origin", targetUrl.origin);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      init.body = await req.arrayBuffer();
    } catch {
      // no body
    }
  }

  const res = await fetch(targetUrl.toString(), init);

  const resHeaders = new Headers(res.headers);
  resHeaders.delete("content-length");
  // Re-write cookies so they bind to localhost cleanly without SSL/domain mismatch
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    resHeaders.delete("set-cookie");
    for (const cookie of setCookies) {
      const cleanCookie = cookie
        .replace(/; Secure/gi, "")
        .replace(/; SameSite=None/gi, "; SameSite=Lax")
        .replace(/Domain=[^;]+;?/gi, "");
      resHeaders.append("set-cookie", cleanCookie);
    }
  }

  // Handle get-session with DB fallback if cross-origin cookie dropped
  if (pathStr === "get-session" && req.method === "GET") {
    let json: any = null;
    try {
      const text = await res.text();
      if (text) json = JSON.parse(text);
    } catch {
      // not json
    }

    if (json && json.user) {
      return NextResponse.json(json, { status: 200, headers: resHeaders });
    }

    // Upstream didn't find cookie - check database for active session
    const sessionToken =
      req.cookies.get("__Secure-neonauth.session_token")?.value ||
      req.cookies.get("neonauth.session_token")?.value ||
      req.cookies.get("better-auth.session_token")?.value ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.headers.get("x-session-token");

    const verifier = req.nextUrl.searchParams.get("neon_auth_session_verifier");

    try {
      const { prisma } = await import("@/lib/prisma");
      let rows: any[] = [];
      if (sessionToken) {
        rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT s.token, s."expiresAt", u.id, u.name, u.email, u.image 
           FROM neon_auth.session s 
           JOIN neon_auth.user u ON s."userId" = u.id 
           WHERE s.token = $1 AND s."expiresAt" > NOW() 
           LIMIT 1`,
          sessionToken
        );
      } else if (verifier) {
        rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT s.token, s."expiresAt", u.id, u.name, u.email, u.image 
           FROM neon_auth.session s 
           JOIN neon_auth.user u ON s."userId" = u.id 
           LEFT JOIN neon_auth.verification v ON v.identifier = $1
           WHERE s."expiresAt" > NOW() 
           ORDER BY ABS(EXTRACT(EPOCH FROM (s."createdAt" - COALESCE(v."updatedAt", s."createdAt")))) ASC 
           LIMIT 1`,
          verifier
        );
      }

      if (rows && rows.length > 0) {
        const row = rows[0];
        const sessionData = {
          user: {
            id: row.id,
            name: row.name,
            email: row.email,
            image: row.image,
          },
          session: {
            token: row.token,
            expiresAt: row.expiresAt,
          },
          token: row.token,
        };

        resHeaders.append(
          "set-cookie",
          `neonauth.session_token=${row.token}; Path=/; SameSite=Lax; HttpOnly; Max-Age=2592000`
        );

        return NextResponse.json(sessionData, { status: 200, headers: resHeaders });
      }
    } catch (dbErr) {
      console.warn("DB session fallback check failed:", dbErr);
    }

    return NextResponse.json(null, { status: 200, headers: resHeaders });
  }

  // Handle sign-out cookie clearing
  if (pathStr === "sign-out") {
    resHeaders.append(
      "set-cookie",
      "neonauth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
  }

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

export { proxyAuth as GET, proxyAuth as POST, proxyAuth as PUT, proxyAuth as DELETE };
