import type { FormulaExpression } from "@covenantpulse/shared";
import type { SqliteDatabase } from "@covenantpulse/db";
import { computeCovenant } from "@covenantpulse/core";
import { CovenantsRepo } from "../repositories";

type DbCovenantWithFormula = {
  id: string;
  threshold_op: string;
  threshold_value: number;
  expression_json: string;
};

export function computeCovenantResults(params: {
  db: SqliteDatabase;
  loanId: string;
  metrics: Record<string, number>;
  actorUserId: string;
  periodStart: string | null;
  periodEnd: string | null;
}): void {
  const covenants = params.db
    .prepare(
      "SELECT c.id, c.threshold_op, c.threshold_value, f.expression_json FROM covenants c JOIN formulas f ON c.formula_id = f.id WHERE c.loan_id = ?"
    )
    .all(params.loanId) as DbCovenantWithFormula[];

  const covenantsRepo = new CovenantsRepo(params.db);
  covenants.forEach((covenant) => {
    const expression = JSON.parse(covenant.expression_json) as FormulaExpression;
    const result = computeCovenant(
      expression,
      params.metrics,
      covenant.threshold_op as "<=" | ">=" | "<" | ">" | "=",
      covenant.threshold_value
    );
    covenantsRepo.createResult({
      covenantId: covenant.id,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      computedValue: result.computedValue,
      thresholdValue: covenant.threshold_value,
      passFail: result.passFail,
      computedBy: params.actorUserId,
      notes: "Computed from borrower submission"
    });
  });
}
