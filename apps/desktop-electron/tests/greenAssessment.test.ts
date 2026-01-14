import { describe, expect, it } from "vitest";
import { evaluateGreenAssessment } from "../src/main/services/greenAssessmentService";

describe("evaluateGreenAssessment", () => {
  it("scores Green for strong eligibility and KPIs", () => {
    const result = evaluateGreenAssessment({
      useOfProceeds: ["Renewable Energy", "Green Buildings"],
      kpis: {
        emissionsReductionPct: 25,
        renewableSharePct: 60,
        energyEfficiencyPct: 20,
        cleanTransportPct: 30
      },
      reportingCadence: "Quarterly",
      verification: "ThirdParty",
      traceability: "Strong",
      exclusions: []
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.verdict).toBe("Green");
  });

  it("flags NotGreen when red-flag exclusions are present", () => {
    const result = evaluateGreenAssessment({
      useOfProceeds: ["Energy Efficiency"],
      kpis: { energyEfficiencyPct: 8 },
      reportingCadence: "Annual",
      verification: "Internal",
      traceability: "Weak",
      exclusions: ["Coal"]
    });

    expect(result.verdict).toBe("NotGreen");
    expect(result.breakdown.redFlags).toContain("Coal");
  });
});
