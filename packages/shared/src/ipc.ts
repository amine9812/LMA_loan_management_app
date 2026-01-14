import type {
  AlertCounts,
  AuditEvent,
  Attachment,
  Clause,
  ClauseTemplate,
  ConsistencyFinding,
  Covenant,
  CovenantResult,
  Definition,
  Document,
  DocumentVersion,
  ExportHistory,
  IntegrationStatus,
  ExtractedSuggestion,
  ExtractionRun,
  GreenAssessment,
  GreenEvidenceTag,
  Loan,
  Obligation,
  ObligationInstance,
  SemanticDiffItem,
  Submission,
  SubmissionDetail,
  TermSheetVersion,
  User,
  Waiver
} from "./types";
import type { LoanObligationSchemaV01 } from "./interoperability";
import type {
  clauseCreateSchema,
  covenantCreateSchema,
  definitionUpsertSchema,
  draftGenerationSchema,
  extractionRunSchema,
  greenAssessmentSaveSchema,
  greenEvidenceTagSchema,
  interoperabilityExportSchema,
  loanCreateSchema,
  obligationCreateSchema,
  semanticDiffSchema,
  suggestionConfirmSchema,
  submissionSubmitSchema,
  waiverDecisionSchema,
  templateCreateSchema,
  templateUpdateSchema,
  termSheetCreateSchema,
  consistencyRunSchema,
  consistencyResolveSchema,
  submissionCreateSchema,
  userCreateSchema,
  waiverCreateSchema
} from "./schemas";
import type { z } from "zod";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; details?: unknown };

export type LoanCreateInput = z.infer<typeof loanCreateSchema>;
export type ObligationCreateInput = z.infer<typeof obligationCreateSchema>;
export type CovenantCreateInput = z.infer<typeof covenantCreateSchema>;
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
export type SubmissionSubmitInput = z.infer<typeof submissionSubmitSchema>;
export type WaiverCreateInput = z.infer<typeof waiverCreateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type ClauseCreateInput = z.infer<typeof clauseCreateSchema>;
export type DefinitionUpsertInput = z.infer<typeof definitionUpsertSchema>;
export type TermSheetCreateInput = z.infer<typeof termSheetCreateSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type ExtractionRunInput = z.infer<typeof extractionRunSchema>;
export type SuggestionConfirmInput = z.infer<typeof suggestionConfirmSchema>;
export type DraftGenerationInput = z.infer<typeof draftGenerationSchema>;
export type SemanticDiffInput = z.infer<typeof semanticDiffSchema>;
export type ConsistencyRunInput = z.infer<typeof consistencyRunSchema>;
export type ConsistencyResolveInput = z.infer<typeof consistencyResolveSchema>;
export type InteroperabilityExportInput = z.infer<typeof interoperabilityExportSchema>;
export type GreenAssessmentSaveInput = z.infer<typeof greenAssessmentSaveSchema>;
export type GreenEvidenceTagInput = z.infer<typeof greenEvidenceTagSchema>;
export type WaiverDecisionInput = z.infer<typeof waiverDecisionSchema>;

export type IpcRequestMap = {
  "auth:login": { email: string; password: string };
  "auth:logout": { sessionId: string };
  "auth:me": { sessionId: string };

  "demo:seed": { sessionId: string };

  "users:list": { sessionId: string };
  "users:create": { sessionId: string; input: UserCreateInput };
  "users:updateRole": { sessionId: string; userId: string; role: User["role"] };
  "users:resetPassword": { sessionId: string; userId: string; newPassword: string };

  "loans:list": { sessionId: string };
  "loans:create": { sessionId: string; input: LoanCreateInput };
  "loans:get": { sessionId: string; loanId: string };
  "loans:update": { sessionId: string; loanId: string; input: Partial<LoanCreateInput> };

  "obligations:list": { sessionId: string; loanId: string };
  "obligations:create": { sessionId: string; input: ObligationCreateInput };
  "obligations:update": {
    sessionId: string;
    obligationId: string;
    input: Partial<ObligationCreateInput>;
  };
  "obligations:generateSchedule": {
    sessionId: string;
    loanId: string;
    monthsAhead: number;
  };

  "obligationInstances:list": { sessionId: string; loanId: string };
  "obligationInstances:update": {
    sessionId: string;
    instanceId: string;
    status?: ObligationInstance["status"];
    dueDate?: string;
  };

  "covenants:list": { sessionId: string; loanId: string };
  "covenants:create": { sessionId: string; input: CovenantCreateInput };
  "covenants:results": { sessionId: string; loanId: string };
  "formulas:list": { sessionId: string };

  "submissions:list": { sessionId: string; loanId: string };
  "submissions:create": { sessionId: string; input: SubmissionCreateInput };
  "submissions:detail": { sessionId: string; submissionId: string };
  "submissions:submit": { sessionId: string; input: SubmissionSubmitInput };
  "submissions:review": {
    sessionId: string;
    submissionId: string;
    status: Submission["status"];
    notes?: string;
  };

  "documents:list": { sessionId: string; loanId: string };
  "documents:import": { sessionId: string; loanId: string };
  "documents:dataUrl": { sessionId: string; documentId: string };
  "documentVersions:list": { sessionId: string; loanId: string };
  "documentVersions:dataUrl": { sessionId: string; documentVersionId: string };

  "clauses:list": { sessionId: string; documentId: string };
  "clauses:create": { sessionId: string; input: ClauseCreateInput };

  "extraction:run": { sessionId: string; input: ExtractionRunInput };
  "extraction:runs": { sessionId: string; documentId?: string; documentVersionId?: string };
  "extraction:suggestions": { sessionId: string; runId: string };
  "extraction:confirm": { sessionId: string; input: SuggestionConfirmInput };
  "extraction:reject": { sessionId: string; suggestionId: string };

  "definitions:list": { sessionId: string; loanId: string };
  "definitions:upsert": { sessionId: string; input: DefinitionUpsertInput };
  "definitions:delete": { sessionId: string; definitionId: string };

  "termSheets:list": { sessionId: string; loanId: string };
  "termSheets:get": { sessionId: string; termSheetVersionId: string };
  "termSheets:create": { sessionId: string; input: TermSheetCreateInput };

  "templates:list": { sessionId: string };
  "templates:get": { sessionId: string; templateId: string };
  "templates:create": { sessionId: string; input: TemplateCreateInput };
  "templates:update": { sessionId: string; input: TemplateUpdateInput };
  "templates:delete": { sessionId: string; templateId: string };

  "drafts:generate": { sessionId: string; input: DraftGenerationInput };
  "diffs:semantic": { sessionId: string; input: SemanticDiffInput };

  "consistency:run": { sessionId: string; input: ConsistencyRunInput };
  "consistency:list": { sessionId: string; loanId: string };
  "consistency:resolve": { sessionId: string; input: ConsistencyResolveInput };

  "attachments:add": { sessionId: string; submissionId: string };
  "attachments:list": { sessionId: string; submissionId: string };
  "attachments:dataUrl": { sessionId: string; attachmentId: string };
  "waivers:attachments:add": { sessionId: string; waiverId: string };
  "waivers:attachments:list": { sessionId: string; waiverId: string };
  "waivers:attachments:dataUrl": { sessionId: string; attachmentId: string };

  "waivers:list": { sessionId: string; loanId: string };
  "waivers:request": { sessionId: string; input: WaiverCreateInput };
  "waivers:decide": { sessionId: string; input: WaiverDecisionInput };

  "audit:list": { sessionId: string; loanId: string };
  "alerts:dashboard": { sessionId: string };

  "exports:csv": { sessionId: string; loanId: string };
  "exports:pdf": { sessionId: string; loanId: string };
  "exports:history": { sessionId: string; loanId?: string };
  "exports:openFolder": { sessionId: string; path: string };
  "interop:export": { sessionId: string; input: InteroperabilityExportInput };
  "interop:previewImport": { sessionId: string };
  "interop:import": { sessionId: string; schema: LoanObligationSchemaV01 };

  "integrations:status": { sessionId: string };

  "green:list": { sessionId: string; loanId: string };
  "green:latest": { sessionId: string; loanId: string };
  "green:save": { sessionId: string; input: GreenAssessmentSaveInput };
  "green:evidence:list": { sessionId: string; loanId: string };
  "green:evidence:add": { sessionId: string; input: GreenEvidenceTagInput };
};

export type IpcResponseMap = {
  "auth:login": ApiResult<{ sessionId: string; user: User }>;
  "auth:logout": ApiResult<{ ok: true }>;
  "auth:me": ApiResult<{ user: User } | null>;

  "demo:seed": ApiResult<{ status: "seeded" | "already" }>;

  "users:list": ApiResult<User[]>;
  "users:create": ApiResult<User>;
  "users:updateRole": ApiResult<User>;
  "users:resetPassword": ApiResult<{ ok: true }>;

  "loans:list": ApiResult<Loan[]>;
  "loans:create": ApiResult<Loan>;
  "loans:get": ApiResult<Loan | null>;
  "loans:update": ApiResult<Loan>;

  "obligations:list": ApiResult<Obligation[]>;
  "obligations:create": ApiResult<Obligation>;
  "obligations:update": ApiResult<Obligation>;
  "obligations:generateSchedule": ApiResult<{ created: number }>;

  "obligationInstances:list": ApiResult<ObligationInstance[]>;
  "obligationInstances:update": ApiResult<ObligationInstance>;

  "covenants:list": ApiResult<Covenant[]>;
  "covenants:create": ApiResult<Covenant>;
  "covenants:results": ApiResult<CovenantResult[]>;
  "formulas:list": ApiResult<
    { id: string; key: string; name: string; description: string }[]
  >;

  "submissions:list": ApiResult<Submission[]>;
  "submissions:create": ApiResult<Submission>;
  "submissions:detail": ApiResult<SubmissionDetail>;
  "submissions:submit": ApiResult<Submission>;
  "submissions:review": ApiResult<Submission>;

  "documents:list": ApiResult<Document[]>;
  "documents:import": ApiResult<Document>;
  "documents:dataUrl": ApiResult<{ dataUrl: string }>;
  "documentVersions:list": ApiResult<DocumentVersion[]>;
  "documentVersions:dataUrl": ApiResult<{ dataUrl: string }>;

  "clauses:list": ApiResult<Clause[]>;
  "clauses:create": ApiResult<Clause>;

  "extraction:run": ApiResult<ExtractionRun>;
  "extraction:runs": ApiResult<ExtractionRun[]>;
  "extraction:suggestions": ApiResult<ExtractedSuggestion[]>;
  "extraction:confirm": ApiResult<ExtractedSuggestion>;
  "extraction:reject": ApiResult<ExtractedSuggestion>;

  "definitions:list": ApiResult<Definition[]>;
  "definitions:upsert": ApiResult<Definition>;
  "definitions:delete": ApiResult<{ ok: true }>;

  "termSheets:list": ApiResult<TermSheetVersion[]>;
  "termSheets:get": ApiResult<TermSheetVersion>;
  "termSheets:create": ApiResult<TermSheetVersion>;

  "templates:list": ApiResult<ClauseTemplate[]>;
  "templates:get": ApiResult<ClauseTemplate>;
  "templates:create": ApiResult<ClauseTemplate>;
  "templates:update": ApiResult<ClauseTemplate>;
  "templates:delete": ApiResult<{ ok: true }>;

  "drafts:generate": ApiResult<DocumentVersion>;
  "diffs:semantic": ApiResult<SemanticDiffItem[]>;

  "consistency:run": ApiResult<ConsistencyFinding[]>;
  "consistency:list": ApiResult<ConsistencyFinding[]>;
  "consistency:resolve": ApiResult<ConsistencyFinding>;

  "attachments:add": ApiResult<{ ok: true }>;
  "attachments:list": ApiResult<Attachment[]>;
  "attachments:dataUrl": ApiResult<{ dataUrl: string; filename: string }>;
  "waivers:attachments:add": ApiResult<{ ok: true }>;
  "waivers:attachments:list": ApiResult<Attachment[]>;
  "waivers:attachments:dataUrl": ApiResult<{ dataUrl: string; filename: string }>;

  "waivers:list": ApiResult<Waiver[]>;
  "waivers:request": ApiResult<Waiver>;
  "waivers:decide": ApiResult<Waiver>;

  "audit:list": ApiResult<AuditEvent[]>;
  "alerts:dashboard": ApiResult<{
    totals: AlertCounts;
    loans: {
      loanId: string;
      loanName: string;
      dueSoon: number;
      overdue: number;
      waitingReview: number;
      breaches: number;
      pendingWaivers: number;
      nextDueDate: string | null;
    }[];
    recentActivity: AuditEvent[];
  }>;

  "exports:csv": ApiResult<{ path: string }>;
  "exports:pdf": ApiResult<{ path: string }>;
  "exports:history": ApiResult<ExportHistory[]>;
  "exports:openFolder": ApiResult<{ ok: true }>;
  "interop:export": ApiResult<{ path: string }>;
  "interop:previewImport": ApiResult<{
    summary: {
      loanName: string;
      parties: number;
      documents: number;
      clauses: number;
      obligations: number;
      covenants: number;
    };
    payload: LoanObligationSchemaV01;
  }>;
  "interop:import": ApiResult<{ loanId: string }>;

  "integrations:status": ApiResult<IntegrationStatus[]>;

  "green:list": ApiResult<GreenAssessment[]>;
  "green:latest": ApiResult<GreenAssessment | null>;
  "green:save": ApiResult<GreenAssessment>;
  "green:evidence:list": ApiResult<GreenEvidenceTag[]>;
  "green:evidence:add": ApiResult<GreenEvidenceTag>;
};

export type IpcChannel = keyof IpcRequestMap;
