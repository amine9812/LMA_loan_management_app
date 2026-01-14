export type Role = "Admin" | "LenderOps" | "BorrowerReporter" | "Auditor";

export type LoanStatus = "Active" | "Paused" | "Closed";
export type ClauseType = "Obligation" | "Covenant" | "Definition" | "Other";
export type ObligationFrequency = "Once" | "Monthly" | "Quarterly" | "Annually" | "Adhoc";
export type ObligationSeverity = "Low" | "Med" | "High";
export type ObligationStatus = "Active" | "Paused" | "Closed";
export type ObligationInstanceStatus =
  | "Pending"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Overdue";

export type SubmissionType = "ObligationEvidence" | "Financials" | "ESG";
export type SubmissionStatus =
  | "Draft"
  | "Submitted"
  | "UnderReview"
  | "Approved"
  | "Rejected";

export type CovenantType = "Ratio" | "Threshold" | "Info";
export type ThresholdOperator = "<=" | ">=" | "<" | ">" | "=";

export type WaiverStatus = "Requested" | "Approved" | "Rejected";

export type DueRule =
  | {
      type: "after_period_end";
      daysAfter: number;
      period: "Month" | "Quarter" | "Year";
    }
  | {
      type: "fixed_date";
      month: number;
      day: number;
      note?: string;
    }
  | {
      type: "custom";
      description: string;
    };

export type FormulaExpression =
  | { type: "var"; key: string }
  | { type: "number"; value: number }
  | {
      type: "op";
      op: "/" | "*" | "+" | "-";
      left: FormulaExpression;
      right: FormulaExpression;
    };

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type Loan = {
  id: string;
  name: string;
  borrowerName: string;
  lenderName: string;
  currency: string;
  startDate: string;
  status: LoanStatus;
  createdAt: string;
};

export type LoanParty = {
  id: string;
  loanId: string;
  partyType: "Borrower" | "Lender" | "Agent";
  name: string;
  contactEmail: string | null;
};

export type Document = {
  id: string;
  loanId: string;
  filename: string;
  filePath: string;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type Clause = {
  id: string;
  documentId: string;
  clauseType: ClauseType;
  title: string;
  textSnippet: string;
  pageNumber: number;
  tagsJson: string;
  createdBy: string;
  createdAt: string;
};

export type Obligation = {
  id: string;
  loanId: string;
  title: string;
  description: string;
  frequency: ObligationFrequency;
  dueRuleJson: string;
  ownerParty: "Borrower" | "Lender";
  severity: ObligationSeverity;
  status: ObligationStatus;
  sourceClauseId: string | null;
  createdAt: string;
};

export type ObligationInstance = {
  id: string;
  obligationId: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string;
  status: ObligationInstanceStatus;
  lastReminderAt: string | null;
};

export type Submission = {
  id: string;
  loanId: string;
  submitterUserId: string;
  type: SubmissionType;
  periodStart: string | null;
  periodEnd: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  reviewNotes?: string | null;
};

export type SubmissionItem = {
  id: string;
  submissionId: string;
  obligationInstanceId: string | null;
  key: string;
  valueText: string | null;
  valueNumber: number | null;
  valueJson: string | null;
  notes: string | null;
};

export type SubmissionDetail = {
  submission: Submission;
  items: SubmissionItem[];
  attachments: Attachment[];
  covenantResults: CovenantResult[];
};

export type Attachment = {
  id: string;
  submissionId: string;
  filename: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type Covenant = {
  id: string;
  loanId: string;
  name: string;
  covenantType: CovenantType;
  formulaId: string;
  thresholdOp: ThresholdOperator;
  thresholdValue: number;
  frequency: ObligationFrequency;
  sourceClauseId: string | null;
  status: "Active" | "Paused" | "Closed";
};

export type Formula = {
  id: string;
  key: string;
  name: string;
  expressionJson: string;
  description: string;
};

export type CovenantResult = {
  id: string;
  covenantId: string;
  periodStart: string | null;
  periodEnd: string | null;
  computedValue: number;
  thresholdValue: number;
  passFail: "Pass" | "Fail";
  computedAt: string;
  computedBy: string;
  notes: string | null;
};

export type Waiver = {
  id: string;
  loanId: string;
  relatedType: "Covenant" | "Obligation";
  relatedId: string;
  reason: string;
  requestedBy: string;
  status: WaiverStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  proposedRemedyDate?: string | null;
  decisionNote?: string | null;
  conditions?: string | null;
  expiryDate?: string | null;
};

export type Comment = {
  id: string;
  entityType: string;
  entityId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

export type AlertCounts = {
  dueSoon: number;
  overdue: number;
  waitingReview: number;
  breaches: number;
  pendingWaivers: number;
};

export type DashboardLoanSummary = Loan & {
  alertCounts: AlertCounts;
  nextDueDate: string | null;
};

export type DashboardSummary = {
  loans: DashboardLoanSummary[];
  totals: AlertCounts;
  recentActivity: AuditEvent[];
};

export type CovenantInputSet = {
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, number>;
};

export type CovenantComputation = {
  covenantId: string;
  periodStart: string;
  periodEnd: string;
  computedValue: number;
  passFail: "Pass" | "Fail";
  thresholdValue: number;
};

export type LoanCompliancePack = {
  loan: Loan;
  upcomingObligations: ObligationInstance[];
  overdueObligations: ObligationInstance[];
  latestCovenantResults: CovenantResult[];
  waivers: Waiver[];
};

export type IntegrationStatus = {
  id: string;
  name: string;
  status: "Mock" | "Connected" | "Error";
  lastSyncAt: string | null;
};

export type ExportHistory = {
  id: string;
  loanId: string;
  exportType: "CSV" | "PDF" | "JSON";
  filePath: string;
  createdBy: string;
  createdAt: string;
};

export type GreenAssessmentVerdict = "Green" | "Transitional" | "NotGreen";

export type GreenAssessment = {
  id: string;
  loanId: string;
  versionNo: number;
  inputsJson: string;
  breakdownJson: string;
  score: number;
  verdict: GreenAssessmentVerdict;
  redFlagsJson: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GreenEvidenceTag = {
  id: string;
  loanId: string;
  documentId: string;
  category: string;
  snippet: string;
  pageNumber: number | null;
  createdBy: string;
  createdAt: string;
};

export type SessionInfo = {
  sessionId: string;
  user: User;
};

export type PrototypeRoute =
  | "prototype"
  | "prototype/loan"
  | "prototype/obligations"
  | "prototype/covenants"
  | "prototype/workbench"
  | "prototype/term-sheet"
  | "prototype/drafts"
  | "prototype/consistency"
  | "prototype/submission"
  | "prototype/review"
  | "prototype/waiver"
  | "prototype/export";

export type Definition = {
  id: string;
  loanId: string;
  term: string;
  definitionText: string;
  sourceClauseId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentGroupType = "Agreement" | "Other";

export type DocumentGroup = {
  id: string;
  loanId: string;
  type: DocumentGroupType;
  name: string;
  createdAt: string;
};

export type DocumentSource = "Upload" | "Generated";

export type DocumentVersion = {
  id: string;
  documentGroupId: string;
  versionNo: number;
  filename: string;
  filePath: string;
  sha256: string;
  createdBy: string;
  createdAt: string;
  source: DocumentSource;
  termSheetVersionId: string | null;
};

export type ExtractionRunStatus = "Pending" | "Completed" | "Failed";

export type ExtractionRun = {
  id: string;
  documentId: string | null;
  documentVersionId: string | null;
  adapterKey: string;
  status: ExtractionRunStatus;
  startedAt: string;
  finishedAt: string | null;
  summaryJson: string | null;
};

export type SuggestionStatus = "Proposed" | "Confirmed" | "Rejected";
export type SuggestionType = "Clause" | "Obligation" | "Covenant" | "Definition";

export type ClauseSuggestionPayload = {
  clauseType: ClauseType;
  title: string;
  textSnippet: string;
  pageNumber: number | null;
  tags: string[];
};

export type ObligationSuggestionPayload = {
  title: string;
  description: string;
  frequency: ObligationFrequency;
  dueRule: DueRule;
  ownerParty: "Borrower" | "Lender";
  severity: ObligationSeverity;
  sourceSnippet?: string;
  pageNumber?: number | null;
};

export type CovenantSuggestionPayload = {
  name: string;
  covenantType: CovenantType;
  formulaKey: string;
  thresholdOp: ThresholdOperator;
  thresholdValue: number;
  frequency: ObligationFrequency;
  sourceSnippet?: string;
  pageNumber?: number | null;
};

export type DefinitionSuggestionPayload = {
  term: string;
  definitionText: string;
  sourceSnippet?: string;
  pageNumber?: number | null;
};

export type ExtractedSuggestion = {
  id: string;
  extractionRunId: string;
  suggestionType: SuggestionType;
  payloadJson: string;
  confidence: number;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
};

export type TermSheetData = {
  facilityType: string;
  commitmentAmount: number;
  marginBps: number;
  maturityDate: string;
  leverageThreshold: number;
  interestCoverageThreshold: number;
  reportingDaysAfterPeriodEnd: number;
  ebitdaAdjustments: string[];
};

export type TermSheetVersion = {
  id: string;
  loanId: string;
  versionNo: number;
  dataJson: string;
  createdBy: string;
  createdAt: string;
};

export type ClauseTemplate = {
  id: string;
  key: string;
  category: string;
  title: string;
  bodyText: string;
  placeholdersJson: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ConsistencyFindingStatus = "Open" | "Resolved";
export type ConsistencyFindingSeverity = "Low" | "Med" | "High";

export type ConsistencyFinding = {
  id: string;
  loanId: string;
  documentVersionId: string | null;
  ruleKey: string;
  severity: ConsistencyFindingSeverity;
  message: string;
  affectedEntityType: string;
  affectedEntityId: string;
  status: ConsistencyFindingStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type SemanticDiffItem = {
  key: string;
  message: string;
  entityType: "Obligation" | "Covenant" | "Definition" | "TermSheet";
  entityId?: string;
  severity?: ConsistencyFindingSeverity;
};
