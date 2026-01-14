import type { Role } from "@covenantpulse/shared";
import type { Session } from "./auth";

export function assertRole(session: Session | null, allowed: Role[]): void {
  if (!session) {
    throw new Error("Unauthenticated");
  }
  if (!allowed.includes(session.role)) {
    throw new Error("Forbidden");
  }
}
