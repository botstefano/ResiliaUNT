import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_SESSION_COOKIE = "resilia_demo_session";
export const DEMO_SESSION_SECONDS = 4 * 60 * 60;

export type DemoSessionClaims = {
  sub: string;
  role: "estudiante" | "terapeuta";
  id_estudiante: number | null;
  id_terapeuta: number | null;
  nombre_visible: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret) throw new Error("Falta configurar DEMO_SESSION_SECRET.");
  return secret;
}

export function signDemoSession(claims: DemoSessionClaims): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifyDemoSession(token: string): DemoSessionClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", getSecret()).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DemoSessionClaims;
    if (!claims || !["estudiante", "terapeuta"].includes(claims.role)) return null;
    if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof claims.nombre_visible !== "string" || !claims.nombre_visible) return null;
    if (claims.role === "estudiante" &&
      (!Number.isSafeInteger(claims.id_estudiante) || (claims.id_estudiante ?? 0) <= 0 || claims.id_terapeuta !== null)) return null;
    if (claims.role === "terapeuta" &&
      (!Number.isSafeInteger(claims.id_terapeuta) || (claims.id_terapeuta ?? 0) <= 0 || claims.id_estudiante !== null)) return null;
    return claims;
  } catch {
    return null;
  }
}
