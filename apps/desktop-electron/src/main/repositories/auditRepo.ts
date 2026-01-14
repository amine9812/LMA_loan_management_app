import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { AuditEvent } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbAudit = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
};

function mapAudit(row: DbAudit): AuditEvent {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeJson: row.before_json,
    afterJson: row.after_json,
    createdAt: row.created_at
  };
}

export class AuditRepo {
  constructor(private readonly db: SqliteDatabase) {}

  add(params: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }): void {
    this.db
      .prepare(
        "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        randomUUID(),
        params.actorUserId,
        params.action,
        params.entityType,
        params.entityId,
        params.before ? JSON.stringify(params.before) : null,
        params.after ? JSON.stringify(params.after) : null,
        nowIso()
      );
  }

  listForLoan(loanId: string): AuditEvent[] {
    const rows = this.db
      .prepare(
        "SELECT ae.* FROM audit_events ae WHERE (ae.entity_type = 'loan' AND ae.entity_id = ?) OR (ae.entity_type = 'obligation' AND ae.entity_id IN (SELECT id FROM obligations WHERE loan_id = ?)) OR (ae.entity_type = 'obligation_instance' AND ae.entity_id IN (SELECT oi.id FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ?)) OR (ae.entity_type = 'covenant' AND ae.entity_id IN (SELECT id FROM covenants WHERE loan_id = ?)) OR (ae.entity_type = 'submission' AND ae.entity_id IN (SELECT id FROM submissions WHERE loan_id = ?)) OR (ae.entity_type = 'waiver' AND ae.entity_id IN (SELECT id FROM waivers WHERE loan_id = ?)) OR (ae.entity_type = 'document' AND ae.entity_id IN (SELECT id FROM documents WHERE loan_id = ?)) OR (ae.entity_type = 'clause' AND ae.entity_id IN (SELECT c.id FROM clauses c JOIN documents d ON d.id = c.document_id WHERE d.loan_id = ?)) ORDER BY ae.created_at DESC"
      )
      .all(loanId, loanId, loanId, loanId, loanId, loanId, loanId, loanId) as DbAudit[];
    return rows.map(mapAudit);
  }

  listRecent(limit: number): AuditEvent[] {
    const rows = this.db
      .prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?")
      .all(limit) as DbAudit[];
    return rows.map(mapAudit);
  }
}
