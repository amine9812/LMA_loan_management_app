import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { Role, User } from "@covenantpulse/shared";

export type Session = {
  sessionId: string;
  userId: string;
  role: Role;
};

const sessions = new Map<string, Session>();

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export function hashPasswordSync(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(user: User): Session {
  const sessionId = randomUUID();
  const session = { sessionId, userId: user.id, role: user.role };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) ?? null;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}
