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
  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch (error) {
    console.error("Neon Auth token verification error:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie.
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Also check session cookie if present
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/(?:better-auth\.session_token|auth_token)=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}
