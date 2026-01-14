import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Obligation, ObligationCreateInput, ObligationInstance } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbObligation = {
  id: string;
  loan_id: string;
  title: string;
  description: string;
  frequency: string;
  due_rule_json: string;
  owner_party: string;
  severity: string;
  status: string;
  source_clause_id: string | null;
  created_at: string;
};

type DbObligationInstance = {
  id: string;
  obligation_id: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string;
  status: string;
  last_reminder_at: string | null;
};

function mapObligation(row: DbObligation): Obligation {
  return {
    id: row.id,
    loanId: row.loan_id,
    title: row.title,
    description: row.description,
    frequency: row.frequency as Obligation["frequency"],
    dueRuleJson: row.due_rule_json,
    ownerParty: row.owner_party as Obligation["ownerParty"],
    severity: row.severity as Obligation["severity"],
    status: row.status as Obligation["status"],
    sourceClauseId: row.source_clause_id,
    createdAt: row.created_at
  };
}

function mapInstance(row: DbObligationInstance): ObligationInstance {
  return {
    id: row.id,
    obligationId: row.obligation_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueDate: row.due_date,
    status: row.status as ObligationInstance["status"],
    lastReminderAt: row.last_reminder_at
  };
}

export class ObligationsRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): Obligation[] {
    const rows = this.db
      .prepare("SELECT * FROM obligations WHERE loan_id = ? ORDER BY created_at DESC")
      .all(loanId) as DbObligation[];
    return rows.map(mapObligation);
  }

  create(input: ObligationCreateInput): Obligation {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO obligations (id, loan_id, title, description, frequency, due_rule_json, owner_party, severity, status, source_clause_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        input.loanId,
        input.title,
        input.description,
        input.frequency,
        JSON.stringify(input.dueRule),
        input.ownerParty,
        input.severity,
        input.status,
        input.sourceClauseId ?? null,
        nowIso()
      );
    const row = this.db
      .prepare("SELECT * FROM obligations WHERE id = ?")
      .get(id) as DbObligation;
    return mapObligation(row);
  }

  listInstancesByLoan(loanId: string): ObligationInstance[] {
    const rows = this.db
      .prepare(
        "SELECT oi.* FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ? ORDER BY oi.due_date ASC"
      )
      .all(loanId) as DbObligationInstance[];
    return rows.map(mapInstance);
  }

  updateInstance(instanceId: string, updates: { status?: string; dueDate?: string }): ObligationInstance {
    const existing = this.db
      .prepare("SELECT * FROM obligation_instances WHERE id = ?")
      .get(instanceId) as DbObligationInstance | undefined;
    if (!existing) {
      throw new Error("Instance not found");
    }
    const nextStatus = updates.status ?? existing.status;
    const nextDueDate = updates.dueDate ?? existing.due_date;
    this.db
      .prepare("UPDATE obligation_instances SET status = ?, due_date = ? WHERE id = ?")
      .run(nextStatus, nextDueDate, instanceId);
    const row = this.db
      .prepare("SELECT * FROM obligation_instances WHERE id = ?")
      .get(instanceId) as DbObligationInstance;
    return mapInstance(row);
  }

  createInstances(params: {
    obligationId: string;
    instances: { periodStart: string | null; periodEnd: string | null; dueDate: string }[];
  }): number {
    const stmt = this.db.prepare(
      "INSERT INTO obligation_instances (id, obligation_id, period_start, period_end, due_date, status, last_reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    let created = 0;
    params.instances.forEach((instance) => {
      stmt.run(
        randomUUID(),
        params.obligationId,
        instance.periodStart,
        instance.periodEnd,
        instance.dueDate,
        "Pending",
        null
      );
      created += 1;
    });
    return created;
  }
}
