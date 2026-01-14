import type { GreenAssessment, GreenAssessmentVerdict } from "@covenantpulse/shared";
import { GreenAssessmentRepo } from "../repositories";

export type GreenAssessmentInputs = {
  useOfProceeds: string[];
  kpis: {
    emissionsReductionPct?: number;
    renewableSharePct?: number;
    energyEfficiencyPct?: number;
    cleanTransportPct?: number;
  };
  reportingCadence: "Monthly" | "Quarterly" | "Semiannual" | "Annual" | "Adhoc";
  verification: "None" | "Internal" | "ThirdParty";
  traceability: "Weak" | "Moderate" | "Strong";
  exclusions: string[];
  notes?: string;
};

export type GreenAssessmentBreakdown = {
  components: {
    eligibility: number;
    kpiAmbition: number;
    verificationReporting: number;
    traceability: number;
    exclusions: number;
  };
  missingData: string[];
  redFlags: string[];
};

const eligibleCategories = new Set([
  "Renewable Energy",
  "Green Buildings",
  "Clean Transport",
  "Energy Efficiency",
  "Pollution Prevention",
  "Sustainable Water",
  "Climate Adaptation",
  "Circular Economy"
]);

const redFlagExclusions = new Set([
  "Coal",
  "Coal expansion",
  "Oil expansion",
  "Gas expansion",
  "Arctic drilling",
  "Deforestation",
  "Weapons",
  "Fossil fuel expansion"
]);

function normalizeKpi(value?: number, thresholds?: { low: number; mid: number; high: number }) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  const { low, mid, high } = thresholds ?? { low: 5, mid: 15, high: 30 };
  if (value >= high) return 1;
  if (value >= mid) return 0.75;
  if (value >= low) return 0.4;
  return 0.2;
}

function scoreEligibility(useOfProceeds: string[]) {
  if (!useOfProceeds.length) {
    return { score: 0, missing: "Use-of-proceeds categories" };
  }
  const eligibleCount = useOfProceeds.filter((item) => eligibleCategories.has(item)).length;
  const ratio = eligibleCount / useOfProceeds.length;
  return { score: Math.round(30 * ratio), missing: null };
}

function scoreKpis(kpis: GreenAssessmentInputs["kpis"]) {
  const metrics = [
    normalizeKpi(kpis.emissionsReductionPct, { low: 5, mid: 15, high: 30 }),
    normalizeKpi(kpis.renewableSharePct, { low: 15, mid: 35, high: 60 }),
    normalizeKpi(kpis.energyEfficiencyPct, { low: 5, mid: 12, high: 25 }),
    normalizeKpi(kpis.cleanTransportPct, { low: 10, mid: 25, high: 50 })
  ].filter((val): val is number => val !== null);

  if (!metrics.length) {
    return { score: 0, missing: "KPI targets" };
  }
  const average = metrics.reduce((acc, val) => acc + val, 0) / metrics.length;
  return { score: Math.round(25 * average), missing: null };
}

function scoreVerification(reportingCadence: GreenAssessmentInputs["reportingCadence"], verification: GreenAssessmentInputs["verification"]) {
  const cadenceScore =
    reportingCadence === "Monthly"
      ? 1
      : reportingCadence === "Quarterly"
        ? 0.8
        : reportingCadence === "Semiannual"
          ? 0.6
          : reportingCadence === "Annual"
            ? 0.4
            : 0.2;
  const verificationScore = verification === "ThirdParty" ? 1 : verification === "Internal" ? 0.6 : 0.2;
  return Math.round(20 * (cadenceScore * 0.6 + verificationScore * 0.4));
}

function scoreTraceability(traceability: GreenAssessmentInputs["traceability"]) {
  return traceability === "Strong" ? 15 : traceability === "Moderate" ? 9 : 4;
}

function scoreExclusions(exclusions: string[]) {
  const redFlags = exclusions.filter((item) => redFlagExclusions.has(item));
  if (redFlags.length > 0) {
    return { score: 0, redFlags };
  }
  return { score: exclusions.length ? 6 : 10, redFlags: [] };
}

export function evaluateGreenAssessment(inputs: GreenAssessmentInputs): {
  score: number;
  verdict: GreenAssessmentVerdict;
  breakdown: GreenAssessmentBreakdown;
} {
  const missingData: string[] = [];

  const eligibility = scoreEligibility(inputs.useOfProceeds);
  if (eligibility.missing) missingData.push(eligibility.missing);

  const kpi = scoreKpis(inputs.kpis);
  if (kpi.missing) missingData.push(kpi.missing);

  const verificationScore = scoreVerification(inputs.reportingCadence, inputs.verification);
  const traceabilityScore = scoreTraceability(inputs.traceability);
  const exclusionsScore = scoreExclusions(inputs.exclusions);

  const score = eligibility.score + kpi.score + verificationScore + traceabilityScore + exclusionsScore.score;

  let verdict: GreenAssessmentVerdict = "NotGreen";
  if (exclusionsScore.redFlags.length > 0) {
    verdict = "NotGreen";
  } else if (score >= 70) {
    verdict = "Green";
  } else if (score >= 50) {
    verdict = "Transitional";
  }

  return {
    score,
    verdict,
    breakdown: {
      components: {
        eligibility: eligibility.score,
        kpiAmbition: kpi.score,
        verificationReporting: verificationScore,
        traceability: traceabilityScore,
        exclusions: exclusionsScore.score
      },
      missingData,
      redFlags: exclusionsScore.redFlags
    }
  };
}

export function saveGreenAssessment(params: {
  repo: GreenAssessmentRepo;
  loanId: string;
  inputs: GreenAssessmentInputs;
  createdBy: string;
}): GreenAssessment {
  const latest = params.repo.getLatest(params.loanId);
  const versionNo = latest ? latest.versionNo + 1 : 1;
  const evaluation = evaluateGreenAssessment(params.inputs);

  return params.repo.create({
    loanId: params.loanId,
    versionNo,
    inputsJson: JSON.stringify(params.inputs),
    breakdownJson: JSON.stringify(evaluation.breakdown),
    score: evaluation.score,
    verdict: evaluation.verdict,
    redFlagsJson: JSON.stringify(evaluation.breakdown.redFlags),
    createdBy: params.createdBy
  });
}
