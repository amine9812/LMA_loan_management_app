import type { SemanticDiffItem, TermSheetData } from "@covenantpulse/shared";

export function computeSemanticDiff(params: {
  from: TermSheetData;
  to: TermSheetData;
}): SemanticDiffItem[] {
  const { from, to } = params;
  const diffs: SemanticDiffItem[] = [];

  if (from.leverageThreshold !== to.leverageThreshold) {
    diffs.push({
      key: "covenant.leverage.threshold",
      entityType: "Covenant",
      message: `Leverage Ratio threshold changed from ${from.leverageThreshold}x to ${to.leverageThreshold}x.`
    });
  }

  if (from.interestCoverageThreshold !== to.interestCoverageThreshold) {
    diffs.push({
      key: "covenant.interest.threshold",
      entityType: "Covenant",
      message: `Interest Coverage threshold changed from ${from.interestCoverageThreshold}x to ${to.interestCoverageThreshold}x.`
    });
  }

  if (from.reportingDaysAfterPeriodEnd !== to.reportingDaysAfterPeriodEnd) {
    diffs.push({
      key: "obligation.reporting.days",
      entityType: "Obligation",
      message: `Quarterly statements due days changed from ${from.reportingDaysAfterPeriodEnd} to ${to.reportingDaysAfterPeriodEnd}.`
    });
  }

  if (from.ebitdaAdjustments.join("|") !== to.ebitdaAdjustments.join("|")) {
    diffs.push({
      key: "definition.ebitda.adjustments",
      entityType: "Definition",
      message: "EBITDA adjustment list updated between versions."
    });
  }

  if (from.marginBps !== to.marginBps) {
    diffs.push({
      key: "termSheet.margin",
      entityType: "TermSheet",
      message: `Margin changed from ${from.marginBps} bps to ${to.marginBps} bps.`
    });
  }

  if (from.maturityDate !== to.maturityDate) {
    diffs.push({
      key: "termSheet.maturity",
      entityType: "TermSheet",
      message: `Maturity date changed from ${from.maturityDate} to ${to.maturityDate}.`
    });
  }

  return diffs;
}
