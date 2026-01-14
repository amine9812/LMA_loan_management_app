import type {
  AlertCounts,
  ApiResult,
  Attachment,
  AuditEvent,
  Clause,
  ClauseTemplate,
  ConsistencyFinding,
  Covenant,
  CovenantResult,
  Definition,
  Document,
  DocumentGroup,
  DocumentVersion,
  ExportHistory,
  ExtractedSuggestion,
  ExtractionRun,
  Formula,
  GreenAssessment,
  GreenEvidenceTag,
  IntegrationStatus,
  IpcChannel,
  IpcRequestMap,
  IpcResponseMap,
  Loan,
  LoanObligationSchemaV01,
  LoanParty,
  Obligation,
  ObligationInstance,
  SemanticDiffItem,
  Submission,
  SubmissionDetail,
  SubmissionItem,
  TermSheetData,
  TermSheetVersion,
  User,
  Waiver
} from "@shared";

type MockCredential = {
  email: string;
  password: string;
  name: string;
  role: User["role"];
};

type MockData = {
  users: User[];
  loans: Loan[];
  loanParties: LoanParty[];
  obligations: Obligation[];
  obligationInstances: ObligationInstance[];
  covenants: Covenant[];
  covenantResults: CovenantResult[];
  formulas: Formula[];
  documents: Document[];
  documentGroups: DocumentGroup[];
  documentVersions: DocumentVersion[];
  clauses: Clause[];
  submissions: Submission[];
  submissionItems: SubmissionItem[];
  attachments: Attachment[];
  waiverAttachments: Attachment[];
  waivers: Waiver[];
  auditEvents: AuditEvent[];
  definitions: Definition[];
  termSheetVersions: TermSheetVersion[];
  clauseTemplates: ClauseTemplate[];
  extractionRuns: ExtractionRun[];
  extractedSuggestions: ExtractedSuggestion[];
  consistencyFindings: ConsistencyFinding[];
  exportHistory: ExportHistory[];
  greenAssessments: GreenAssessment[];
  greenEvidenceTags: GreenEvidenceTag[];
  integrations: IntegrationStatus[];
};

const STORAGE_KEY = "covenantpulse.session";
const MOCK_DATA_KEY = "covenantpulse.mock.data";
const MOCK_CREDENTIALS_KEY = "covenantpulse.mock.credentials";

const seedCredentials: MockCredential[] = [
  { email: "admin@example.com", password: "Admin123!", name: "Admin User", role: "Admin" },
  { email: "lender@example.com", password: "Lender123!", name: "Lender Ops", role: "LenderOps" },
  {
    email: "borrower@example.com",
    password: "Borrower123!",
    name: "Borrower Reporter",
    role: "BorrowerReporter"
  },
  { email: "auditor@example.com", password: "Auditor123!", name: "Audit Viewer", role: "Auditor" }
];

let mockSession: { sessionId: string; user: User } | null = null;
let mockDataCache: MockData | null = null;

const nowIso = () => new Date().toISOString();

function loadStoredSession(): { sessionId: string; user: User } | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as { sessionId: string; user: User };
  } catch {
    return null;
  }
}

function setMockSession(session: { sessionId: string; user: User } | null) {
  mockSession = session;
}

function getMockSession(): { sessionId: string; user: User } | null {
  if (mockSession) {
    return mockSession;
  }
  const stored = loadStoredSession();
  if (stored) {
    mockSession = stored;
  }
  return mockSession;
}

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildHtmlDocument(title: string, subtitle: string, lines: string[]) {
  const body = lines.map((line) => `<li>${line}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${title}</title></head><body><h1>${title}</h1><p>${subtitle}</p><ul>${body}</ul></body></html>`;
}

function encodeHtmlDataUrl(html: string) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function buildSeedData(): MockData {
  const year = new Date().getFullYear();
  const createdAt = nowIso();

  const adminId = "user-admin";
  const lenderId = "user-lender";
  const borrowerId = "user-borrower";
  const auditorId = "user-auditor";

  const loanAcmeId = "loan-acme";
  const loanGreenId = "loan-green";

  const users: User[] = [
    { id: adminId, name: "Admin User", email: "admin@example.com", role: "Admin", createdAt },
    { id: lenderId, name: "Lender Ops", email: "lender@example.com", role: "LenderOps", createdAt },
    {
      id: borrowerId,
      name: "Borrower Reporter",
      email: "borrower@example.com",
      role: "BorrowerReporter",
      createdAt
    },
    { id: auditorId, name: "Audit Viewer", email: "auditor@example.com", role: "Auditor", createdAt }
  ];

  const loans: Loan[] = [
    {
      id: loanAcmeId,
      name: "Acme Manufacturing Term Loan",
      borrowerName: "Acme Manufacturing",
      lenderName: "Atlas Capital",
      currency: "USD",
      startDate: `${year}-01-01`,
      status: "Active",
      createdAt
    },
    {
      id: loanGreenId,
      name: "GreenBuild Sustainability-Linked Revolver",
      borrowerName: "GreenBuild Holdings",
      lenderName: "Evergreen Bank",
      currency: "USD",
      startDate: `${year}-03-01`,
      status: "Active",
      createdAt
    }
  ];

  const loanParties: LoanParty[] = [
    {
      id: "party-acme-borrower",
      loanId: loanAcmeId,
      partyType: "Borrower",
      name: "Acme Manufacturing",
      contactEmail: "finance@acmemfg.com"
    },
    {
      id: "party-acme-lender",
      loanId: loanAcmeId,
      partyType: "Lender",
      name: "Atlas Capital",
      contactEmail: "ops@atlascapital.com"
    },
    {
      id: "party-green-borrower",
      loanId: loanGreenId,
      partyType: "Borrower",
      name: "GreenBuild Holdings",
      contactEmail: "finance@greenbuild.com"
    },
    {
      id: "party-green-lender",
      loanId: loanGreenId,
      partyType: "Lender",
      name: "Evergreen Bank",
      contactEmail: "ops@evergreenbank.com"
    }
  ];

  const formulas: Formula[] = [
    {
      id: "formula-leverage",
      key: "LEVERAGE_RATIO",
      name: "Leverage Ratio",
      expressionJson: JSON.stringify({
        type: "op",
        op: "/",
        left: { type: "var", key: "TotalDebt" },
        right: { type: "var", key: "EBITDA" }
      }),
      description: "Total Debt / EBITDA"
    },
    {
      id: "formula-interest",
      key: "INTEREST_COVERAGE",
      name: "Interest Coverage",
      expressionJson: JSON.stringify({
        type: "op",
        op: "/",
        left: { type: "var", key: "EBITDA" },
        right: { type: "var", key: "InterestExpense" }
      }),
      description: "EBITDA / Interest Expense"
    }
  ];

  const covenants: Covenant[] = [
    {
      id: "cov-acme-leverage",
      loanId: loanAcmeId,
      name: "Leverage Ratio",
      covenantType: "Ratio",
      formulaId: "formula-leverage",
      thresholdOp: "<=",
      thresholdValue: 4.0,
      frequency: "Quarterly",
      sourceClauseId: "clause-acme-leverage",
      status: "Active"
    },
    {
      id: "cov-acme-interest",
      loanId: loanAcmeId,
      name: "Interest Coverage",
      covenantType: "Ratio",
      formulaId: "formula-interest",
      thresholdOp: ">=",
      thresholdValue: 2.0,
      frequency: "Quarterly",
      sourceClauseId: "clause-acme-interest",
      status: "Active"
    },
    {
      id: "cov-green-leverage",
      loanId: loanGreenId,
      name: "Leverage Ratio",
      covenantType: "Ratio",
      formulaId: "formula-leverage",
      thresholdOp: "<=",
      thresholdValue: 3.5,
      frequency: "Quarterly",
      sourceClauseId: null,
      status: "Active"
    },
    {
      id: "cov-green-interest",
      loanId: loanGreenId,
      name: "Interest Coverage",
      covenantType: "Ratio",
      formulaId: "formula-interest",
      thresholdOp: ">=",
      thresholdValue: 2.25,
      frequency: "Quarterly",
      sourceClauseId: null,
      status: "Active"
    }
  ];

  const covenantResults: CovenantResult[] = [
    {
      id: "covres-acme-leverage-q1",
      covenantId: "cov-acme-leverage",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      computedValue: 4.3,
      thresholdValue: 4.0,
      passFail: "Fail",
      computedAt: createdAt,
      computedBy: borrowerId,
      notes: "Debt increased due to acquisition."
    },
    {
      id: "covres-acme-interest-q1",
      covenantId: "cov-acme-interest",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      computedValue: 2.4,
      thresholdValue: 2.0,
      passFail: "Pass",
      computedAt: createdAt,
      computedBy: borrowerId,
      notes: "Healthy coverage."
    }
  ];

  const obligations: Obligation[] = [
    {
      id: "obl-acme-financials",
      loanId: loanAcmeId,
      title: "Quarterly Financial Statements",
      description: "Deliver quarterly financial statements within 45 days of quarter end.",
      frequency: "Quarterly",
      dueRuleJson: JSON.stringify({ type: "after_period_end", daysAfter: 45, period: "Quarter" }),
      ownerParty: "Borrower",
      severity: "High",
      status: "Active",
      sourceClauseId: "clause-acme-financials",
      createdAt
    },
    {
      id: "obl-acme-compliance",
      loanId: loanAcmeId,
      title: "Compliance Certificate",
      description: "Quarterly compliance certificate signed by CFO.",
      frequency: "Quarterly",
      dueRuleJson: JSON.stringify({ type: "after_period_end", daysAfter: 60, period: "Quarter" }),
      ownerParty: "Borrower",
      severity: "Med",
      status: "Active",
      sourceClauseId: null,
      createdAt
    },
    {
      id: "obl-acme-insurance",
      loanId: loanAcmeId,
      title: "Insurance Certificate",
      description: "Annual proof of insurance coverage.",
      frequency: "Annually",
      dueRuleJson: JSON.stringify({ type: "fixed_date", month: 1, day: 31, note: "Annual renewal" }),
      ownerParty: "Borrower",
      severity: "Med",
      status: "Active",
      sourceClauseId: null,
      createdAt
    },
    {
      id: "obl-green-esg",
      loanId: loanGreenId,
      title: "ESG KPI Report",
      description: "Submit sustainability KPI report within 30 days of quarter end.",
      frequency: "Quarterly",
      dueRuleJson: JSON.stringify({ type: "after_period_end", daysAfter: 30, period: "Quarter" }),
      ownerParty: "Borrower",
      severity: "Med",
      status: "Active",
      sourceClauseId: null,
      createdAt
    },
    {
      id: "obl-green-audit",
      loanId: loanGreenId,
      title: "Annual Audited Statements",
      description: "Provide audited annual financials within 90 days of year end.",
      frequency: "Annually",
      dueRuleJson: JSON.stringify({ type: "after_period_end", daysAfter: 90, period: "Year" }),
      ownerParty: "Borrower",
      severity: "High",
      status: "Active",
      sourceClauseId: null,
      createdAt
    }
  ];

  const obligationInstances: ObligationInstance[] = [
    {
      id: "inst-acme-financials-q1",
      obligationId: "obl-acme-financials",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      dueDate: buildDate(year, 5, 15),
      status: "Submitted",
      lastReminderAt: null
    },
    {
      id: "inst-acme-financials-q2",
      obligationId: "obl-acme-financials",
      periodStart: `${year}-04-01`,
      periodEnd: `${year}-06-30`,
      dueDate: buildDate(year, 8, 14),
      status: "Pending",
      lastReminderAt: null
    },
    {
      id: "inst-acme-compliance-q1",
      obligationId: "obl-acme-compliance",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      dueDate: buildDate(year, 5, 30),
      status: "Overdue",
      lastReminderAt: buildDate(year, 5, 20)
    },
    {
      id: "inst-acme-insurance",
      obligationId: "obl-acme-insurance",
      periodStart: null,
      periodEnd: null,
      dueDate: buildDate(year, 1, 31),
      status: "Pending",
      lastReminderAt: null
    },
    {
      id: "inst-green-esg-q1",
      obligationId: "obl-green-esg",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      dueDate: buildDate(year, 4, 30),
      status: "Approved",
      lastReminderAt: null
    }
  ];

  const documents: Document[] = [
    {
      id: "doc-acme-agreement",
      loanId: loanAcmeId,
      filename: "Acme_Manufacturing_Term_Loan_Agreement.pdf",
      filePath: "mock://doc-acme-agreement",
      sha256: "mock-sha-acme",
      uploadedBy: adminId,
      uploadedAt: createdAt
    },
    {
      id: "doc-green-agreement",
      loanId: loanGreenId,
      filename: "GreenBuild_SLL_Revolver_Agreement.pdf",
      filePath: "mock://doc-green-agreement",
      sha256: "mock-sha-green",
      uploadedBy: adminId,
      uploadedAt: createdAt
    }
  ];

  const documentGroups: DocumentGroup[] = [
    {
      id: "docgroup-acme",
      loanId: loanAcmeId,
      type: "Agreement",
      name: "Acme Manufacturing Agreement",
      createdAt
    },
    {
      id: "docgroup-green",
      loanId: loanGreenId,
      type: "Agreement",
      name: "GreenBuild Revolver Agreement",
      createdAt
    }
  ];

  const termSheetAcmeV1: TermSheetData = {
    facilityType: "Term Loan",
    commitmentAmount: 25000000,
    marginBps: 275,
    maturityDate: `${year + 5}-12-31`,
    leverageThreshold: 4.0,
    interestCoverageThreshold: 2.0,
    reportingDaysAfterPeriodEnd: 45,
    ebitdaAdjustments: ["Non-cash charges", "Restructuring costs"]
  };

  const termSheetAcmeV2: TermSheetData = {
    ...termSheetAcmeV1,
    leverageThreshold: 3.5,
    reportingDaysAfterPeriodEnd: 60
  };

  const termSheetGreenV1: TermSheetData = {
    facilityType: "Revolving Credit Facility",
    commitmentAmount: 30000000,
    marginBps: 250,
    maturityDate: `${year + 4}-06-30`,
    leverageThreshold: 3.75,
    interestCoverageThreshold: 2.25,
    reportingDaysAfterPeriodEnd: 35,
    ebitdaAdjustments: ["ESG initiatives", "Green asset disposal"]
  };

  const termSheetGreenV2: TermSheetData = {
    ...termSheetGreenV1,
    leverageThreshold: 3.25,
    reportingDaysAfterPeriodEnd: 40
  };

  const termSheetVersions: TermSheetVersion[] = [
    {
      id: "ts-acme-v1",
      loanId: loanAcmeId,
      versionNo: 1,
      dataJson: JSON.stringify(termSheetAcmeV1),
      createdBy: adminId,
      createdAt
    },
    {
      id: "ts-acme-v2",
      loanId: loanAcmeId,
      versionNo: 2,
      dataJson: JSON.stringify(termSheetAcmeV2),
      createdBy: adminId,
      createdAt
    },
    {
      id: "ts-green-v1",
      loanId: loanGreenId,
      versionNo: 1,
      dataJson: JSON.stringify(termSheetGreenV1),
      createdBy: adminId,
      createdAt
    },
    {
      id: "ts-green-v2",
      loanId: loanGreenId,
      versionNo: 2,
      dataJson: JSON.stringify(termSheetGreenV2),
      createdBy: adminId,
      createdAt
    }
  ];

  const documentVersions: DocumentVersion[] = [
    {
      id: "docver-acme-v1",
      documentGroupId: "docgroup-acme",
      versionNo: 1,
      filename: "Acme_Draft_v1.html",
      filePath: "mock://docver-acme-v1",
      sha256: "mock-sha-acme-v1",
      createdBy: adminId,
      createdAt,
      source: "Upload",
      termSheetVersionId: "ts-acme-v1"
    },
    {
      id: "docver-acme-v2",
      documentGroupId: "docgroup-acme",
      versionNo: 2,
      filename: "Acme_Draft_v2.html",
      filePath: "mock://docver-acme-v2",
      sha256: "mock-sha-acme-v2",
      createdBy: adminId,
      createdAt,
      source: "Generated",
      termSheetVersionId: "ts-acme-v2"
    },
    {
      id: "docver-green-v1",
      documentGroupId: "docgroup-green",
      versionNo: 1,
      filename: "GreenBuild_Draft_v1.html",
      filePath: "mock://docver-green-v1",
      sha256: "mock-sha-green-v1",
      createdBy: adminId,
      createdAt,
      source: "Upload",
      termSheetVersionId: "ts-green-v1"
    }
  ];

  const clauses: Clause[] = [
    {
      id: "clause-acme-financials",
      documentId: "doc-acme-agreement",
      clauseType: "Obligation",
      title: "Quarterly Financial Statements",
      textSnippet: "Borrower shall deliver quarterly financial statements within 45 days after each quarter end.",
      pageNumber: 8,
      tagsJson: JSON.stringify(["financials", "reporting"]),
      createdBy: adminId,
      createdAt
    },
    {
      id: "clause-acme-leverage",
      documentId: "doc-acme-agreement",
      clauseType: "Covenant",
      title: "Leverage Ratio",
      textSnippet: "Leverage Ratio shall not exceed 4.0x as of any quarter end.",
      pageNumber: 22,
      tagsJson: JSON.stringify(["covenant", "ratio"]),
      createdBy: adminId,
      createdAt
    },
    {
      id: "clause-acme-interest",
      documentId: "doc-acme-agreement",
      clauseType: "Covenant",
      title: "Interest Coverage",
      textSnippet: "Interest Coverage Ratio shall be at least 2.0x.",
      pageNumber: 23,
      tagsJson: JSON.stringify(["covenant", "ratio"]),
      createdBy: adminId,
      createdAt
    }
  ];

  const definitions: Definition[] = [
    {
      id: "def-acme-ebitda",
      loanId: loanAcmeId,
      term: "EBITDA",
      definitionText: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
      sourceClauseId: "clause-acme-financials",
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "def-green-esg",
      loanId: loanGreenId,
      term: "ESG KPI",
      definitionText: "ESG KPI means the sustainability metrics outlined in Schedule A.",
      sourceClauseId: null,
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const clauseTemplates: ClauseTemplate[] = [
    {
      id: "template-ebitda",
      key: "def_ebitda",
      category: "Definitions",
      title: "EBITDA Definition",
      bodyText:
        "EBITDA means earnings before interest, taxes, depreciation, and amortization, as adjusted for {{EBITDAAdjustments}}.",
      placeholdersJson: JSON.stringify(["EBITDAAdjustments"]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "template-reporting",
      key: "reporting_quarterly",
      category: "Reporting",
      title: "Quarterly Financial Statements",
      bodyText:
        "Borrower shall deliver quarterly financial statements within {{DaysAfterPeriodEnd}} days after each fiscal quarter end.",
      placeholdersJson: JSON.stringify(["DaysAfterPeriodEnd"]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "template-leverage",
      key: "covenant_leverage",
      category: "Covenants",
      title: "Leverage Ratio Covenant",
      bodyText:
        "Borrower shall not permit the Leverage Ratio to exceed {{LeverageThreshold}}x as of any quarter end.",
      placeholdersJson: JSON.stringify(["LeverageThreshold"]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "template-esg",
      key: "esg_reporting",
      category: "Reporting",
      title: "ESG KPI Reporting",
      bodyText:
        "Borrower shall deliver ESG KPI reporting within {{DaysAfterPeriodEnd}} days after each quarter end.",
      placeholdersJson: JSON.stringify(["DaysAfterPeriodEnd"]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const extractionRuns: ExtractionRun[] = [
    {
      id: "extract-acme-run-1",
      documentId: "doc-acme-agreement",
      documentVersionId: null,
      adapterKey: "mock",
      status: "Completed",
      startedAt: createdAt,
      finishedAt: createdAt,
      summaryJson: JSON.stringify({ clauses: 1, obligations: 1, covenants: 1, definitions: 1 })
    }
  ];

  const extractedSuggestions: ExtractedSuggestion[] = [
    {
      id: "suggestion-acme-clause",
      extractionRunId: "extract-acme-run-1",
      suggestionType: "Clause",
      payloadJson: JSON.stringify({
        clauseType: "Obligation",
        title: "Quarterly Financial Statements",
        textSnippet: "Borrower shall deliver quarterly financial statements within 45 days of quarter end.",
        pageNumber: 3,
        tags: ["financials", "reporting"]
      }),
      confidence: 0.78,
      status: "Proposed",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "suggestion-acme-obligation",
      extractionRunId: "extract-acme-run-1",
      suggestionType: "Obligation",
      payloadJson: JSON.stringify({
        title: "Quarterly Financial Statements",
        description: "Deliver quarterly financials within 45 days of quarter end.",
        frequency: "Quarterly",
        dueRule: { type: "after_period_end", daysAfter: 45, period: "Quarter" },
        ownerParty: "Borrower",
        severity: "High",
        sourceSnippet: "deliver quarterly financial statements within 45 days",
        pageNumber: 3
      }),
      confidence: 0.74,
      status: "Proposed",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "suggestion-acme-covenant",
      extractionRunId: "extract-acme-run-1",
      suggestionType: "Covenant",
      payloadJson: JSON.stringify({
        name: "Leverage Ratio",
        covenantType: "Ratio",
        formulaKey: "LEVERAGE_RATIO",
        thresholdOp: "<=",
        thresholdValue: 3.5,
        frequency: "Quarterly",
        sourceSnippet: "Leverage Ratio shall not exceed 3.5x",
        pageNumber: 12
      }),
      confidence: 0.69,
      status: "Proposed",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "suggestion-acme-definition",
      extractionRunId: "extract-acme-run-1",
      suggestionType: "Definition",
      payloadJson: JSON.stringify({
        term: "EBITDA",
        definitionText: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
        sourceSnippet: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
        pageNumber: 5
      }),
      confidence: 0.66,
      status: "Proposed",
      createdAt,
      updatedAt: createdAt
    }
  ];

  const submissions: Submission[] = [
    {
      id: "sub-acme-q1",
      loanId: loanAcmeId,
      submitterUserId: borrowerId,
      type: "Financials",
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      status: "Submitted",
      submittedAt: createdAt,
      reviewNotes: null
    },
    {
      id: "sub-acme-evidence",
      loanId: loanAcmeId,
      submitterUserId: borrowerId,
      type: "ObligationEvidence",
      periodStart: null,
      periodEnd: null,
      status: "UnderReview",
      submittedAt: createdAt,
      reviewNotes: "Waiting for lender review."
    }
  ];

  const submissionItems: SubmissionItem[] = [
    {
      id: "item-acme-debt",
      submissionId: "sub-acme-q1",
      obligationInstanceId: null,
      key: "TotalDebt",
      valueText: null,
      valueNumber: 12500000,
      valueJson: null,
      notes: null
    },
    {
      id: "item-acme-ebitda",
      submissionId: "sub-acme-q1",
      obligationInstanceId: null,
      key: "EBITDA",
      valueText: null,
      valueNumber: 4200000,
      valueJson: null,
      notes: null
    },
    {
      id: "item-acme-interest",
      submissionId: "sub-acme-q1",
      obligationInstanceId: null,
      key: "InterestExpense",
      valueText: null,
      valueNumber: 1800000,
      valueJson: null,
      notes: null
    },
    {
      id: "item-acme-evidence",
      submissionId: "sub-acme-evidence",
      obligationInstanceId: "inst-acme-compliance-q1",
      key: "Evidence",
      valueText: "Signed compliance certificate attached",
      valueNumber: null,
      valueJson: null,
      notes: null
    }
  ];

  const attachments: Attachment[] = [
    {
      id: "attachment-acme-1",
      submissionId: "sub-acme-evidence",
      filename: "Compliance_Certificate_Q1.pdf",
      filePath: "mock://attachment-acme-1",
      mimeType: "application/pdf",
      sizeBytes: 204800,
      uploadedAt: createdAt
    }
  ];

  const waiverAttachments: Attachment[] = [
    {
      id: "waiver-attachment-1",
      submissionId: "waiver-acme-leverage",
      filename: "Acquisition_Overview.pdf",
      filePath: "mock://waiver-attachment-1",
      mimeType: "application/pdf",
      sizeBytes: 151200,
      uploadedAt: createdAt
    }
  ];

  const waivers: Waiver[] = [
    {
      id: "waiver-acme-leverage",
      loanId: loanAcmeId,
      relatedType: "Covenant",
      relatedId: "cov-acme-leverage",
      reason: "Temporary leverage increase due to acquisition.",
      requestedBy: borrowerId,
      status: "Requested",
      decidedBy: null,
      decidedAt: null,
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      proposedRemedyDate: `${year}-09-30`,
      decisionNote: null,
      conditions: "Quarterly updates required.",
      expiryDate: `${year}-12-31`
    },
    {
      id: "waiver-acme-compliance",
      loanId: loanAcmeId,
      relatedType: "Obligation",
      relatedId: "obl-acme-compliance",
      reason: "Delayed compliance certificate due to audit timing.",
      requestedBy: borrowerId,
      status: "Approved",
      decidedBy: lenderId,
      decidedAt: createdAt,
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-03-31`,
      proposedRemedyDate: `${year}-05-15`,
      decisionNote: "Approved with audit evidence by May 15.",
      conditions: "Provide audit evidence by May 15.",
      expiryDate: `${year}-06-01`
    }
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: "audit-loan-created",
      actorUserId: adminId,
      action: "create",
      entityType: "loan",
      entityId: loanAcmeId,
      beforeJson: null,
      afterJson: JSON.stringify({ name: "Acme Manufacturing Term Loan" }),
      createdAt
    },
    {
      id: "audit-obligation-created",
      actorUserId: adminId,
      action: "create",
      entityType: "obligation",
      entityId: "obl-acme-financials",
      beforeJson: null,
      afterJson: JSON.stringify({ title: "Quarterly Financial Statements" }),
      createdAt
    },
    {
      id: "audit-submission",
      actorUserId: borrowerId,
      action: "submit",
      entityType: "submission",
      entityId: "sub-acme-q1",
      beforeJson: null,
      afterJson: JSON.stringify({ status: "Submitted" }),
      createdAt
    }
  ];

  const consistencyFindings: ConsistencyFinding[] = [
    {
      id: "finding-acme-1",
      loanId: loanAcmeId,
      documentVersionId: "docver-acme-v2",
      ruleKey: "TERM_SHEET_THRESHOLD_MISMATCH",
      severity: "High",
      message: "Leverage Ratio threshold in term sheet v2 (3.5x) differs from covenant record (4.0x).",
      affectedEntityType: "Covenant",
      affectedEntityId: "cov-acme-leverage",
      status: "Open",
      createdAt,
      resolvedAt: null,
      resolvedBy: null
    },
    {
      id: "finding-acme-2",
      loanId: loanAcmeId,
      documentVersionId: null,
      ruleKey: "DUE_RULE_CONFLICT",
      severity: "Med",
      message: "Quarterly statements due date does not match updated reporting timeline.",
      affectedEntityType: "Obligation",
      affectedEntityId: "obl-acme-financials",
      status: "Open",
      createdAt,
      resolvedAt: null,
      resolvedBy: null
    }
  ];

  const exportHistory: ExportHistory[] = [
    {
      id: "export-acme-1",
      loanId: loanAcmeId,
      exportType: "PDF",
      filePath: "/exports/Acme_CompliancePack.pdf",
      createdBy: adminId,
      createdAt
    }
  ];

  const greenAssessments: GreenAssessment[] = [
    {
      id: "green-acme-v1",
      loanId: loanAcmeId,
      versionNo: 1,
      inputsJson: JSON.stringify({
        useOfProceeds: ["Energy Efficiency"],
        kpis: { energyEfficiencyPct: 12 },
        reportingCadence: "Annual",
        verification: "Internal",
        traceability: "Moderate",
        exclusions: []
      }),
      breakdownJson: JSON.stringify({
        components: {
          eligibility: 30,
          kpiAmbition: 10,
          verificationReporting: 9,
          traceability: 9,
          exclusions: 10
        },
        missingData: [],
        redFlags: []
      }),
      score: 68,
      verdict: "Transitional",
      redFlagsJson: JSON.stringify([]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "green-greenbuild-v1",
      loanId: loanGreenId,
      versionNo: 1,
      inputsJson: JSON.stringify({
        useOfProceeds: ["Renewable Energy", "Green Buildings"],
        kpis: { emissionsReductionPct: 25, renewableSharePct: 60 },
        reportingCadence: "Quarterly",
        verification: "ThirdParty",
        traceability: "Strong",
        exclusions: []
      }),
      breakdownJson: JSON.stringify({
        components: {
          eligibility: 30,
          kpiAmbition: 20,
          verificationReporting: 18,
          traceability: 15,
          exclusions: 10
        },
        missingData: [],
        redFlags: []
      }),
      score: 93,
      verdict: "Green",
      redFlagsJson: JSON.stringify([]),
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt
    }
  ];

  const greenEvidenceTags: GreenEvidenceTag[] = [
    {
      id: "green-tag-1",
      loanId: loanGreenId,
      documentId: "doc-green-agreement",
      category: "Use of Proceeds",
      snippet: "Proceeds used for renewable energy upgrades.",
      pageNumber: 4,
      createdBy: adminId,
      createdAt
    }
  ];

  const integrations: IntegrationStatus[] = [
    { id: "integration-heuristic", name: "Local Heuristic Extractor", status: "Mock", lastSyncAt: null },
    { id: "integration-mock", name: "Prototype Mock Adapter", status: "Mock", lastSyncAt: null }
  ];

  return {
    users,
    loans,
    loanParties,
    obligations,
    obligationInstances,
    covenants,
    covenantResults,
    formulas,
    documents,
    documentGroups,
    documentVersions,
    clauses,
    submissions,
    submissionItems,
    attachments,
    waiverAttachments,
    waivers,
    auditEvents,
    definitions,
    termSheetVersions,
    clauseTemplates,
    extractionRuns,
    extractedSuggestions,
    consistencyFindings,
    exportHistory,
    greenAssessments,
    greenEvidenceTags,
    integrations
  };
}

function loadMockData(): MockData {
  if (mockDataCache) {
    return mockDataCache;
  }
  try {
    const stored = window.localStorage.getItem(MOCK_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<MockData>;
      if (
        parsed &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.loans) &&
        Array.isArray(parsed.obligations) &&
        Array.isArray(parsed.covenants) &&
        Array.isArray(parsed.documents) &&
        Array.isArray(parsed.submissions) &&
        Array.isArray(parsed.termSheetVersions) &&
        Array.isArray(parsed.clauseTemplates) &&
        Array.isArray(parsed.extractionRuns) &&
        Array.isArray(parsed.extractedSuggestions) &&
        Array.isArray(parsed.consistencyFindings)
      ) {
        const normalized = {
          ...parsed,
          attachments: parsed.attachments ?? [],
          waiverAttachments: parsed.waiverAttachments ?? [],
          exportHistory: parsed.exportHistory ?? [],
          greenAssessments: parsed.greenAssessments ?? [],
          greenEvidenceTags: parsed.greenEvidenceTags ?? []
        } as MockData;
        mockDataCache = normalized;
        return normalized;
      }
    }
  } catch {
    // ignore storage errors
  }
  const seeded = buildSeedData();
  saveMockData(seeded);
  return seeded;
}

function saveMockData(data: MockData) {
  mockDataCache = data;
  window.localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(data));
}

function loadMockCredentials(): Record<string, string> {
  try {
    const stored = window.localStorage.getItem(MOCK_CREDENTIALS_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, string>;
    }
  } catch {
    // ignore
  }
  const seedMap = Object.fromEntries(seedCredentials.map((item) => [item.email, item.password]));
  saveMockCredentials(seedMap);
  return seedMap;
}

function saveMockCredentials(map: Record<string, string>) {
  window.localStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify(map));
}

function requireMockSession(sessionId?: string): { sessionId: string; user: User } {
  const session = getMockSession();
  if (!session || !sessionId || session.sessionId !== sessionId) {
    throw new Error("Session expired. Please sign in again.");
  }
  return session;
}

function assertRole(session: { user: User }, allowed: User["role"][]) {
  if (!allowed.includes(session.user.role)) {
    throw new Error("Not authorized to perform this action.");
  }
}

function getLoanInstances(data: MockData, loanId: string) {
  const obligationIds = data.obligations.filter((item) => item.loanId === loanId).map((item) => item.id);
  return data.obligationInstances.filter((instance) => obligationIds.includes(instance.obligationId));
}

function computeDashboardSummary(data: MockData) {
  const now = new Date();
  const loanSummaries = data.loans.map((loan) => {
    const instances = getLoanInstances(data, loan.id);
    const submissions = data.submissions.filter((item) => item.loanId === loan.id);
    const covenantIds = data.covenants.filter((item) => item.loanId === loan.id).map((item) => item.id);
    const results = data.covenantResults.filter((item) => covenantIds.includes(item.covenantId));
    const pendingWaivers = data.waivers.filter(
      (item) => item.loanId === loan.id && item.status === "Requested"
    ).length;

    const dueSoon = instances.filter((instance) => {
      if (instance.status !== "Pending") {
        return false;
      }
      const due = new Date(instance.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    }).length;

    const overdue = instances.filter((instance) => instance.status === "Overdue").length;
    const waitingReview = submissions.filter((item) => ["Submitted", "UnderReview"].includes(item.status)).length;
    const breaches = results.filter((item) => item.passFail === "Fail").length;

    const nextDueDate = instances
      .map((instance) => instance.dueDate)
      .sort()
      .find(Boolean) ?? null;

    const alertCounts: AlertCounts = { dueSoon, overdue, waitingReview, breaches, pendingWaivers };

    return {
      ...loan,
      alertCounts,
      nextDueDate
    };
  });

  const totals = loanSummaries.reduce(
    (acc, loan) => {
      acc.dueSoon += loan.alertCounts.dueSoon;
      acc.overdue += loan.alertCounts.overdue;
      acc.waitingReview += loan.alertCounts.waitingReview;
      acc.breaches += loan.alertCounts.breaches;
      acc.pendingWaivers += loan.alertCounts.pendingWaivers;
      return acc;
    },
    { dueSoon: 0, overdue: 0, waitingReview: 0, breaches: 0, pendingWaivers: 0 }
  );

  const recentActivity = [...data.auditEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return { loans: loanSummaries, totals, recentActivity };
}

const greenEligibleCategories = new Set([
  "Renewable Energy",
  "Green Buildings",
  "Clean Transport",
  "Energy Efficiency",
  "Pollution Prevention",
  "Sustainable Water",
  "Climate Adaptation",
  "Circular Economy"
]);

const greenRedFlags = new Set([
  "Coal",
  "Coal expansion",
  "Oil expansion",
  "Gas expansion",
  "Arctic drilling",
  "Deforestation",
  "Weapons",
  "Fossil fuel expansion"
]);

function normalizeKpiScore(value: number | undefined, low: number, mid: number, high: number) {
  if (value === undefined || Number.isNaN(value)) {
    return null;
  }
  if (value >= high) return 1;
  if (value >= mid) return 0.75;
  if (value >= low) return 0.4;
  return 0.2;
}

function evaluateGreenInputs(inputs: Record<string, unknown>) {
  const useOfProceeds = Array.isArray(inputs.useOfProceeds) ? inputs.useOfProceeds : [];
  const kpis = (inputs.kpis ?? {}) as Record<string, number | undefined>;
  const reportingCadence =
    typeof inputs.reportingCadence === "string" ? inputs.reportingCadence : "Annual";
  const verification = typeof inputs.verification === "string" ? inputs.verification : "None";
  const traceability = typeof inputs.traceability === "string" ? inputs.traceability : "Weak";
  const exclusions = Array.isArray(inputs.exclusions) ? inputs.exclusions : [];

  const missingData: string[] = [];
  const eligibleCount = useOfProceeds.filter((item) => greenEligibleCategories.has(item)).length;
  const eligibilityScore = useOfProceeds.length
    ? Math.round(30 * (eligibleCount / useOfProceeds.length))
    : 0;
  if (!useOfProceeds.length) {
    missingData.push("Use-of-proceeds categories");
  }

  const kpiScores = [
    normalizeKpiScore(kpis.emissionsReductionPct, 5, 15, 30),
    normalizeKpiScore(kpis.renewableSharePct, 15, 35, 60),
    normalizeKpiScore(kpis.energyEfficiencyPct, 5, 12, 25),
    normalizeKpiScore(kpis.cleanTransportPct, 10, 25, 50)
  ].filter((value): value is number => value !== null);
  const kpiScore = kpiScores.length
    ? Math.round((25 * kpiScores.reduce((sum, val) => sum + val, 0)) / kpiScores.length)
    : 0;
  if (!kpiScores.length) {
    missingData.push("KPI targets");
  }

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
  const verificationReportingScore = Math.round(20 * (cadenceScore * 0.6 + verificationScore * 0.4));

  const traceabilityScore = traceability === "Strong" ? 15 : traceability === "Moderate" ? 9 : 4;

  const redFlags = exclusions.filter((item) => greenRedFlags.has(item));
  const exclusionsScore = redFlags.length ? 0 : exclusions.length ? 6 : 10;

  const score =
    eligibilityScore +
    kpiScore +
    verificationReportingScore +
    traceabilityScore +
    exclusionsScore;

  let verdict: GreenAssessment["verdict"] = "NotGreen";
  if (redFlags.length) {
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
        eligibility: eligibilityScore,
        kpiAmbition: kpiScore,
        verificationReporting: verificationReportingScore,
        traceability: traceabilityScore,
        exclusions: exclusionsScore
      },
      missingData,
      redFlags
    }
  };
}

function buildMockDocumentDataUrl(name: string, subtitle: string) {
  return encodeHtmlDataUrl(
    buildHtmlDocument(name, subtitle, [
      "This is a mock document preview generated for prototype review.",
      "In Electron mode, the PDF viewer loads the actual stored file.",
      "Use the Workbench tab to add clause references and suggestions."
    ])
  );
}

function buildMockDraftDataUrl(name: string, termSheetLabel: string) {
  return encodeHtmlDataUrl(
    buildHtmlDocument(name, `Draft from ${termSheetLabel}`, [
      "Facility terms aligned to the selected term sheet version.",
      "Leverage Ratio and Interest Coverage covenant wording updated.",
      "Reporting timelines captured for compliance calendar."
    ])
  );
}

function getFormulaIdByKey(data: MockData, key: string) {
  return data.formulas.find((formula) => formula.key === key)?.id ?? data.formulas[0]?.id ?? "";
}

function updateData<T>(mutator: (data: MockData) => T): T {
  const data = loadMockData();
  const result = mutator(data);
  saveMockData(data);
  return result;
}

async function mockInvoke<C extends IpcChannel>(
  channel: C,
  payload: IpcRequestMap[C]
): Promise<IpcResponseMap[C]> {
  try {
    if (channel === "auth:login") {
      const { email, password } = payload as IpcRequestMap["auth:login"];
      const credentials = loadMockCredentials();
      const data = loadMockData();
      const match = data.users.find((user) => user.email === email);
      if (!match || credentials[email] !== password) {
        return { ok: false, error: "Invalid credentials." } as IpcResponseMap[C];
      }
      const sessionId = `mock-${Date.now()}`;
      const session = { sessionId, user: match };
      setMockSession(session);
      return { ok: true, data: session } as IpcResponseMap[C];
    }

    if (channel === "auth:me") {
      const { sessionId } = payload as IpcRequestMap["auth:me"];
      const session = getMockSession();
      if (session && session.sessionId === sessionId) {
        return { ok: true, data: { user: session.user } } as IpcResponseMap[C];
      }
      return { ok: true, data: null } as IpcResponseMap[C];
    }

    if (channel === "auth:logout") {
      setMockSession(null);
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "demo:seed") {
      requireMockSession((payload as IpcRequestMap["demo:seed"]).sessionId);
      return { ok: true, data: { status: "already" } } as IpcResponseMap[C];
    }

    if (channel === "users:list") {
      const session = requireMockSession((payload as IpcRequestMap["users:list"]).sessionId);
      assertRole(session, ["Admin"]);
      return { ok: true, data: loadMockData().users } as IpcResponseMap[C];
    }

    if (channel === "users:create") {
      const session = requireMockSession((payload as IpcRequestMap["users:create"]).sessionId);
      assertRole(session, ["Admin"]);
      const { input } = payload as IpcRequestMap["users:create"];
      const newUser: User = {
        id: generateId("user"),
        name: input.name,
        email: input.email,
        role: input.role,
        createdAt: nowIso()
      };
      updateData((data) => {
        data.users.push(newUser);
      });
      const credentials = loadMockCredentials();
      credentials[input.email] = input.password;
      saveMockCredentials(credentials);
      return { ok: true, data: newUser } as IpcResponseMap[C];
    }

    if (channel === "users:updateRole") {
      const session = requireMockSession((payload as IpcRequestMap["users:updateRole"]).sessionId);
      assertRole(session, ["Admin"]);
      const { userId, role } = payload as IpcRequestMap["users:updateRole"];
      const updated = updateData((data) => {
        const user = data.users.find((item) => item.id === userId);
        if (!user) {
          throw new Error("User not found");
        }
        user.role = role;
        return user;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "users:resetPassword") {
      const session = requireMockSession((payload as IpcRequestMap["users:resetPassword"]).sessionId);
      assertRole(session, ["Admin"]);
      const { userId, newPassword } = payload as IpcRequestMap["users:resetPassword"];
      const data = loadMockData();
      const user = data.users.find((item) => item.id === userId);
      if (!user) {
        return { ok: false, error: "User not found." } as IpcResponseMap[C];
      }
      const credentials = loadMockCredentials();
      credentials[user.email] = newPassword;
      saveMockCredentials(credentials);
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "alerts:dashboard") {
      requireMockSession((payload as IpcRequestMap["alerts:dashboard"]).sessionId);
      return { ok: true, data: computeDashboardSummary(loadMockData()) } as IpcResponseMap[C];
    }

    if (channel === "integrations:status") {
      requireMockSession((payload as IpcRequestMap["integrations:status"]).sessionId);
      return { ok: true, data: loadMockData().integrations } as IpcResponseMap[C];
    }

    if (channel === "loans:list") {
      requireMockSession((payload as IpcRequestMap["loans:list"]).sessionId);
      return { ok: true, data: loadMockData().loans } as IpcResponseMap[C];
    }

    if (channel === "loans:get") {
      requireMockSession((payload as IpcRequestMap["loans:get"]).sessionId);
      const { loanId } = payload as IpcRequestMap["loans:get"];
      const loan = loadMockData().loans.find((item) => item.id === loanId) ?? null;
      return { ok: true, data: loan } as IpcResponseMap[C];
    }

    if (channel === "loans:create") {
      const session = requireMockSession((payload as IpcRequestMap["loans:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["loans:create"];
      const newLoan: Loan = {
        id: generateId("loan"),
        name: input.name,
        borrowerName: input.borrowerName,
        lenderName: input.lenderName,
        currency: input.currency,
        startDate: input.startDate,
        status: input.status,
        createdAt: nowIso()
      };
      updateData((data) => {
        data.loans.unshift(newLoan);
        data.loanParties.push(
          {
            id: generateId("party"),
            loanId: newLoan.id,
            partyType: "Borrower",
            name: input.borrowerName,
            contactEmail: `finance@${input.borrowerName.toLowerCase().replace(/\s+/g, "")}.com`
          },
          {
            id: generateId("party"),
            loanId: newLoan.id,
            partyType: "Lender",
            name: input.lenderName,
            contactEmail: `ops@${input.lenderName.toLowerCase().replace(/\s+/g, "")}.com`
          }
        );
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "create",
          entityType: "loan",
          entityId: newLoan.id,
          beforeJson: null,
          afterJson: JSON.stringify(input),
          createdAt: nowIso()
        });
      });
      return { ok: true, data: newLoan } as IpcResponseMap[C];
    }

    if (channel === "loans:update") {
      const session = requireMockSession((payload as IpcRequestMap["loans:update"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { loanId, input } = payload as IpcRequestMap["loans:update"];
      const updated = updateData((data) => {
        const loan = data.loans.find((item) => item.id === loanId);
        if (!loan) {
          throw new Error("Loan not found");
        }
        loan.name = input.name ?? loan.name;
        loan.borrowerName = input.borrowerName ?? loan.borrowerName;
        loan.lenderName = input.lenderName ?? loan.lenderName;
        loan.currency = input.currency ?? loan.currency;
        loan.startDate = input.startDate ?? loan.startDate;
        loan.status = input.status ?? loan.status;
        return loan;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "obligations:list") {
      requireMockSession((payload as IpcRequestMap["obligations:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["obligations:list"];
      return {
        ok: true,
        data: loadMockData().obligations.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "obligations:create") {
      const session = requireMockSession((payload as IpcRequestMap["obligations:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["obligations:create"];
      const obligation: Obligation = {
        id: generateId("obl"),
        loanId: input.loanId,
        title: input.title,
        description: input.description,
        frequency: input.frequency,
        dueRuleJson: JSON.stringify(input.dueRule),
        ownerParty: input.ownerParty,
        severity: input.severity,
        status: input.status,
        sourceClauseId: input.sourceClauseId,
        createdAt: nowIso()
      };

      updateData((data) => {
        data.obligations.push(obligation);
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "create",
          entityType: "obligation",
          entityId: obligation.id,
          beforeJson: null,
          afterJson: JSON.stringify(input),
          createdAt: nowIso()
        });
        if (input.frequency !== "Adhoc") {
          data.obligationInstances.push({
            id: generateId("inst"),
            obligationId: obligation.id,
            periodStart: null,
            periodEnd: null,
            dueDate: buildDate(new Date().getFullYear(), 12, 15),
            status: "Pending",
            lastReminderAt: null
          });
        }
      });
      return { ok: true, data: obligation } as IpcResponseMap[C];
    }

    if (channel === "obligationInstances:list") {
      requireMockSession((payload as IpcRequestMap["obligationInstances:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["obligationInstances:list"];
      const data = loadMockData();
      return { ok: true, data: getLoanInstances(data, loanId) } as IpcResponseMap[C];
    }

    if (channel === "obligationInstances:update") {
      const session = requireMockSession((payload as IpcRequestMap["obligationInstances:update"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { instanceId, status, dueDate } = payload as IpcRequestMap["obligationInstances:update"];
      const updated = updateData((data) => {
        const instance = data.obligationInstances.find((item) => item.id === instanceId);
        if (!instance) {
          throw new Error("Instance not found");
        }
        if (status) {
          instance.status = status;
        }
        if (dueDate) {
          instance.dueDate = dueDate;
        }
        return instance;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "covenants:list") {
      requireMockSession((payload as IpcRequestMap["covenants:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["covenants:list"];
      return {
        ok: true,
        data: loadMockData().covenants.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "covenants:create") {
      const session = requireMockSession((payload as IpcRequestMap["covenants:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["covenants:create"];
      const covenant: Covenant = {
        id: generateId("cov"),
        loanId: input.loanId,
        name: input.name,
        covenantType: input.covenantType,
        formulaId: input.formulaId,
        thresholdOp: input.thresholdOp,
        thresholdValue: input.thresholdValue,
        frequency: input.frequency,
        sourceClauseId: input.sourceClauseId,
        status: input.status
      };
      updateData((data) => {
        data.covenants.push(covenant);
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "create",
          entityType: "covenant",
          entityId: covenant.id,
          beforeJson: null,
          afterJson: JSON.stringify(input),
          createdAt: nowIso()
        });
      });
      return { ok: true, data: covenant } as IpcResponseMap[C];
    }

    if (channel === "covenants:results") {
      requireMockSession((payload as IpcRequestMap["covenants:results"]).sessionId);
      const { loanId } = payload as IpcRequestMap["covenants:results"];
      const data = loadMockData();
      const covenantIds = data.covenants.filter((item) => item.loanId === loanId).map((item) => item.id);
      return {
        ok: true,
        data: data.covenantResults.filter((item) => covenantIds.includes(item.covenantId))
      } as IpcResponseMap[C];
    }

    if (channel === "formulas:list") {
      requireMockSession((payload as IpcRequestMap["formulas:list"]).sessionId);
      return { ok: true, data: loadMockData().formulas } as IpcResponseMap[C];
    }

    if (channel === "documents:list") {
      requireMockSession((payload as IpcRequestMap["documents:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["documents:list"];
      return {
        ok: true,
        data: loadMockData().documents.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "documents:import") {
      const session = requireMockSession((payload as IpcRequestMap["documents:import"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { loanId } = payload as IpcRequestMap["documents:import"];
      const newDoc: Document = {
        id: generateId("doc"),
        loanId,
        filename: `Uploaded_${loanId}.pdf`,
        filePath: `mock://uploaded-${loanId}`,
        sha256: "mock-upload",
        uploadedBy: session.user.id,
        uploadedAt: nowIso()
      };
      updateData((data) => {
        data.documents.push(newDoc);
      });
      return { ok: true, data: newDoc } as IpcResponseMap[C];
    }

    if (channel === "documents:dataUrl") {
      requireMockSession((payload as IpcRequestMap["documents:dataUrl"]).sessionId);
      const { documentId } = payload as IpcRequestMap["documents:dataUrl"];
      const data = loadMockData();
      const doc = data.documents.find((item) => item.id === documentId);
      if (!doc) {
        return { ok: false, error: "Document not found" } as IpcResponseMap[C];
      }
      return {
        ok: true,
        data: {
          filename: doc.filename,
          dataUrl: buildMockDocumentDataUrl(doc.filename, "Mock Agreement PDF")
        }
      } as IpcResponseMap[C];
    }

    if (channel === "documentVersions:list") {
      requireMockSession((payload as IpcRequestMap["documentVersions:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["documentVersions:list"];
      const data = loadMockData();
      const groupIds = data.documentGroups.filter((group) => group.loanId === loanId).map((group) => group.id);
      return {
        ok: true,
        data: data.documentVersions.filter((version) => groupIds.includes(version.documentGroupId))
      } as IpcResponseMap[C];
    }

    if (channel === "documentVersions:dataUrl") {
      requireMockSession((payload as IpcRequestMap["documentVersions:dataUrl"]).sessionId);
      const { documentVersionId } = payload as IpcRequestMap["documentVersions:dataUrl"];
      const data = loadMockData();
      const version = data.documentVersions.find((item) => item.id === documentVersionId);
      if (!version) {
        return { ok: false, error: "Document version not found" } as IpcResponseMap[C];
      }
      const label = version.termSheetVersionId ? `Term Sheet ${version.termSheetVersionId}` : "Draft";
      return {
        ok: true,
        data: {
          filename: version.filename,
          dataUrl: buildMockDraftDataUrl(version.filename, label)
        }
      } as IpcResponseMap[C];
    }

    if (channel === "clauses:list") {
      requireMockSession((payload as IpcRequestMap["clauses:list"]).sessionId);
      const { documentId } = payload as IpcRequestMap["clauses:list"];
      return {
        ok: true,
        data: loadMockData().clauses.filter((item) => item.documentId === documentId)
      } as IpcResponseMap[C];
    }

    if (channel === "clauses:create") {
      const session = requireMockSession((payload as IpcRequestMap["clauses:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["clauses:create"];
      const clause: Clause = {
        id: generateId("clause"),
        documentId: input.documentId,
        clauseType: input.clauseType,
        title: input.title,
        textSnippet: input.textSnippet,
        pageNumber: input.pageNumber,
        tagsJson: JSON.stringify(input.tags),
        createdBy: session.user.id,
        createdAt: nowIso()
      };
      updateData((data) => {
        data.clauses.push(clause);
      });
      return { ok: true, data: clause } as IpcResponseMap[C];
    }

    if (channel === "extraction:runs") {
      requireMockSession((payload as IpcRequestMap["extraction:runs"]).sessionId);
      const { documentId, documentVersionId } = payload as IpcRequestMap["extraction:runs"];
      return {
        ok: true,
        data: loadMockData().extractionRuns.filter((run) => {
          if (documentId) {
            return run.documentId === documentId;
          }
          if (documentVersionId) {
            return run.documentVersionId === documentVersionId;
          }
          return false;
        })
      } as IpcResponseMap[C];
    }

    if (channel === "extraction:run") {
      const session = requireMockSession((payload as IpcRequestMap["extraction:run"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["extraction:run"];
      const runId = generateId("extract");
      const run: ExtractionRun = {
        id: runId,
        documentId: input.documentId ?? null,
        documentVersionId: input.documentVersionId ?? null,
        adapterKey: input.adapterKey,
        status: "Completed",
        startedAt: nowIso(),
        finishedAt: nowIso(),
        summaryJson: JSON.stringify({ clauses: 2, obligations: 1, covenants: 1, definitions: 1 })
      };
      updateData((data) => {
        data.extractionRuns.unshift(run);
        data.extractedSuggestions.unshift(
          {
            id: generateId("suggestion"),
            extractionRunId: runId,
            suggestionType: "Clause",
            payloadJson: JSON.stringify({
              clauseType: "Obligation",
              title: "Annual Audited Statements",
              textSnippet: "Borrower shall deliver audited annual statements within 90 days of year end.",
              pageNumber: 9,
              tags: ["financials", "audit"]
            }),
            confidence: 0.72,
            status: "Proposed",
            createdAt: nowIso(),
            updatedAt: nowIso()
          },
          {
            id: generateId("suggestion"),
            extractionRunId: runId,
            suggestionType: "Covenant",
            payloadJson: JSON.stringify({
              name: "Interest Coverage",
              covenantType: "Ratio",
              formulaKey: "INTEREST_COVERAGE",
              thresholdOp: ">=",
              thresholdValue: 2.0,
              frequency: "Quarterly",
              sourceSnippet: "Interest Coverage Ratio shall be at least 2.0x",
              pageNumber: 15
            }),
            confidence: 0.7,
            status: "Proposed",
            createdAt: nowIso(),
            updatedAt: nowIso()
          }
        );
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "EXTRACTION_RUN",
          entityType: "document",
          entityId: input.documentId ?? input.documentVersionId ?? "",
          beforeJson: null,
          afterJson: JSON.stringify({ adapterKey: input.adapterKey }),
          createdAt: nowIso()
        });
      });
      return { ok: true, data: run } as IpcResponseMap[C];
    }

    if (channel === "extraction:suggestions") {
      requireMockSession((payload as IpcRequestMap["extraction:suggestions"]).sessionId);
      const { runId } = payload as IpcRequestMap["extraction:suggestions"];
      return {
        ok: true,
        data: loadMockData().extractedSuggestions.filter((item) => item.extractionRunId === runId)
      } as IpcResponseMap[C];
    }

    if (channel === "extraction:confirm") {
      const session = requireMockSession((payload as IpcRequestMap["extraction:confirm"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { suggestionId, edits } = payload as IpcRequestMap["extraction:confirm"];
      const updated = updateData((data) => {
        const suggestion = data.extractedSuggestions.find((item) => item.id === suggestionId);
        if (!suggestion) {
          throw new Error("Suggestion not found");
        }
        const payloadJson = JSON.parse(suggestion.payloadJson) as Record<string, unknown>;
        const merged = { ...payloadJson, ...(edits ?? {}) };
        suggestion.payloadJson = JSON.stringify(merged);
        suggestion.status = "Confirmed";
        suggestion.updatedAt = nowIso();

        if (suggestion.suggestionType === "Clause") {
          data.clauses.push({
            id: generateId("clause"),
            documentId: data.documents[0]?.id ?? "",
            clauseType: String(merged.clauseType ?? "Other") as Clause["clauseType"],
            title: String(merged.title ?? "New Clause"),
            textSnippet: String(merged.textSnippet ?? ""),
            pageNumber: Number(merged.pageNumber ?? 1),
            tagsJson: JSON.stringify(merged.tags ?? []),
            createdBy: session.user.id,
            createdAt: nowIso()
          });
        }

        if (suggestion.suggestionType === "Obligation") {
          data.obligations.push({
            id: generateId("obl"),
            loanId: data.loans[0]?.id ?? "",
            title: String(merged.title ?? "New Obligation"),
            description: String(merged.description ?? ""),
            frequency: String(merged.frequency ?? "Quarterly") as Obligation["frequency"],
            dueRuleJson: JSON.stringify(merged.dueRule ?? { type: "custom", description: "" }),
            ownerParty: String(merged.ownerParty ?? "Borrower") as Obligation["ownerParty"],
            severity: String(merged.severity ?? "Med") as Obligation["severity"],
            status: "Active",
            sourceClauseId: null,
            createdAt: nowIso()
          });
        }

        if (suggestion.suggestionType === "Covenant") {
          data.covenants.push({
            id: generateId("cov"),
            loanId: data.loans[0]?.id ?? "",
            name: String(merged.name ?? "New Covenant"),
            covenantType: String(merged.covenantType ?? "Ratio") as Covenant["covenantType"],
            formulaId: getFormulaIdByKey(data, String(merged.formulaKey ?? "LEVERAGE_RATIO")),
            thresholdOp: String(merged.thresholdOp ?? "<=") as Covenant["thresholdOp"],
            thresholdValue: Number(merged.thresholdValue ?? 0),
            frequency: String(merged.frequency ?? "Quarterly") as Covenant["frequency"],
            sourceClauseId: null,
            status: "Active"
          });
        }

        if (suggestion.suggestionType === "Definition") {
          data.definitions.push({
            id: generateId("def"),
            loanId: data.loans[0]?.id ?? "",
            term: String(merged.term ?? "New Term"),
            definitionText: String(merged.definitionText ?? ""),
            sourceClauseId: null,
            createdBy: session.user.id,
            createdAt: nowIso(),
            updatedAt: nowIso()
          });
        }

        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "SUGGESTION_CONFIRMED",
          entityType: suggestion.suggestionType,
          entityId: suggestion.id,
          beforeJson: null,
          afterJson: suggestion.payloadJson,
          createdAt: nowIso()
        });

        return suggestion;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "extraction:reject") {
      const session = requireMockSession((payload as IpcRequestMap["extraction:reject"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { suggestionId } = payload as IpcRequestMap["extraction:reject"];
      const updated = updateData((data) => {
        const suggestion = data.extractedSuggestions.find((item) => item.id === suggestionId);
        if (!suggestion) {
          throw new Error("Suggestion not found");
        }
        suggestion.status = "Rejected";
        suggestion.updatedAt = nowIso();
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "SUGGESTION_REJECTED",
          entityType: suggestion.suggestionType,
          entityId: suggestion.id,
          beforeJson: null,
          afterJson: suggestion.payloadJson,
          createdAt: nowIso()
        });
        return suggestion;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "definitions:list") {
      requireMockSession((payload as IpcRequestMap["definitions:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["definitions:list"];
      return {
        ok: true,
        data: loadMockData().definitions.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "definitions:upsert") {
      const session = requireMockSession((payload as IpcRequestMap["definitions:upsert"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["definitions:upsert"];
      const updated = updateData((data) => {
        if (input.id) {
          const existing = data.definitions.find((item) => item.id === input.id);
          if (!existing) {
            throw new Error("Definition not found");
          }
          existing.term = input.term;
          existing.definitionText = input.definitionText;
          existing.sourceClauseId = input.sourceClauseId ?? null;
          existing.updatedAt = nowIso();
          return existing;
        }
        const definition: Definition = {
          id: generateId("def"),
          loanId: input.loanId,
          term: input.term,
          definitionText: input.definitionText,
          sourceClauseId: input.sourceClauseId ?? null,
          createdBy: session.user.id,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        data.definitions.push(definition);
        return definition;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "definitions:delete") {
      const session = requireMockSession((payload as IpcRequestMap["definitions:delete"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { definitionId } = payload as IpcRequestMap["definitions:delete"];
      updateData((data) => {
        data.definitions = data.definitions.filter((item) => item.id !== definitionId);
      });
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "termSheets:list") {
      requireMockSession((payload as IpcRequestMap["termSheets:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["termSheets:list"];
      return {
        ok: true,
        data: loadMockData().termSheetVersions.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "termSheets:get") {
      requireMockSession((payload as IpcRequestMap["termSheets:get"]).sessionId);
      const { termSheetVersionId } = payload as IpcRequestMap["termSheets:get"];
      const termSheet = loadMockData().termSheetVersions.find((item) => item.id === termSheetVersionId) ?? null;
      return { ok: true, data: termSheet } as IpcResponseMap[C];
    }

    if (channel === "termSheets:create") {
      const session = requireMockSession((payload as IpcRequestMap["termSheets:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["termSheets:create"];
      const created = updateData((data) => {
        const nextVersion =
          Math.max(0, ...data.termSheetVersions.filter((item) => item.loanId === input.loanId).map((item) => item.versionNo)) +
          1;
        const termSheet: TermSheetVersion = {
          id: generateId("ts"),
          loanId: input.loanId,
          versionNo: nextVersion,
          dataJson: JSON.stringify(input.data),
          createdBy: session.user.id,
          createdAt: nowIso()
        };
        data.termSheetVersions.push(termSheet);
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "TERM_SHEET_VERSION_CREATED",
          entityType: "term_sheet",
          entityId: termSheet.id,
          beforeJson: null,
          afterJson: termSheet.dataJson,
          createdAt: nowIso()
        });
        return termSheet;
      });
      return { ok: true, data: created } as IpcResponseMap[C];
    }

    if (channel === "templates:list") {
      requireMockSession((payload as IpcRequestMap["templates:list"]).sessionId);
      return { ok: true, data: loadMockData().clauseTemplates } as IpcResponseMap[C];
    }

    if (channel === "templates:get") {
      requireMockSession((payload as IpcRequestMap["templates:get"]).sessionId);
      const { templateId } = payload as IpcRequestMap["templates:get"];
      const template = loadMockData().clauseTemplates.find((item) => item.id === templateId) ?? null;
      return { ok: true, data: template } as IpcResponseMap[C];
    }

    if (channel === "templates:create") {
      const session = requireMockSession((payload as IpcRequestMap["templates:create"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["templates:create"];
      const template: ClauseTemplate = {
        id: generateId("template"),
        key: input.key,
        category: input.category,
        title: input.title,
        bodyText: input.bodyText,
        placeholdersJson: JSON.stringify(input.placeholders ?? []),
        createdBy: session.user.id,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      updateData((data) => {
        data.clauseTemplates.push(template);
      });
      return { ok: true, data: template } as IpcResponseMap[C];
    }

    if (channel === "templates:update") {
      const session = requireMockSession((payload as IpcRequestMap["templates:update"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["templates:update"];
      const template = updateData((data) => {
        const existing = data.clauseTemplates.find((item) => item.id === input.id);
        if (!existing) {
          throw new Error("Template not found");
        }
        existing.title = input.title ?? existing.title;
        existing.category = input.category ?? existing.category;
        existing.bodyText = input.bodyText ?? existing.bodyText;
        existing.placeholdersJson = JSON.stringify(input.placeholders ?? JSON.parse(existing.placeholdersJson));
        existing.updatedAt = nowIso();
        return existing;
      });
      return { ok: true, data: template } as IpcResponseMap[C];
    }

    if (channel === "templates:delete") {
      const session = requireMockSession((payload as IpcRequestMap["templates:delete"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { templateId } = payload as IpcRequestMap["templates:delete"];
      updateData((data) => {
        data.clauseTemplates = data.clauseTemplates.filter((item) => item.id !== templateId);
      });
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "drafts:generate") {
      const session = requireMockSession((payload as IpcRequestMap["drafts:generate"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["drafts:generate"];
      const created = updateData((data) => {
        const group = data.documentGroups.find((item) => item.loanId === input.loanId) ?? data.documentGroups[0];
        const nextVersion =
          Math.max(0, ...data.documentVersions.filter((item) => item.documentGroupId === group.id).map((item) => item.versionNo)) +
          1;
        const docVersion: DocumentVersion = {
          id: generateId("docver"),
          documentGroupId: group.id,
          versionNo: nextVersion,
          filename: `Draft_v${nextVersion}.html`,
          filePath: `mock://draft-v${nextVersion}`,
          sha256: "mock-draft",
          createdBy: session.user.id,
          createdAt: nowIso(),
          source: "Generated",
          termSheetVersionId: input.termSheetVersionId
        };
        data.documentVersions.push(docVersion);
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "DOC_VERSION_CREATED",
          entityType: "document_version",
          entityId: docVersion.id,
          beforeJson: null,
          afterJson: JSON.stringify({ templateKeys: input.templateKeys }),
          createdAt: nowIso()
        });
        return docVersion;
      });
      return { ok: true, data: created } as IpcResponseMap[C];
    }

    if (channel === "diffs:semantic") {
      requireMockSession((payload as IpcRequestMap["diffs:semantic"]).sessionId);
      const diffs: SemanticDiffItem[] = [
        {
          key: "leverage-threshold",
          message: "Leverage Ratio threshold changed from 4.0x to 3.5x.",
          entityType: "Covenant",
          entityId: "cov-acme-leverage",
          severity: "High"
        },
        {
          key: "reporting-days",
          message: "Quarterly reporting timeline changed from 45 to 60 days.",
          entityType: "Obligation",
          entityId: "obl-acme-financials",
          severity: "Med"
        }
      ];
      return { ok: true, data: diffs } as IpcResponseMap[C];
    }

    if (channel === "consistency:run") {
      const session = requireMockSession((payload as IpcRequestMap["consistency:run"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["consistency:run"];
      const findings = updateData((data) => {
        const finding: ConsistencyFinding = {
          id: generateId("finding"),
          loanId: input.loanId,
          documentVersionId: input.documentVersionId ?? null,
          ruleKey: "THRESHOLD_MISMATCH",
          severity: "High",
          message: "Term sheet threshold does not match covenant record.",
          affectedEntityType: "Covenant",
          affectedEntityId: data.covenants.find((item) => item.loanId === input.loanId)?.id ?? "",
          status: "Open",
          createdAt: nowIso(),
          resolvedAt: null,
          resolvedBy: null
        };
        data.consistencyFindings.unshift(finding);
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "CONSISTENCY_CHECK_RUN",
          entityType: "loan",
          entityId: input.loanId,
          beforeJson: null,
          afterJson: JSON.stringify({ findingId: finding.id }),
          createdAt: nowIso()
        });
        return data.consistencyFindings.filter((item) => item.loanId === input.loanId);
      });
      return { ok: true, data: findings } as IpcResponseMap[C];
    }

    if (channel === "consistency:list") {
      requireMockSession((payload as IpcRequestMap["consistency:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["consistency:list"];
      return {
        ok: true,
        data: loadMockData().consistencyFindings.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "consistency:resolve") {
      const session = requireMockSession((payload as IpcRequestMap["consistency:resolve"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["consistency:resolve"];
      const finding = updateData((data) => {
        const existing = data.consistencyFindings.find((item) => item.id === input.findingId);
        if (!existing) {
          throw new Error("Finding not found");
        }
        existing.status = "Resolved";
        existing.resolvedAt = nowIso();
        existing.resolvedBy = session.user.id;
        return existing;
      });
      return { ok: true, data: finding } as IpcResponseMap[C];
    }

    if (channel === "green:list") {
      requireMockSession((payload as IpcRequestMap["green:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["green:list"];
      return {
        ok: true,
        data: loadMockData().greenAssessments.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "green:latest") {
      requireMockSession((payload as IpcRequestMap["green:latest"]).sessionId);
      const { loanId } = payload as IpcRequestMap["green:latest"];
      const assessments = loadMockData().greenAssessments.filter((item) => item.loanId === loanId);
      const latest = assessments.sort((a, b) => b.versionNo - a.versionNo)[0] ?? null;
      return { ok: true, data: latest } as IpcResponseMap[C];
    }

    if (channel === "green:save") {
      const session = requireMockSession((payload as IpcRequestMap["green:save"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["green:save"];
      const evaluation = evaluateGreenInputs(input.inputs as Record<string, unknown>);
      const created = updateData((data) => {
        const versionNo =
          Math.max(0, ...data.greenAssessments.filter((item) => item.loanId === input.loanId).map((item) => item.versionNo)) + 1;
        const assessment: GreenAssessment = {
          id: generateId("green"),
          loanId: input.loanId,
          versionNo,
          inputsJson: JSON.stringify(input.inputs),
          breakdownJson: JSON.stringify(evaluation.breakdown),
          score: evaluation.score,
          verdict: evaluation.verdict,
          redFlagsJson: JSON.stringify(evaluation.breakdown.redFlags),
          createdBy: session.user.id,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        data.greenAssessments.unshift(assessment);
        return assessment;
      });
      return { ok: true, data: created } as IpcResponseMap[C];
    }

    if (channel === "green:evidence:list") {
      requireMockSession((payload as IpcRequestMap["green:evidence:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["green:evidence:list"];
      return {
        ok: true,
        data: loadMockData().greenEvidenceTags.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "green:evidence:add") {
      const session = requireMockSession((payload as IpcRequestMap["green:evidence:add"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["green:evidence:add"];
      const created = updateData((data) => {
        const tag: GreenEvidenceTag = {
          id: generateId("green-tag"),
          loanId: input.loanId,
          documentId: input.documentId,
          category: input.category,
          snippet: input.snippet,
          pageNumber: input.pageNumber ?? null,
          createdBy: session.user.id,
          createdAt: nowIso()
        };
        data.greenEvidenceTags.unshift(tag);
        return tag;
      });
      return { ok: true, data: created } as IpcResponseMap[C];
    }

    if (channel === "submissions:list") {
      requireMockSession((payload as IpcRequestMap["submissions:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["submissions:list"];
      return {
        ok: true,
        data: loadMockData().submissions.filter((item) => item.loanId === loanId)
      } as IpcResponseMap[C];
    }

    if (channel === "submissions:detail") {
      requireMockSession((payload as IpcRequestMap["submissions:detail"]).sessionId);
      const { submissionId } = payload as IpcRequestMap["submissions:detail"];
      const data = loadMockData();
      const submission = data.submissions.find((item) => item.id === submissionId);
      if (!submission) {
        return { ok: false, error: "Submission not found" } as IpcResponseMap[C];
      }
      const items = data.submissionItems.filter((item) => item.submissionId === submissionId);
      const attachments = data.attachments.filter((item) => item.submissionId === submissionId);
      const covenantIds = data.covenants
        .filter((covenant) => covenant.loanId === submission.loanId)
        .map((covenant) => covenant.id);
      const covenantResults = data.covenantResults.filter((result) => {
        if (!covenantIds.includes(result.covenantId)) {
          return false;
        }
        if (submission.periodEnd && result.periodEnd) {
          return result.periodEnd === submission.periodEnd;
        }
        return true;
      });
      const detail: SubmissionDetail = { submission, items, attachments, covenantResults };
      return { ok: true, data: detail } as IpcResponseMap[C];
    }

    if (channel === "submissions:submit") {
      const session = requireMockSession((payload as IpcRequestMap["submissions:submit"]).sessionId);
      assertRole(session, ["BorrowerReporter", "Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["submissions:submit"];
      const updated = updateData((data) => {
        const submission = data.submissions.find((item) => item.id === input.submissionId);
        if (!submission) {
          throw new Error("Submission not found");
        }
        submission.status = "Submitted";
        submission.submittedAt = nowIso();
        if (submission.type === "ObligationEvidence") {
          data.submissionItems
            .filter((item) => item.submissionId === submission.id)
            .map((item) => item.obligationInstanceId)
            .filter((id): id is string => Boolean(id))
            .forEach((id) => {
              const instance = data.obligationInstances.find((inst) => inst.id === id);
              if (instance) {
                instance.status = "Submitted";
              }
            });
        }
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "submit",
          entityType: "submission",
          entityId: submission.id,
          beforeJson: null,
          afterJson: JSON.stringify({ status: "Submitted" }),
          createdAt: nowIso()
        });
        return submission;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "submissions:create") {
      const session = requireMockSession((payload as IpcRequestMap["submissions:create"]).sessionId);
      assertRole(session, ["BorrowerReporter", "Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["submissions:create"];
      const submission: Submission = {
        id: generateId("submission"),
        loanId: input.loanId,
        submitterUserId: input.submitterUserId,
        type: input.type,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: input.status,
        submittedAt: input.status === "Draft" ? null : nowIso(),
        reviewNotes: null
      };
      updateData((data) => {
        data.submissions.unshift(submission);
        input.items.forEach((item) => {
          data.submissionItems.push({
            id: generateId("item"),
            submissionId: submission.id,
            obligationInstanceId: item.obligationInstanceId ?? null,
            key: item.key,
            valueText: item.valueText ?? null,
            valueNumber: item.valueNumber ?? null,
            valueJson: item.valueJson ?? null,
            notes: null
          });
        });
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "submit",
          entityType: "submission",
          entityId: submission.id,
          beforeJson: null,
          afterJson: JSON.stringify({ status: submission.status }),
          createdAt: nowIso()
        });
      });
      return { ok: true, data: submission } as IpcResponseMap[C];
    }

    if (channel === "submissions:review") {
      const session = requireMockSession((payload as IpcRequestMap["submissions:review"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { submissionId, status, notes } = payload as IpcRequestMap["submissions:review"];
      const updated = updateData((data) => {
        const submission = data.submissions.find((item) => item.id === submissionId);
        if (!submission) {
          throw new Error("Submission not found");
        }
        submission.status = status;
        submission.reviewNotes = notes ?? null;
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "review",
          entityType: "submission",
          entityId: submission.id,
          beforeJson: null,
          afterJson: JSON.stringify({ status, notes }),
          createdAt: nowIso()
        });
        return submission;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "attachments:add") {
      const session = requireMockSession((payload as IpcRequestMap["attachments:add"]).sessionId);
      assertRole(session, ["BorrowerReporter", "Admin", "LenderOps"]);
      const { submissionId } = payload as IpcRequestMap["attachments:add"];
      const attachment: Attachment = {
        id: generateId("attachment"),
        submissionId,
        filename: `Evidence_${submissionId}.pdf`,
        filePath: `mock://attachment-${submissionId}`,
        mimeType: "application/pdf",
        sizeBytes: 102400,
        uploadedAt: nowIso()
      };
      updateData((data) => {
        data.attachments.push(attachment);
      });
      return { ok: true, data: attachment } as IpcResponseMap[C];
    }

    if (channel === "attachments:list") {
      requireMockSession((payload as IpcRequestMap["attachments:list"]).sessionId);
      const { submissionId } = payload as IpcRequestMap["attachments:list"];
      return {
        ok: true,
        data: loadMockData().attachments.filter((item) => item.submissionId === submissionId)
      } as IpcResponseMap[C];
    }

    if (channel === "attachments:dataUrl") {
      requireMockSession((payload as IpcRequestMap["attachments:dataUrl"]).sessionId);
      const { attachmentId } = payload as IpcRequestMap["attachments:dataUrl"];
      const attachment = loadMockData().attachments.find((item) => item.id === attachmentId);
      if (!attachment) {
        return { ok: false, error: "Attachment not found" } as IpcResponseMap[C];
      }
      return {
        ok: true,
        data: {
          filename: attachment.filename,
          dataUrl: buildMockDocumentDataUrl(attachment.filename, "Mock Attachment")
        }
      } as IpcResponseMap[C];
    }

    if (channel === "waivers:attachments:add") {
      const session = requireMockSession((payload as IpcRequestMap["waivers:attachments:add"]).sessionId);
      assertRole(session, ["BorrowerReporter", "Admin", "LenderOps"]);
      const { waiverId } = payload as IpcRequestMap["waivers:attachments:add"];
      updateData((data) => {
        data.waiverAttachments.unshift({
          id: generateId("waiver-attachment"),
          submissionId: waiverId,
          filename: "Waiver_Evidence.pdf",
          filePath: `mock://waiver-${waiverId}`,
          mimeType: "application/pdf",
          sizeBytes: 102400,
          uploadedAt: nowIso()
        });
      });
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "waivers:attachments:list") {
      requireMockSession((payload as IpcRequestMap["waivers:attachments:list"]).sessionId);
      const { waiverId } = payload as IpcRequestMap["waivers:attachments:list"];
      return {
        ok: true,
        data: loadMockData().waiverAttachments.filter((item) => item.submissionId === waiverId)
      } as IpcResponseMap[C];
    }

    if (channel === "waivers:attachments:dataUrl") {
      requireMockSession((payload as IpcRequestMap["waivers:attachments:dataUrl"]).sessionId);
      const { attachmentId } = payload as IpcRequestMap["waivers:attachments:dataUrl"];
      const attachment = loadMockData().waiverAttachments.find((item) => item.id === attachmentId);
      if (!attachment) {
        return { ok: false, error: "Attachment not found" } as IpcResponseMap[C];
      }
      return {
        ok: true,
        data: {
          filename: attachment.filename,
          dataUrl: buildMockDocumentDataUrl(attachment.filename, "Mock Waiver Attachment")
        }
      } as IpcResponseMap[C];
    }

    if (channel === "waivers:list") {
      requireMockSession((payload as IpcRequestMap["waivers:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["waivers:list"];
      return { ok: true, data: loadMockData().waivers.filter((item) => item.loanId === loanId) } as IpcResponseMap[C];
    }

    if (channel === "waivers:request") {
      const session = requireMockSession((payload as IpcRequestMap["waivers:request"]).sessionId);
      assertRole(session, ["BorrowerReporter", "Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["waivers:request"];
      const waiver: Waiver = {
        id: generateId("waiver"),
        loanId: input.loanId,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        reason: input.reason,
        requestedBy: session.user.id,
        status: "Requested",
        decidedBy: null,
        decidedAt: null,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        proposedRemedyDate: input.proposedRemedyDate ?? null,
        decisionNote: null,
        conditions: input.conditions ?? null,
        expiryDate: input.expiryDate ?? null
      };
      updateData((data) => {
        data.waivers.push(waiver);
      });
      return { ok: true, data: waiver } as IpcResponseMap[C];
    }

    if (channel === "waivers:decide") {
      const session = requireMockSession((payload as IpcRequestMap["waivers:decide"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { input } = payload as IpcRequestMap["waivers:decide"];
      const updated = updateData((data) => {
        const waiver = data.waivers.find((item) => item.id === input.waiverId);
        if (!waiver) {
          throw new Error("Waiver not found");
        }
        waiver.status = input.status;
        waiver.decidedBy = session.user.id;
        waiver.decidedAt = nowIso();
        waiver.decisionNote = input.decisionNote ?? null;
        waiver.conditions = input.conditions ?? null;
        waiver.expiryDate = input.expiryDate ?? null;
        return waiver;
      });
      return { ok: true, data: updated } as IpcResponseMap[C];
    }

    if (channel === "audit:list") {
      requireMockSession((payload as IpcRequestMap["audit:list"]).sessionId);
      const { loanId } = payload as IpcRequestMap["audit:list"];
      const data = loadMockData();
      return {
        ok: true,
        data: data.auditEvents.filter((event) => event.entityId === loanId || event.entityType === "loan")
      } as IpcResponseMap[C];
    }

    if (channel === "exports:csv") {
      requireMockSession((payload as IpcRequestMap["exports:csv"]).sessionId);
      const { loanId } = payload as IpcRequestMap["exports:csv"];
      const path = `/tmp/covenantpulse/${loanId}-obligations.csv`;
      updateData((data) => {
        data.exportHistory.unshift({
          id: generateId("export"),
          loanId,
          exportType: "CSV",
          filePath: path,
          createdBy: getMockSession()?.user.id ?? "system",
          createdAt: nowIso()
        });
      });
      return { ok: true, data: { path } } as IpcResponseMap[C];
    }

    if (channel === "exports:pdf") {
      requireMockSession((payload as IpcRequestMap["exports:pdf"]).sessionId);
      const { loanId } = payload as IpcRequestMap["exports:pdf"];
      const path = `/tmp/covenantpulse/${loanId}-summary.pdf`;
      updateData((data) => {
        data.exportHistory.unshift({
          id: generateId("export"),
          loanId,
          exportType: "PDF",
          filePath: path,
          createdBy: getMockSession()?.user.id ?? "system",
          createdAt: nowIso()
        });
      });
      return { ok: true, data: { path } } as IpcResponseMap[C];
    }

    if (channel === "exports:history") {
      requireMockSession((payload as IpcRequestMap["exports:history"]).sessionId);
      const { loanId } = payload as IpcRequestMap["exports:history"];
      const data = loadMockData();
      const history = loanId ? data.exportHistory.filter((item) => item.loanId === loanId) : data.exportHistory;
      return { ok: true, data: history } as IpcResponseMap[C];
    }

    if (channel === "exports:openFolder") {
      requireMockSession((payload as IpcRequestMap["exports:openFolder"]).sessionId);
      return { ok: true, data: { ok: true } } as IpcResponseMap[C];
    }

    if (channel === "interop:export") {
      requireMockSession((payload as IpcRequestMap["interop:export"]).sessionId);
      const { input } = payload as IpcRequestMap["interop:export"];
      const path = `/tmp/covenantpulse/${input.loanId}-schema.json`;
      updateData((data) => {
        data.exportHistory.unshift({
          id: generateId("export"),
          loanId: input.loanId,
          exportType: "JSON",
          filePath: path,
          createdBy: getMockSession()?.user.id ?? "system",
          createdAt: nowIso()
        });
      });
      return { ok: true, data: { path } } as IpcResponseMap[C];
    }

    if (channel === "interop:previewImport") {
      requireMockSession((payload as IpcRequestMap["interop:previewImport"]).sessionId);
      const schema: LoanObligationSchemaV01 = {
        meta: { schemaVersion: "0.1", exportedAt: nowIso(), appVersion: "0.0.1" },
        loan: {
          id: "import-loan-1",
          name: "Imported Demo Loan",
          borrowerName: "Imported Borrower",
          lenderName: "Imported Lender",
          currency: "USD",
          startDate: `${new Date().getFullYear()}-01-01`,
          status: "Active"
        },
        parties: [
          { id: "import-party-borrower", partyType: "Borrower", name: "Imported Borrower", contactEmail: null },
          { id: "import-party-lender", partyType: "Lender", name: "Imported Lender", contactEmail: null }
        ],
        documents: [
          { id: "import-doc", filename: "Imported Agreement.pdf", sha256: "import-sha", uploadedAt: nowIso() }
        ],
        clauses: [
          {
            id: "import-clause-1",
            type: "Obligation",
            title: "Quarterly Financial Statements",
            snippet: "Borrower shall deliver quarterly financials within 45 days.",
            page: 3,
            tags: ["financials"],
            sourceDocumentId: "import-doc"
          }
        ],
        obligations: [
          {
            id: "import-obl-1",
            title: "Quarterly Financial Statements",
            description: "Deliver quarterly financials within 45 days of quarter end.",
            frequency: "Quarterly",
            dueRule: { type: "after_period_end", daysAfter: 45, period: "Quarter" },
            ownerParty: "Borrower",
            severity: "High",
            status: "Active",
            sourceClauseId: "import-clause-1",
            createdAt: nowIso()
          }
        ],
        obligationInstances: [
          {
            id: "import-inst-1",
            obligationId: "import-obl-1",
            periodStart: `${new Date().getFullYear()}-01-01`,
            periodEnd: `${new Date().getFullYear()}-03-31`,
            dueDate: `${new Date().getFullYear()}-05-15`,
            status: "Pending"
          }
        ],
        formulas: [
          {
            id: "import-formula-1",
            key: "LEVERAGE_RATIO",
            name: "Leverage Ratio",
            expression: { type: "op", op: "/", left: { type: "var", key: "TotalDebt" }, right: { type: "var", key: "EBITDA" } },
            description: "Total Debt / EBITDA"
          }
        ],
        covenants: [
          {
            id: "import-cov-1",
            name: "Leverage Ratio",
            covenantType: "Ratio",
            formulaId: "import-formula-1",
            thresholdOp: "<=",
            thresholdValue: 4.0,
            frequency: "Quarterly",
            status: "Active",
            sourceClauseId: null
          }
        ],
        covenantResults: [
          {
            id: "import-covres-1",
            covenantId: "import-cov-1",
            periodStart: `${new Date().getFullYear()}-01-01`,
            periodEnd: `${new Date().getFullYear()}-03-31`,
            computedValue: 3.6,
            thresholdValue: 4.0,
            passFail: "Pass",
            computedAt: nowIso(),
            computedBy: "import-user",
            notes: "Imported sample"
          }
        ],
        waivers: []
      };
      return {
        ok: true,
        data: {
          summary: {
            loanName: schema.loan.name,
            parties: schema.parties.length,
            documents: schema.documents.length,
            clauses: schema.clauses.length,
            obligations: schema.obligations.length,
            covenants: schema.covenants.length
          },
          payload: schema
        }
      } as IpcResponseMap[C];
    }

    if (channel === "interop:import") {
      const session = requireMockSession((payload as IpcRequestMap["interop:import"]).sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const { schema } = payload as IpcRequestMap["interop:import"];
      const imported = schema as LoanObligationSchemaV01;
      const newLoanId = generateId("loan");
      updateData((data) => {
        data.loans.unshift({
          id: newLoanId,
          name: `${imported.loan.name} (Imported)`,
          borrowerName: imported.loan.borrowerName,
          lenderName: imported.loan.lenderName,
          currency: imported.loan.currency,
          startDate: imported.loan.startDate,
          status: "Active",
          createdAt: nowIso()
        });
        data.auditEvents.push({
          id: generateId("audit"),
          actorUserId: session.user.id,
          action: "IMPORT_SCHEMA",
          entityType: "loan",
          entityId: newLoanId,
          beforeJson: null,
          afterJson: JSON.stringify(imported.loan),
          createdAt: nowIso()
        });
      });
      return { ok: true, data: { loanId: newLoanId } } as IpcResponseMap[C];
    }

    return { ok: true, data: [] } as IpcResponseMap[C];
  } catch (err) {
    return { ok: false, error: (err as Error).message } as IpcResponseMap[C];
  }
}

export async function ipcInvoke<C extends IpcChannel>(
  channel: C,
  payload: IpcRequestMap[C]
): Promise<IpcResponseMap[C]> {
  if (!window.covenantApi?.invoke) {
    return mockInvoke(channel, payload);
  }
  return window.covenantApi.invoke(channel, payload) as Promise<IpcResponseMap[C]>;
}

export function unwrapResult<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error);
}
