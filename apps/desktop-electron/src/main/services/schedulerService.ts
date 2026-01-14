import { generateSchedule } from "@covenantpulse/core";
import type { DueRule, ObligationFrequency } from "@covenantpulse/shared";

export function buildSchedule(params: {
  loanStartDate: string;
  frequency: ObligationFrequency;
  dueRule: DueRule;
  monthsAhead: number;
}): { periodStart: string | null; periodEnd: string | null; dueDate: string }[] {
  return generateSchedule({
    loanStartDate: params.loanStartDate,
    frequency: params.frequency === "Adhoc" ? "Monthly" : (params.frequency as "Monthly" | "Quarterly" | "Annually"),
    dueRule: params.dueRule,
    monthsAhead: params.monthsAhead
  });
}
