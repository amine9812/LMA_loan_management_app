import { z } from "zod";

export const roleSchema = z.enum([
  "Admin",
  "LenderOps",
  "BorrowerReporter",
  "Auditor"
]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const loanCreateSchema = z.object({
  name: z.string().min(2),
  borrowerName: z.string().min(2),
  lenderName: z.string().min(2),
  currency: z.string().min(3).max(3),
  startDate: z.string().min(4),
  status: z.enum(["Active", "Paused", "Closed"]).default("Active")
});

export const dueRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("after_period_end"),
    daysAfter: z.number(),
    period: z.enum(["Month", "Quarter", "Year"])
  }),
  z.object({
    type: z.literal("fixed_date"),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    note: z.string().optional()
  }),
  z.object({
    type: z.literal("custom"),
    description: z.string().min(1)
  })
]);

export const obligationCreateSchema = z.object({
  loanId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(2),
  frequency: z.enum(["Once", "Monthly", "Quarterly", "Annually", "Adhoc"]),
  dueRule: dueRuleSchema,
  ownerParty: z.enum(["Borrower", "Lender"]),
  severity: z.enum(["Low", "Med", "High"]),
  status: z.enum(["Active", "Paused", "Closed"]).default("Active"),
  sourceClauseId: z.string().nullable().optional()
});

export const covenantCreateSchema = z.object({
  loanId: z.string().min(1),
  name: z.string().min(2),
  covenantType: z.enum(["Ratio", "Threshold", "Info"]),
  formulaId: z.string().min(1),
  thresholdOp: z.enum(["<=", ">=", "<", ">", "="]),
  thresholdValue: z.number(),
  frequency: z.enum(["Once", "Monthly", "Quarterly", "Annually", "Adhoc"]),
  status: z.enum(["Active", "Paused", "Closed"]).default("Active"),
  sourceClauseId: z.string().nullable().optional()
});

export const submissionCreateSchema = z.object({
  loanId: z.string().min(1),
  submitterUserId: z.string().min(1),
  type: z.enum(["ObligationEvidence", "Financials", "ESG"]),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  status: z.enum(["Draft", "Submitted", "UnderReview", "Approved", "Rejected"]),
  items: z.array(
    z.object({
      obligationInstanceId: z.string().nullable().optional(),
      key: z.string().min(1),
      valueText: z.string().nullable().optional(),
      valueNumber: z.number().nullable().optional(),
      valueJson: z.string().nullable().optional(),
      notes: z.string().nullable().optional()
    })
  )
});

export const submissionSubmitSchema = z.object({
  submissionId: z.string().min(1)
});

export const waiverCreateSchema = z.object({
  loanId: z.string().min(1),
  relatedType: z.enum(["Covenant", "Obligation"]),
  relatedId: z.string().min(1),
  reason: z.string().min(5),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  proposedRemedyDate: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional()
});

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: roleSchema,
  password: z.string().min(8)
});

export const clauseCreateSchema = z.object({
  documentId: z.string().min(1),
  clauseType: z.enum(["Obligation", "Covenant", "Definition", "Other"]),
  title: z.string().min(2),
  textSnippet: z.string().min(5),
  pageNumber: z.number().int().min(1),
  tags: z.array(z.string()).default([])
});

export const definitionUpsertSchema = z.object({
  id: z.string().optional(),
  loanId: z.string().min(1),
  term: z.string().min(1),
  definitionText: z.string().min(3),
  sourceClauseId: z.string().nullable().optional()
});

export const termSheetDataSchema = z.object({
  facilityType: z.string().min(2),
  commitmentAmount: z.number().nonnegative(),
  marginBps: z.number().nonnegative(),
  maturityDate: z.string().min(4),
  leverageThreshold: z.number().positive(),
  interestCoverageThreshold: z.number().positive(),
  reportingDaysAfterPeriodEnd: z.number().int().nonnegative(),
  ebitdaAdjustments: z.array(z.string()).default([])
});

export const termSheetCreateSchema = z.object({
  loanId: z.string().min(1),
  data: termSheetDataSchema
});

export const templateCreateSchema = z.object({
  key: z.string().min(2),
  category: z.string().min(2),
  title: z.string().min(2),
  bodyText: z.string().min(10),
  placeholders: z.array(z.string()).default([])
});

export const templateUpdateSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  title: z.string().min(2).optional(),
  bodyText: z.string().min(10).optional(),
  placeholders: z.array(z.string()).optional()
});

export const extractionRunSchema = z
  .object({
    documentId: z.string().optional(),
    documentVersionId: z.string().optional(),
    adapterKey: z.string().min(1)
  })
  .refine((data) => data.documentId || data.documentVersionId, {
    message: "documentId or documentVersionId required"
  });

export const suggestionConfirmSchema = z.object({
  suggestionId: z.string().min(1),
  edits: z.record(z.any()).optional()
});

export const draftGenerationSchema = z.object({
  loanId: z.string().min(1),
  termSheetVersionId: z.string().min(1),
  templateKeys: z.array(z.string().min(1)).min(1)
});

export const semanticDiffSchema = z.object({
  loanId: z.string().min(1),
  documentVersionAId: z.string().min(1),
  documentVersionBId: z.string().min(1)
});

export const consistencyRunSchema = z.object({
  loanId: z.string().min(1),
  documentVersionId: z.string().optional()
});

export const consistencyResolveSchema = z.object({
  findingId: z.string().min(1)
});

export const interoperabilityExportSchema = z.object({
  loanId: z.string().min(1),
  includeAuditEvents: z.boolean().default(false),
  includeDocumentsMetadataOnly: z.boolean().default(true)
});

export const greenAssessmentInputSchema = z.object({
  useOfProceeds: z.array(z.string()).default([]),
  kpis: z
    .object({
      emissionsReductionPct: z.number().min(0).max(100).optional(),
      renewableSharePct: z.number().min(0).max(100).optional(),
      energyEfficiencyPct: z.number().min(0).max(100).optional(),
      cleanTransportPct: z.number().min(0).max(100).optional()
    })
    .default({}),
  reportingCadence: z.enum(["Monthly", "Quarterly", "Semiannual", "Annual", "Adhoc"]).default("Annual"),
  verification: z.enum(["None", "Internal", "ThirdParty"]).default("None"),
  traceability: z.enum(["Weak", "Moderate", "Strong"]).default("Moderate"),
  exclusions: z.array(z.string()).default([]),
  notes: z.string().optional()
});

export const greenAssessmentSaveSchema = z.object({
  loanId: z.string().min(1),
  inputs: greenAssessmentInputSchema
});

export const greenEvidenceTagSchema = z.object({
  loanId: z.string().min(1),
  documentId: z.string().min(1),
  category: z.string().min(2),
  snippet: z.string().min(5),
  pageNumber: z.number().int().min(1).nullable().optional()
});

export const waiverDecisionSchema = z.object({
  waiverId: z.string().min(1),
  status: z.enum(["Approved", "Rejected"]),
  decisionNote: z.string().min(3).optional(),
  conditions: z.string().optional(),
  expiryDate: z.string().nullable().optional()
});
