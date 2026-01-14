import type { SqliteDatabase } from "@covenantpulse/db";
import { randomUUID } from "crypto";

export function logAuditEvent(params: {
  db: SqliteDatabase;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): void {
  const { db, actorUserId, action, entityType, entityId, before, after } = params;
  db.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    actorUserId,
    action,
    entityType,
    entityId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    new Date().toISOString()
  );
}
