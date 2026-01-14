import {
  addDays,
  addMonths,
  isAfter,
  parseISO,
  startOfDay,
  subDays
} from "date-fns";
import type { DueRule, ObligationFrequency } from "@covenantpulse/shared";

export type GeneratedInstance = {
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string;
};

const frequencyToMonths: Record<ObligationFrequency, number> = {
  Once: 0,
  Monthly: 1,
  Quarterly: 3,
  Annually: 12,
  Adhoc: 0
};

export function generateSchedule(params: {
  loanStartDate: string;
  frequency: ObligationFrequency;
  dueRule: DueRule;
  monthsAhead: number;
}): GeneratedInstance[] {
  const { loanStartDate, frequency, dueRule, monthsAhead } = params;

  const start = startOfDay(parseISO(loanStartDate));
  if (Number.isNaN(start.valueOf())) {
    return [];
  }

  if (frequency === "Adhoc") {
    return [];
  }

  if (frequency === "Once") {
    const periodEnd = start;
    const dueDate = computeDueDate({ periodEnd, dueRule });
    return [
      {
        periodStart: start.toISOString(),
        periodEnd: periodEnd.toISOString(),
        dueDate: dueDate.toISOString()
      }
    ];
  }

  const months = frequencyToMonths[frequency];
  const horizon = addMonths(start, monthsAhead);
  const instances: GeneratedInstance[] = [];
  let cursor = start;

  while (true) {
    const periodEnd = subDays(addMonths(cursor, months), 1);
    if (isAfter(cursor, horizon)) {
      break;
    }
    const dueDate = computeDueDate({ periodEnd, dueRule });
    instances.push({
      periodStart: cursor.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dueDate: dueDate.toISOString()
    });
    cursor = addMonths(cursor, months);
  }

  return instances;
}

function computeDueDate(params: { periodEnd: Date; dueRule: DueRule }): Date {
  const { periodEnd, dueRule } = params;
  if (dueRule.type === "after_period_end") {
    return addDays(periodEnd, dueRule.daysAfter);
  }

  if (dueRule.type === "fixed_date") {
    const year = periodEnd.getFullYear();
    const fixed = new Date(year, dueRule.month - 1, dueRule.day);
    return fixed;
  }

  return periodEnd;
}
