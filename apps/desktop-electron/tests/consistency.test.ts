import { describe, expect, it } from "vitest";
import { computeSemanticDiff, runConsistencyChecks } from "@core";
import type { Covenant, Definition, Obligation, ObligationInstance, TermSheetData } from "@shared";

describe("computeSemanticDiff", () => {
  it("captures leverage and reporting changes", () => {
    const from: TermSheetData = {
      facilityType: "Term Loan",
      commitmentAmount: 25000000,
      marginBps: 275,
      maturityDate: "2029-12-31",
      leverageThreshold: 4.0,
      interestCoverageThreshold: 2.0,
      reportingDaysAfterPeriodEnd: 45,
      ebitdaAdjustments: ["Non-cash charges"]
    };
    const to: TermSheetData = {
      ...from,
      leverageThreshold: 3.5,
      reportingDaysAfterPeriodEnd: 60
    };
    const diff = computeSemanticDiff({ from, to });
    expect(diff.some((item) => item.message.includes("Leverage Ratio"))).toBe(true);
    expect(diff.some((item) => item.message.includes("Quarterly statements"))).toBe(true);
  });
});

describe("runConsistencyChecks", () => {
  it("flags threshold mismatch, missing definition, and due rule conflicts", () => {
    const termSheet: TermSheetData = {
      facilityType: "Term Loan",
      commitmentAmount: 25000000,
      marginBps: 275,
      maturityDate: "2029-12-31",
      leverageThreshold: 3.5,
      interestCoverageThreshold: 2.0,
      reportingDaysAfterPeriodEnd: 45,
      ebitdaAdjustments: []
    };

    const covenants: Covenant[] = [
      {
        id: "cov-1",
        loanId: "loan-1",
        name: "Leverage Ratio",
        covenantType: "Ratio",
        formulaId: "formula-1",
        thresholdOp: "<=",
        thresholdValue: 4.0,
        frequency: "Quarterly",
        sourceClauseId: null,
        status: "Active"
      }
    ];

    const obligations: Obligation[] = [
      {
        id: "obl-1",
        loanId: "loan-1",
        title: "Quarterly Financial Statements",
        description: "Deliver statements.",
        frequency: "Quarterly",
        dueRuleJson: JSON.stringify({ type: "after_period_end", daysAfter: 45, period: "Quarter" }),
        ownerParty: "Borrower",
        severity: "High",
        status: "Active",
        sourceClauseId: null,
        createdAt: "2024-01-01T00:00:00.000Z"
      }
    ];

    const obligationInstances: ObligationInstance[] = [
      {
        id: "inst-1",
        obligationId: "obl-1",
        periodStart: "2024-01-01T00:00:00.000Z",
        periodEnd: "2024-03-31T00:00:00.000Z",
        dueDate: "2024-05-30T00:00:00.000Z",
        status: "Pending",
        lastReminderAt: null
      }
    ];

    const definitions: Definition[] = [];

    const findings = runConsistencyChecks({
      termSheet,
      obligations,
      obligationInstances,
      covenants,
      formulas: [
        {
          id: "formula-1",
          expression: {
            type: "op",
            op: "/",
            left: { type: "var", key: "TotalDebt" },
            right: { type: "var", key: "EBITDA" }
          }
        }
      ],
      definitions,
      clauses: []
    });

    expect(findings.some((finding) => finding.ruleKey === "TERM_SHEET_THRESHOLD_MISMATCH")).toBe(true);
    expect(findings.some((finding) => finding.ruleKey === "MISSING_DEFINITION")).toBe(true);
    expect(findings.some((finding) => finding.ruleKey === "DUE_RULE_CONFLICT")).toBe(true);
  });
});
