import { z } from "zod";
import { dueRuleSchema } from "./schemas";

const loanSchema = z.object({
  id: z.string(),
  name: z.string(),
  borrowerName: z.string(),
  lenderName: z.string(),
  currency: z.string(),
  startDate: z.string(),
  status: z.string()
});

const partySchema = z.object({
  id: z.string(),
  partyType: z.string(),
  name: z.string(),
  contactEmail: z.string().nullable().optional()
});

const documentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  sha256: z.string(),
  uploadedAt: z.string()
});

const clauseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  snippet: z.string(),
  page: z.number().int(),
  tags: z.array(z.string()),
  sourceDocumentId: z.string()
});

const obligationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  frequency: z.string(),
  dueRule: dueRuleSchema,
  ownerParty: z.string(),
  severity: z.string(),
  status: z.string(),
  sourceClauseId: z.string().nullable(),
  createdAt: z.string()
});

const obligationInstanceSchema = z.object({
  id: z.string(),
  obligationId: z.string(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  dueDate: z.string(),
  status: z.string()
});

const formulaSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  expression: z.record(z.any()),
  description: z.string()
});

const covenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  covenantType: z.string(),
  formulaId: z.string(),
  thresholdOp: z.string(),
  thresholdValue: z.number(),
  frequency: z.string(),
  status: z.string(),
  sourceClauseId: z.string().nullable()
});

const covenantResultSchema = z.object({
  id: z.string(),
  covenantId: z.string(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  computedValue: z.number(),
  thresholdValue: z.number(),
  passFail: z.string(),
  computedAt: z.string(),
  computedBy: z.string(),
  notes: z.string().nullable().optional()
});

const waiverSchema = z.object({
  id: z.string(),
  relatedType: z.string(),
  relatedId: z.string(),
  reason: z.string(),
  requestedBy: z.string(),
  status: z.string(),
  decidedBy: z.string().nullable().optional(),
  decidedAt: z.string().nullable().optional()
});

const auditEventSchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  beforeJson: z.string().nullable().optional(),
  afterJson: z.string().nullable().optional(),
  createdAt: z.string()
});

export const loanObligationSchemaV01 = z.object({
  meta: z.object({
    schemaVersion: z.literal("0.1"),
    exportedAt: z.string(),
    appVersion: z.string()
  }),
  loan: loanSchema,
  parties: z.array(partySchema),
  documents: z.array(documentSchema),
  clauses: z.array(clauseSchema),
  obligations: z.array(obligationSchema),
  obligationInstances: z.array(obligationInstanceSchema),
  formulas: z.array(formulaSchema),
  covenants: z.array(covenantSchema),
  covenantResults: z.array(covenantResultSchema),
  waivers: z.array(waiverSchema),
  auditEvents: z.array(auditEventSchema).optional()
});

export type LoanObligationSchemaV01 = z.infer<typeof loanObligationSchemaV01>;
