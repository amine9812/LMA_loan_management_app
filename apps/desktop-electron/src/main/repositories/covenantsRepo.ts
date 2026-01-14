import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Covenant, CovenantCreateInput, CovenantResult } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbCovenant = {
  id: string;
  loan_id: string;
  name: string;
  covenant_type: string;
  formula_id: string;
  threshold_op: string;
  threshold_value: number;
  frequency: string;
  source_clause_id: string | null;
  status: string;
};

type DbCovenantResult = {
  id: string;
  covenant_id: string;
  period_start: string | null;
  period_end: string | null;
  computed_value: number;
  threshold_value: number;
  pass_fail: string;
  computed_at: string;
  computed_by: string;
  notes: string | null;
};

function mapCovenant(row: DbCovenant): Covenant {
  return {
    id: row.id,
    loanId: row.loan_id,
    name: row.name,
    covenantType: row.covenant_type as Covenant["covenantType"],
    formulaId: row.formula_id,
    thresholdOp: row.threshold_op as Covenant["thresholdOp"],
    thresholdValue: row.threshold_value,
    frequency: row.frequency as Covenant["frequency"],
    sourceClauseId: row.source_clause_id,
    status: row.status as Covenant["status"]
  };
}

function mapCovenantResult(row: DbCovenantResult): CovenantResult {
  return {
    id: row.id,
    covenantId: row.covenant_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    computedValue: row.computed_value,
    thresholdValue: row.threshold_value,
    passFail: row.pass_fail as CovenantResult["passFail"],
    computedAt: row.computed_at,
    computedBy: row.computed_by,
    notes: row.notes
  };
}

export class CovenantsRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): Covenant[] {
    const rows = this.db
      .prepare("SELECT * FROM covenants WHERE loan_id = ? ORDER BY name ASC")
      .all(loanId) as DbCovenant[];
    return rows.map(mapCovenant);
  }

  create(input: CovenantCreateInput): Covenant {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        input.loanId,
        input.name,
        input.covenantType,
        input.formulaId,
        input.thresholdOp,
        input.thresholdValue,
        input.frequency,
        input.sourceClauseId ?? null,
        input.status
      );
    const row = this.db
      .prepare("SELECT * FROM covenants WHERE id = ?")
      .get(id) as DbCovenant;
    return mapCovenant(row);
  }

  listResultsByLoan(loanId: string): CovenantResult[] {
    const rows = this.db
      .prepare(
        "SELECT cr.* FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ? ORDER BY cr.computed_at DESC"
      )
      .all(loanId) as DbCovenantResult[];
    return rows.map(mapCovenantResult);
  }

  listResultsByLoanPeriod(params: { loanId: string; periodStart?: string | null; periodEnd?: string | null }): CovenantResult[] {
    const rows = this.db
      .prepare(
        "SELECT cr.* FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ? AND (? IS NULL OR cr.period_start = ?) AND (? IS NULL OR cr.period_end = ?) ORDER BY cr.computed_at DESC"
      )
      .all(params.loanId, params.periodStart ?? null, params.periodStart ?? null, params.periodEnd ?? null, params.periodEnd ?? null) as DbCovenantResult[];
    return rows.map(mapCovenantResult);
  }

  createResult(params: {
    covenantId: string;
    periodStart: string | null;
    periodEnd: string | null;
    computedValue: number;
    thresholdValue: number;
    passFail: CovenantResult["passFail"];
    computedBy: string;
    notes?: string | null;
  }): CovenantResult {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO covenant_results (id, covenant_id, period_start, period_end, computed_value, threshold_value, pass_fail, computed_at, computed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        params.covenantId,
        params.periodStart,
        params.periodEnd,
        params.computedValue,
        params.thresholdValue,
        params.passFail,
        nowIso(),
        params.computedBy,
        params.notes ?? null
      );
    const row = this.db
      .prepare("SELECT * FROM covenant_results WHERE id = ?")
      .get(id) as DbCovenantResult;
    return mapCovenantResult(row);
  }
}
