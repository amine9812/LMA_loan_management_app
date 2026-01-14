import { describe, expect, it } from "vitest";
import { computeCovenant, generateSchedule } from "@core";

describe("generateSchedule", () => {
  it("creates quarterly instances with due date after period end", () => {
    const schedule = generateSchedule({
      loanStartDate: "2024-01-01",
      frequency: "Quarterly",
      dueRule: { type: "after_period_end", daysAfter: 45, period: "Quarter" },
      monthsAhead: 6
    });
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[0].dueDate).toContain("2024");
  });
});

describe("computeCovenant", () => {
  it("computes leverage ratio and compares threshold", () => {
    const expression = {
      type: "op",
      op: "/",
      left: { type: "var", key: "TotalDebt" },
      right: { type: "var", key: "EBITDA" }
    } as const;
    const result = computeCovenant(expression, { TotalDebt: 100, EBITDA: 50 }, "<=", 2.5);
    expect(result.computedValue).toBe(2);
    expect(result.passFail).toBe("Pass");
  });
});
