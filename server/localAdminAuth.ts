import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { jwtVerify, SignJWT } from "jose";

const scryptAsync = promisify(scrypt);
export const ADMIN_SESSION_COOKIE = "recebe_admin_session";
const SESSION_ISSUER = "painel-recebimentos";
const SESSION_LIFETIME = "12h";

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("A chave de sessão não está disponível.");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, saved] = stored.split(":");
  if (!salt || !saved) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const savedBuffer = Buffer.from(saved, "hex");
  return savedBuffer.length === derived.length && timingSafeEqual(savedBuffer, derived);
}

export async function createAdminSession(userId: number) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SESSION_ISSUER)
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(SESSION_LIFETIME)
    .sign(sessionKey());
}

export async function getAdminSessionUserId(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { issuer: SESSION_ISSUER });
    if (payload.role !== "admin" || !payload.sub) return null;
    const userId = Number(payload.sub);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
