import { addDays, parseISO } from "date-fns";
import type {
  Clause,
  ConsistencyFindingSeverity,
  Covenant,
  Definition,
  DueRule,
  FormulaExpression,
  Obligation,
  ObligationInstance,
  TermSheetData
} from "@covenantpulse/shared";

export type ConsistencyFindingResult = {
  ruleKey: string;
  severity: ConsistencyFindingSeverity;
  message: string;
  affectedEntityType: string;
  affectedEntityId: string;
};

export function runConsistencyChecks(params: {
  termSheet?: TermSheetData | null;
  obligations: Obligation[];
  obligationInstances: ObligationInstance[];
  covenants: Covenant[];
  formulas: Array<{ id: string; expression: FormulaExpression }>;
  definitions: Definition[];
  clauses: Clause[];
}): ConsistencyFindingResult[] {
  const { termSheet, obligations, obligationInstances, covenants, formulas, definitions, clauses } =
    params;
  const findings: ConsistencyFindingResult[] = [];

  if (termSheet) {
    const leverage = covenants.find((covenant) => covenant.name === "Leverage Ratio");
    if (leverage && leverage.thresholdValue !== termSheet.leverageThreshold) {
      findings.push({
        ruleKey: "TERM_SHEET_THRESHOLD_MISMATCH",
        severity: "High",
        message: `Leverage Ratio threshold ${leverage.thresholdValue}x does not match term sheet ${termSheet.leverageThreshold}x.`,
        affectedEntityType: "Covenant",
        affectedEntityId: leverage.id
      });
    }
    const interest = covenants.find((covenant) => covenant.name === "Interest Coverage");
    if (interest && interest.thresholdValue !== termSheet.interestCoverageThreshold) {
      findings.push({
        ruleKey: "TERM_SHEET_THRESHOLD_MISMATCH",
        severity: "High",
        message: `Interest Coverage threshold ${interest.thresholdValue}x does not match term sheet ${termSheet.interestCoverageThreshold}x.`,
        affectedEntityType: "Covenant",
        affectedEntityId: interest.id
      });
    }
  }

  const definitionTerms = new Set(definitions.map((definition) => definition.term.toLowerCase()));
  formulas.forEach((formula) => {
    const vars = collectFormulaVariables(formula.expression);
    vars.forEach((variable) => {
      if (!definitionTerms.has(variable.toLowerCase())) {
        findings.push({
          ruleKey: "MISSING_DEFINITION",
          severity: "Med",
          message: `Formula references ${variable} but no definition was found.`,
          affectedEntityType: "Formula",
          affectedEntityId: formula.id
        });
      }
    });
  });

  const clauseIds = new Set(clauses.map((clause) => clause.id));
  obligations.forEach((obligation) => {
    if (obligation.sourceClauseId && !clauseIds.has(obligation.sourceClauseId)) {
      findings.push({
        ruleKey: "SOURCE_CLAUSE_MISSING",
        severity: "Low",
        message: `Obligation ${obligation.title} references a missing clause.`,
        affectedEntityType: "Obligation",
        affectedEntityId: obligation.id
      });
    }
  });
  covenants.forEach((covenant) => {
    if (covenant.sourceClauseId && !clauseIds.has(covenant.sourceClauseId)) {
      findings.push({
        ruleKey: "SOURCE_CLAUSE_MISSING",
        severity: "Low",
        message: `Covenant ${covenant.name} references a missing clause.`,
        affectedEntityType: "Covenant",
        affectedEntityId: covenant.id
      });
    }
  });

  const dueRuleMap = new Map<string, DueRule>();
  obligations.forEach((obligation) => {
    try {
      const dueRule = JSON.parse(obligation.dueRuleJson) as DueRule;
      dueRuleMap.set(obligation.id, dueRule);
    } catch {
      return;
    }
  });

  obligationInstances.forEach((instance) => {
    const dueRule = dueRuleMap.get(instance.obligationId);
    if (!dueRule || dueRule.type === "custom") {
      return;
    }
    if (!instance.periodEnd) {
      return;
    }
    const expected = computeDueDate({ periodEnd: instance.periodEnd, dueRule });
    if (!expected) {
      return;
    }
    const expectedIso = expected.toISOString().slice(0, 10);
    const actualIso = instance.dueDate.slice(0, 10);
    if (expectedIso !== actualIso) {
      findings.push({
        ruleKey: "DUE_RULE_CONFLICT",
        severity: "Med",
        message: `Due date ${actualIso} does not align with rule (${expectedIso}).`,
        affectedEntityType: "ObligationInstance",
        affectedEntityId: instance.id
      });
    }
  });

  const obligationGroups = new Map<string, Obligation[]>();
  obligations.forEach((obligation) => {
    const key = obligation.title.toLowerCase();
    const group = obligationGroups.get(key) ?? [];
    group.push(obligation);
    obligationGroups.set(key, group);
  });
  obligationGroups.forEach((group) => {
    if (group.length < 2) {
      return;
    }
    const ruleSet = new Set(group.map((obligation) => obligation.dueRuleJson));
    if (ruleSet.size > 1) {
      group.forEach((obligation) => {
        findings.push({
          ruleKey: "DUPLICATE_OBLIGATION",
          severity: "Low",
          message: `Obligation ${obligation.title} appears multiple times with conflicting rules.`,
          affectedEntityType: "Obligation",
          affectedEntityId: obligation.id
        });
      });
    }
  });

  return findings;
}

function computeDueDate(params: { periodEnd: string; dueRule: DueRule }): Date | null {
  const { periodEnd, dueRule } = params;
  const end = parseISO(periodEnd);
  if (Number.isNaN(end.getTime())) {
    return null;
  }
  if (dueRule.type === "after_period_end") {
    return addDays(end, dueRule.daysAfter);
  }
  if (dueRule.type === "fixed_date") {
    return new Date(end.getUTCFullYear(), dueRule.month - 1, dueRule.day);
  }
  return null;
}

function collectFormulaVariables(expression: FormulaExpression): string[] {
  if (expression.type === "var") {
    return [expression.key];
  }
  if (expression.type === "number") {
    return [];
  }
  return [...collectFormulaVariables(expression.left), ...collectFormulaVariables(expression.right)];
}
