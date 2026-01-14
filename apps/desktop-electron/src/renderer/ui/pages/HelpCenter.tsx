import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";

type RoleFilter = "Borrower" | "LenderOps" | "Admin" | "Auditor";

type StatusRow = {
  status: string;
  meaning: string;
  nextAction: string;
};

type FieldRow = {
  label: string;
  description: string;
};

type MistakeRow = {
  mistake: string;
  fix: string;
};

type HelpLink = {
  label: string;
  to: string;
  requiresLoan?: boolean;
};

type HelpTopic = {
  id: string;
  title: string;
  roles: RoleFilter[];
  what: string;
  why: string;
  when: string;
  who: string;
  steps: Record<RoleFilter | "default", string[]>;
  fields: FieldRow[];
  statuses: StatusRow[];
  mistakes: MistakeRow[];
  example: string;
  links: HelpLink[];
  glossary?: Array<{
    term: string;
    plain: string;
    appMeaning: string;
    example: string;
    where: string;
  }>;
};

const helpTopics: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting Started (First 5 minutes)",
    roles: ["Borrower", "LenderOps", "Admin", "Auditor"],
    what: "A short, guided path to create or open a loan and see the full compliance workflow.",
    why: "It prevents missed steps and ensures the dashboard reflects real obligations, covenants, and reviews.",
    when: "Use this on your first login or when starting a new loan.",
    who: "All roles, with Admin/Lender Ops creating the initial loan.",
    steps: {
      default: [
        "Go to Loans -> click “New Loan”.",
        "Fill Loan name, Borrower, Lender, Currency, Start date, Status -> click “Save Loan”.",
        "Select the loan from the sidebar “Current Loan” dropdown.",
        "Go to Documents -> click “Upload PDF” -> choose a file -> confirm upload.",
        "Go to Obligations -> click “Create Obligation” -> fill frequency + due rule -> save.",
        "Go to Covenants -> click “Create Covenant” -> choose formula + threshold -> save.",
        "Go to Timeline -> confirm schedule instances appear.",
        "Borrower: go to Submissions -> New Submission -> enter period + financials -> Submit.",
        "Lender Ops: go to Review Queue -> open submission -> Approve/Reject.",
        "Go to Exports -> Export PDF compliance pack.",
        "If you can see counts on Dashboard tiles, you’re set."
      ],
      Borrower: [
        "Ask Admin/Lender Ops to create the loan and upload the agreement.",
        "Select the loan from the sidebar “Current Loan” dropdown.",
        "Go to Submissions -> New Submission -> enter period + financials -> Submit.",
        "Check Submissions tab for status changes."
      ]
    },
    fields: [
      { label: "Loan name", description: "Short label used in all tables and exports." },
      { label: "Borrower", description: "Borrowing entity name." },
      { label: "Lender", description: "Lender or agent name." },
      { label: "Currency", description: "Base currency for reporting." },
      { label: "Start date", description: "Loan effective date for schedules." },
      { label: "Status", description: "Draft, Active, or Closed." }
    ],
    statuses: [
      { status: "Draft", meaning: "Loan is not yet active.", nextAction: "Finish setup and mark Active." },
      { status: "Active", meaning: "Loan is in monitoring.", nextAction: "Track obligations and covenants." },
      { status: "Closed", meaning: "Loan is completed.", nextAction: "Export final compliance pack if needed." }
    ],
    mistakes: [
      { mistake: "Loan doesn’t appear after saving.", fix: "Refresh Loans page and check filters." },
      { mistake: "Dashboard is empty.", fix: "Add obligations and generate schedule instances." },
      { mistake: "Upload button does nothing.", fix: "Ensure a loan is selected and try again." }
    ],
    example:
      "Admin creates “Acme Manufacturing Term Loan”, uploads the agreement, adds quarterly statements and leverage covenant, borrower submits Q1 financials, lender approves, export pack is generated.",
    links: [
      { label: "Loans", to: "/loans" },
      { label: "Documents", to: "/loans/:loanId?tab=Documents", requiresLoan: true },
      { label: "Obligations", to: "/loans/:loanId?tab=Obligations", requiresLoan: true },
      { label: "Covenants", to: "/loans/:loanId?tab=Covenants", requiresLoan: true },
      { label: "Submissions", to: "/submissions?loanId=:loanId", requiresLoan: true },
      { label: "Review Queue", to: "/review?loanId=:loanId", requiresLoan: true },
      { label: "Exports", to: "/exports?loanId=:loanId", requiresLoan: true }
    ]
  },
  {
    id: "glossary",
    title: "Glossary (Key Terms)",
    roles: ["Borrower", "LenderOps", "Admin", "Auditor"],
    what: "Plain-English definitions of compliance terms used in the app.",
    why: "Consistent terminology avoids misunderstandings between borrower and lender teams.",
    when: "Use this whenever a term is unclear or when training new users.",
    who: "All roles.",
    steps: {
      default: [
        "Use the search bar to find a term.",
        "Read the plain definition and the “in this app” meaning.",
        "Use the “where to find it” link to open the screen."
      ]
    },
    fields: [
      { label: "Plain definition", description: "Short meaning in banking language." },
      { label: "In this app", description: "How the system represents the term." },
      { label: "Example", description: "Concrete example from a loan." },
      { label: "Where to find it", description: "Which screen or tab displays it." }
    ],
    statuses: [
      { status: "N/A", meaning: "Glossary terms have no status.", nextAction: "Use linked screens for actions." }
    ],
    mistakes: [
      { mistake: "Mixing up obligations and covenants.", fix: "Obligations are deliverables; covenants are ratios." },
      { mistake: "Assuming a breach equals a default.", fix: "Breaches can be waived or cured." },
      { mistake: "Submitting without evidence.", fix: "Attach files to support the submission." }
    ],
    example:
      "A borrower sees “breach” and confirms it means a covenant test failed, not an immediate acceleration.",
    links: [
      { label: "Dashboard", to: "/" },
      { label: "Loans", to: "/loans" }
    ],
    glossary: [
      {
        term: "Covenant",
        plain: "A financial promise tested by a ratio or threshold.",
        appMeaning: "Defined under Covenants with formulas and thresholds.",
        example: "Leverage Ratio <= 3.5x.",
        where: "Loan -> Covenants tab."
      },
      {
        term: "Obligation",
        plain: "A required deliverable or action by a specific date.",
        appMeaning: "Tracked in Obligations and scheduled instances.",
        example: "Quarterly financials due 45 days after quarter end.",
        where: "Loan -> Obligations tab."
      },
      {
        term: "Covenant breach",
        plain: "A covenant test fails against its threshold.",
        appMeaning: "Shown in Covenant Results with Pass/Fail.",
        example: "Interest Coverage below 2.0x.",
        where: "Loan -> Overview / Covenants."
      },
      {
        term: "Submission",
        plain: "Borrower package of inputs and files for a period.",
        appMeaning: "Created in Submissions and reviewed in Review Queue.",
        example: "Q2 financial submission with attachments.",
        where: "Submissions page."
      },
      {
        term: "Review Queue",
        plain: "Lender decision queue for submissions.",
        appMeaning: "Shows Submitted/UnderReview items.",
        example: "Lender approves Q2 submission.",
        where: "Review Queue page."
      },
      {
        term: "Waiver",
        plain: "Formal permission to excuse a breach or delay.",
        appMeaning: "Tracked in Waivers with reason and expiry.",
        example: "Temporary waiver for leverage spike.",
        where: "Waivers page."
      },
      {
        term: "Compliance Pack",
        plain: "Export bundle for audit and reporting.",
        appMeaning: "PDF with obligations, covenants, waivers.",
        example: "Annual compliance pack PDF.",
        where: "Exports page."
      },
      {
        term: "Evidence Tagging",
        plain: "Pinpointing a document snippet with page number.",
        appMeaning: "Tags support obligations/covenants/green assessment.",
        example: "Page 12 snippet for energy efficiency.",
        where: "Documents or Green Lending Check tab."
      },
      {
        term: "Green Loan / SLL",
        plain: "Green: use-of-proceeds; SLL: KPI-linked incentives.",
        appMeaning: "Captured in Green Lending Check inputs.",
        example: "Energy efficiency KPI target at 15%.",
        where: "Loan -> Green Lending Check tab."
      }
    ]
  },
  {
    id: "dashboard",
    title: "Dashboard",
    roles: ["Borrower", "LenderOps", "Admin", "Auditor"],
    what: "A portfolio view of alerts, due dates, reviews, breaches, waivers, and green status.",
    why: "It helps teams prioritize the highest-risk items first.",
    when: "Use daily to scan upcoming deadlines and review workload.",
    who: "All roles (read-only for borrowers/auditors).",
    steps: {
      default: [
        "Open Dashboard from the sidebar.",
        "Click any widget to jump to the relevant list.",
        "Scan the Loan Alerts table to prioritize attention."
      ]
    },
    fields: [
      { label: "Due Soon", description: "Obligations due in the next 14 days." },
      { label: "Overdue", description: "Obligations past due date." },
      { label: "Awaiting Review", description: "Submissions needing lender decision." },
      { label: "Breaches", description: "Latest covenant tests that failed." },
      { label: "Pending Waivers", description: "Waivers awaiting decision." },
      { label: "Green Status", description: "Latest Green/Transitional/Not Green verdicts." }
    ],
    statuses: [
      { status: "Pending", meaning: "Action is expected soon.", nextAction: "Open the linked list and review." },
      { status: "Overdue", meaning: "Deadline missed.", nextAction: "Request evidence or waiver." }
    ],
    mistakes: [
      { mistake: "Dashboard shows zeros.", fix: "Create obligations and generate schedule instances." },
      { mistake: "No green status visible.", fix: "Run Green Lending Check on the loan." },
      { mistake: "Wrong counts.", fix: "Confirm you are viewing the correct role/loan." }
    ],
    example:
      "Lender Ops sees 2 Overdue items and clicks to open the loan, then requests evidence.",
    links: [
      { label: "Dashboard", to: "/" },
      { label: "Loans", to: "/loans" }
    ]
  },
  {
    id: "loans",
    title: "Loans",
    roles: ["LenderOps", "Admin"],
    what: "The master list of loan workspaces and borrower/lender details.",
    why: "Every obligation and covenant is anchored to a loan record.",
    when: "Create a loan at onboarding or when a new deal closes.",
    who: "Admin and Lender Ops.",
    steps: {
      default: [
        "Go to Loans -> click “New Loan”.",
        "Fill the required fields and click “Save Loan”.",
        "Select the loan in the sidebar to continue."
      ]
    },
    fields: [
      { label: "Loan name", description: "Unique loan label." },
      { label: "Borrower", description: "Legal borrower entity." },
      { label: "Lender", description: "Lender or agent." },
      { label: "Currency", description: "Base currency used in reports." },
      { label: "Status", description: "Draft, Active, or Closed." }
    ],
    statuses: [
      { status: "Draft", meaning: "Setup not complete.", nextAction: "Add obligations/covenants." },
      { status: "Active", meaning: "Compliance tracking live.", nextAction: "Monitor dashboard." },
      { status: "Closed", meaning: "Monitoring ended.", nextAction: "Export final pack." }
    ],
    mistakes: [
      { mistake: "Loan not showing in list.", fix: "Clear filters or refresh page." },
      { mistake: "Loan created but not selected.", fix: "Use the sidebar Current Loan dropdown." },
      { mistake: "Status set to Closed too early.", fix: "Use Active until monitoring is complete." }
    ],
    example:
      "Admin creates “GreenBuild Sustainability-Linked Revolver” and sets status to Active.",
    links: [{ label: "Loans", to: "/loans" }]
  },
  {
    id: "documents",
    title: "Documents",
    roles: ["Borrower", "LenderOps", "Admin"],
    what: "The document library for loan agreements and evidence.",
    why: "Documents provide the authoritative source for obligations, covenants, and green evidence.",
    when: "Upload at onboarding, then tag evidence as updates arrive.",
    who: "Borrower can upload evidence; Lender Ops/Admin curate clauses.",
    steps: {
      default: [
        "Open a loan -> Documents tab.",
        "Click “Upload PDF” and select the agreement or evidence file.",
        "Use “Add Clause Reference” to tag page/snippet.",
        "Add Evidence Tags for green assessment."
      ]
    },
    fields: [
      { label: "Document", description: "Select the uploaded PDF." },
      { label: "Clause type", description: "Obligation, Covenant, Definition, or Other." },
      { label: "Page number", description: "Page in the PDF where the clause appears." },
      { label: "Snippet", description: "Copied text for traceability." },
      { label: "Tags", description: "Keywords to group clauses." }
    ],
    statuses: [
      { status: "Uploaded", meaning: "File is stored in app data.", nextAction: "Add clause/evidence tags." },
      { status: "Tagged", meaning: "Snippet has been referenced.", nextAction: "Link to obligations/covenants." }
    ],
    mistakes: [
      { mistake: "Uploaded the wrong file.", fix: "Upload the correct PDF; use filename to verify." },
      { mistake: "Missing page number.", fix: "Enter the page to preserve provenance." },
      { mistake: "Evidence not used in green score.", fix: "Add Evidence Tags in Green Lending Check." }
    ],
    example:
      "Lender Ops uploads the agreement and tags the leverage covenant on page 18.",
    links: [{ label: "Documents Tab", to: "/loans/:loanId?tab=Documents", requiresLoan: true }]
  },
  {
    id: "obligations",
    title: "Obligations",
    roles: ["LenderOps", "Admin"],
    what: "Deliverables that the borrower must provide on a schedule.",
    why: "Structured obligations prevent missed deadlines and create a clear audit trail.",
    when: "After document upload and clause review.",
    who: "Lender Ops/Admin define obligations; Borrower submits evidence.",
    steps: {
      default: [
        "Open a loan -> Obligations tab -> click “Create Obligation”.",
        "Select frequency and due rule (e.g., 45 days after quarter end).",
        "Save and confirm schedule instances appear in Timeline."
      ]
    },
    fields: [
      { label: "Frequency", description: "Once, Monthly, Quarterly, Annually, Adhoc." },
      { label: "Due rule", description: "Template for calculating due dates." },
      { label: "Owner", description: "Borrower or Lender." },
      { label: "Severity", description: "Low, Medium, High." }
    ],
    statuses: [
      { status: "Pending", meaning: "Upcoming obligation instance.", nextAction: "Borrower to submit evidence." },
      { status: "Submitted", meaning: "Evidence submitted.", nextAction: "Lender review." },
      { status: "Approved", meaning: "Accepted by lender.", nextAction: "No action." },
      { status: "Overdue", meaning: "Past due date.", nextAction: "Request evidence or waiver." }
    ],
    mistakes: [
      { mistake: "No schedule generated.", fix: "Ensure frequency is not Adhoc and save." },
      { mistake: "Wrong due date.", fix: "Adjust due rule or edit instance date." },
      { mistake: "Obligation not visible in timeline.", fix: "Refresh and confirm instances created." }
    ],
    example:
      "Quarterly financial statements due 45 days after quarter end are created and scheduled.",
    links: [
      { label: "Obligations Tab", to: "/loans/:loanId?tab=Obligations", requiresLoan: true },
      { label: "Timeline", to: "/loans/:loanId?tab=Timeline", requiresLoan: true }
    ]
  },
  {
    id: "covenants",
    title: "Covenants",
    roles: ["LenderOps", "Admin"],
    what: "Financial tests such as leverage or interest coverage.",
    why: "Automated covenant testing highlights breaches early.",
    when: "After obligations are defined and formulas selected.",
    who: "Lender Ops/Admin configure; Borrower supplies inputs.",
    steps: {
      default: [
        "Open a loan -> Covenants tab -> click “Create Covenant”.",
        "Select formula template (Leverage or Interest Coverage).",
        "Set threshold operator and value -> save."
      ]
    },
    fields: [
      { label: "Formula", description: "Leverage Ratio or Interest Coverage." },
      { label: "Threshold operator", description: "<=, >=, <, >, =." },
      { label: "Threshold value", description: "Numeric limit for the covenant." },
      { label: "Frequency", description: "Quarterly or Annual test frequency." }
    ],
    statuses: [
      { status: "Pass", meaning: "Computed value meets threshold.", nextAction: "No action." },
      { status: "Fail", meaning: "Breach detected.", nextAction: "Consider waiver or remedy." }
    ],
    mistakes: [
      { mistake: "No results showing.", fix: "Submit financial inputs for the period." },
      { mistake: "Wrong formula.", fix: "Edit covenant to select correct template." },
      { mistake: "Threshold mismatch with term sheet.", fix: "Run Consistency Check and update." }
    ],
    example:
      "Leverage Ratio covenant set to <= 3.5x; Q1 submission shows 3.8x (Fail).",
    links: [{ label: "Covenants Tab", to: "/loans/:loanId?tab=Covenants", requiresLoan: true }]
  },
  {
    id: "submissions",
    title: "Submissions (Borrower flow)",
    roles: ["Borrower", "LenderOps", "Admin"],
    what: "A borrower package of financial inputs and evidence for a period.",
    why: "Standardizes reporting and ensures lender review is auditable.",
    when: "Every reporting period or when an obligation is due.",
    who: "Borrower Reporter creates; Lender Ops reviews.",
    steps: {
      Borrower: [
        "Go to Submissions -> New Submission.",
        "Select loan and period (e.g., Q1 2026).",
        "Enter Total Debt, EBITDA, Interest Expense.",
        "Upload attachments and click Submit."
      ],
      default: [
        "Open Submissions and create a new submission.",
        "Attach evidence files and submit for review."
      ]
    },
    fields: [
      { label: "Period start/end", description: "Reporting period dates." },
      { label: "Total Debt", description: "Total outstanding debt for the period." },
      { label: "EBITDA", description: "Earnings before interest, taxes, depreciation, amortization." },
      { label: "Interest Expense", description: "Interest costs for the period." },
      { label: "Attachments", description: "PDF/XLSX evidence files." }
    ],
    statuses: [
      { status: "Draft", meaning: "Saved but not submitted.", nextAction: "Attach files and submit." },
      { status: "Submitted", meaning: "Sent to lender.", nextAction: "Wait for review." },
      { status: "UnderReview", meaning: "Lender reviewing.", nextAction: "Respond if asked." },
      { status: "Approved", meaning: "Accepted.", nextAction: "No action." },
      { status: "Rejected", meaning: "Needs changes.", nextAction: "Update and resubmit." }
    ],
    mistakes: [
      { mistake: "Submission rejected for missing evidence.", fix: "Attach files before submit." },
      { mistake: "Wrong period dates.", fix: "Use quarter-end dates from agreement." },
      { mistake: "Metrics entered as text.", fix: "Use numeric values only." }
    ],
    example:
      "Borrower submits Q2 financials with EBITDA 8.5m and attaches the quarterly report PDF.",
    links: [{ label: "Submissions", to: "/submissions?loanId=:loanId", requiresLoan: true }]
  },
  {
    id: "review-queue",
    title: "Review Queue (Lender flow)",
    roles: ["LenderOps", "Admin"],
    what: "A list of borrower submissions waiting for lender decision.",
    why: "Centralizes approvals and records the audit trail.",
    when: "Whenever submissions arrive.",
    who: "Lender Ops and Admin.",
    steps: {
      default: [
        "Go to Review Queue.",
        "Open a submission and review evidence.",
        "Approve or Reject with notes."
      ]
    },
    fields: [
      { label: "Review notes", description: "Reason for approval or rejection." },
      { label: "Attachments preview", description: "Evidence files for validation." }
    ],
    statuses: [
      { status: "Submitted", meaning: "Awaiting review.", nextAction: "Open and review." },
      { status: "UnderReview", meaning: "Being reviewed.", nextAction: "Approve or reject." },
      { status: "Approved", meaning: "Accepted.", nextAction: "No action." },
      { status: "Rejected", meaning: "Requires changes.", nextAction: "Borrower resubmits." }
    ],
    mistakes: [
      { mistake: "Approval without notes.", fix: "Add a brief decision note." },
      { mistake: "Reviewing wrong loan.", fix: "Use the loan filter or sidebar current loan." },
      { mistake: "Ignoring covenant failures.", fix: "Flag breach and consider waiver." }
    ],
    example:
      "Lender Ops reviews Q1 submission, sees leverage breach, rejects with a note.",
    links: [{ label: "Review Queue", to: "/review?loanId=:loanId", requiresLoan: true }]
  },
  {
    id: "waivers",
    title: "Waivers",
    roles: ["Borrower", "LenderOps", "Admin"],
    what: "A formal lender exception for a breach or late obligation.",
    why: "Keeps exceptions documented and time-bound.",
    when: "A covenant breach occurs or an obligation is overdue.",
    who: "Borrower requests; Lender Ops/Admin decides.",
    steps: {
      Borrower: [
        "Go to Waivers -> select loan.",
        "Set scope (Covenant or Obligation) and reason.",
        "Submit the request with attachments."
      ],
      default: [
        "Open Waivers and review pending requests.",
        "Approve or reject with conditions and expiry date."
      ]
    },
    fields: [
      { label: "Reason", description: "Why the waiver is requested." },
      { label: "Scope", description: "Covenant or Obligation." },
      { label: "Expiry date", description: "How long the waiver is valid." },
      { label: "Conditions", description: "Reporting or remediation requirements." }
    ],
    statuses: [
      { status: "Requested", meaning: "Pending lender decision.", nextAction: "Review and decide." },
      { status: "Approved", meaning: "Waiver granted.", nextAction: "Monitor conditions." },
      { status: "Rejected", meaning: "Waiver denied.", nextAction: "Borrower remedial action." }
    ],
    mistakes: [
      { mistake: "Missing supporting evidence.", fix: "Attach documents before submitting." },
      { mistake: "No expiry date set.", fix: "Add an expiry to keep it time-bound." },
      { mistake: "Waiver not reflected in exports.", fix: "Re-export compliance pack." }
    ],
    example:
      "Borrower breached leverage covenant; lender grants waiver until next quarter.",
    links: [{ label: "Waivers", to: "/waivers?loanId=:loanId", requiresLoan: true }]
  },
  {
    id: "green-lending",
    title: "Green Lending Check",
    roles: ["Borrower", "LenderOps", "Admin"],
    what: "An explainable score (0–100) that determines Green / Transitional / Not Green.",
    why: "Supports greener lending decisions with transparent evidence and exclusions.",
    when: "Run after upload of sustainability clauses or before credit approval.",
    who: "Lender Ops/Admin run; Borrower can view and supply evidence.",
    steps: {
      default: [
        "Open a loan -> Green Lending Check tab.",
        "Select Use-of-Proceeds categories.",
        "Enter KPI targets (percent improvements).",
        "Choose verification and reporting cadence.",
        "Mark exclusions if applicable.",
        "Click “Run Assessment” and review score + breakdown."
      ]
    },
    fields: [
      { label: "Use-of-Proceeds", description: "Categories like Green Buildings or Renewable Energy." },
      { label: "KPI targets", description: "Percent improvements vs baseline." },
      { label: "Verification", description: "None, Internal, Third-party." },
      { label: "Reporting cadence", description: "Monthly/Quarterly/Annual." },
      { label: "Exclusions", description: "Red flags like coal or oil expansion." },
      { label: "Evidence tags", description: "Document snippets supporting claims." }
    ],
    statuses: [
      { status: "Green", meaning: "Score >= 70 and no red flag.", nextAction: "Proceed with green labeling." },
      { status: "Transitional", meaning: "Score 50–69.", nextAction: "Improve KPIs or evidence." },
      { status: "Not Green", meaning: "Score < 50 or red flag.", nextAction: "Reclassify or adjust scope." }
    ],
    mistakes: [
      { mistake: "No score appears.", fix: "Complete required fields and click Run Assessment." },
      { mistake: "Green verdict despite exclusion.", fix: "Mark exclusions to trigger Not Green." },
      { mistake: "Missing evidence tags.", fix: "Add tags from Documents to justify claims." }
    ],
    example:
      "GreenBuild Sustainability-Linked Revolver scores 78 (Green) with green building KPIs; a fossil expansion loan is flagged as Not Green due to exclusions.",
    links: [{ label: "Green Lending Check", to: "/loans/:loanId?tab=Green%20Lending%20Check", requiresLoan: true }]
  },
  {
    id: "exports",
    title: "Exports",
    roles: ["LenderOps", "Admin", "Auditor"],
    what: "Generate CSV and PDF compliance packs, plus JSON interoperability exports.",
    why: "Provides audit-ready reporting with file output to a chosen folder.",
    when: "At month-end, quarter-end, or during audit requests.",
    who: "Lender Ops/Admin/Auditor.",
    steps: {
      default: [
        "Open Exports -> select loan.",
        "Choose export type (CSV/PDF/JSON).",
        "Click Export and pick a folder.",
        "Use Open Folder to confirm the file."
      ]
    },
    fields: [
      { label: "Export type", description: "CSV, PDF Compliance Pack, or JSON Schema." },
      { label: "Folder picker", description: "Choose where files are saved." },
      { label: "Include audit events", description: "Optional for JSON export." }
    ],
    statuses: [
      { status: "Completed", meaning: "File written to disk.", nextAction: "Open folder to verify." },
      { status: "Failed", meaning: "Export failed.", nextAction: "Check permissions and retry." }
    ],
    mistakes: [
      { mistake: "File not found.", fix: "Check the selected folder path." },
      { mistake: "No loan selected.", fix: "Choose a loan from the dropdown." },
      { mistake: "PDF missing green section.", fix: "Run Green Lending Check first." }
    ],
    example:
      "Auditor exports the compliance pack PDF and attaches it to the quarterly audit file.",
    links: [{ label: "Exports", to: "/exports?loanId=:loanId", requiresLoan: true }]
  },
  {
    id: "audit-trail",
    title: "Audit Trail",
    roles: ["LenderOps", "Admin", "Auditor"],
    what: "Immutable history of critical actions (create, approve, reject).",
    why: "Supports governance and compliance reviews.",
    when: "Use during audit or dispute resolution.",
    who: "Lender Ops/Admin/Auditor.",
    steps: {
      default: [
        "Open a loan -> Audit Trail tab.",
        "Scan recent actions and filter by entity.",
        "Export the compliance pack if needed."
      ]
    },
    fields: [
      { label: "Action", description: "Create, Update, Approve, Reject events." },
      { label: "Entity", description: "Loan, Obligation, Covenant, Submission." },
      { label: "Actor", description: "User who performed the action." },
      { label: "Timestamp", description: "When the action occurred." }
    ],
    statuses: [
      { status: "Logged", meaning: "Action recorded.", nextAction: "No action required." }
    ],
    mistakes: [
      { mistake: "Missing events.", fix: "Confirm actions were completed successfully." },
      { mistake: "Looking at wrong loan.", fix: "Select the loan in the sidebar." },
      { mistake: "Audit list too long.", fix: "Filter by entity or time range." }
    ],
    example:
      "Auditor confirms that a waiver approval was logged with timestamp and actor.",
    links: [{ label: "Audit Trail", to: "/loans/:loanId?tab=Audit%20Trail", requiresLoan: true }]
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    roles: ["Borrower", "LenderOps", "Admin", "Auditor"],
    what: "Common problems and the fastest fixes.",
    why: "Keeps the demo and daily work moving without delays.",
    when: "Use when something does not look right.",
    who: "All roles.",
    steps: {
      default: [
        "Identify the symptom.",
        "Use the fixes below.",
        "If still blocked, reload the app and re-check the loan selection."
      ]
    },
    fields: [
      { label: "Issue", description: "Problem you see in the UI." },
      { label: "Fix", description: "Immediate action to resolve it." }
    ],
    statuses: [
      { status: "N/A", meaning: "Troubleshooting has no status.", nextAction: "Return to the workflow." }
    ],
    mistakes: [
      { mistake: "Created a loan but can’t see it.", fix: "Clear filters and refresh; check Current Loan dropdown." },
      { mistake: "Dashboard empty.", fix: "Add obligations and generate schedule instances." },
      { mistake: "Green tab missing.", fix: "Select a loan and open Green Lending Check tab." }
    ],
    example:
      "User cannot find a new loan; a refresh and filter reset shows it immediately.",
    links: [{ label: "Help Center", to: "/help" }]
  }
];

function mapUserRole(role: string | undefined): RoleFilter {
  if (role === "BorrowerReporter") return "Borrower";
  if (role === "LenderOps") return "LenderOps";
  if (role === "Admin") return "Admin";
  if (role === "Auditor") return "Auditor";
  return "LenderOps";
}

function topicToSearchableText(topic: HelpTopic): string {
  const parts: string[] = [
    topic.title,
    topic.what,
    topic.why,
    topic.when,
    topic.who,
    topic.example,
    topic.roles.join(" "),
    ...Object.values(topic.steps).flat(),
    ...topic.fields.map((item) => `${item.label} ${item.description}`),
    ...topic.statuses.map((row) => `${row.status} ${row.meaning} ${row.nextAction}`),
    ...topic.mistakes.map((row) => `${row.mistake} ${row.fix}`)
  ];
  if (topic.glossary) {
    topic.glossary.forEach((term) => {
      parts.push(`${term.term} ${term.plain} ${term.appMeaning} ${term.example} ${term.where}`);
    });
  }
  return parts.join(" ").toLowerCase();
}

export default function HelpCenter() {
  const { user } = useAuth();
  const { currentLoanId } = useCurrentLoan();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(mapUserRole(user?.role));

  const filteredTopics = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return helpTopics.filter((topic) => {
      if (!topic.roles.includes(roleFilter)) {
        return false;
      }
      if (!lower) {
        return true;
      }
      return topicToSearchableText(topic).includes(lower);
    });
  }, [query, roleFilter]);

  const resolveLink = (link: HelpLink) => {
    if (link.requiresLoan && !currentLoanId) {
      return "/loans";
    }
    if (!currentLoanId) {
      return link.to;
    }
    return link.to.replace(":loanId", currentLoanId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help Center"
        subtitle="Step-by-step guidance for every workflow."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Search (covenant, waiver, breach, green...)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {(["Borrower", "LenderOps", "Admin", "Auditor"] as RoleFilter[]).map((role) => (
                <button
                  key={role}
                  className={`rounded-full px-3 py-1 text-xs ${
                    roleFilter === role ? "bg-ink text-white" : "bg-white text-slate-600"
                  }`}
                  onClick={() => setRoleFilter(role)}
                >
                  {role === "LenderOps" ? "Lender Ops" : role}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Contents</h3>
          <p className="text-xs text-slate-500">Filtered by role and search.</p>
          <div className="mt-4 space-y-2 text-sm">
            {filteredTopics.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block text-accent hover:underline">
                {section.title}
              </a>
            ))}
            {filteredTopics.length === 0 && (
              <p className="text-xs text-slate-500">No topics match your search.</p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {filteredTopics.map((topic) => {
            const steps = topic.steps[roleFilter] ?? topic.steps.default;
            const primaryLink = topic.links[0];
            return (
              <Card key={topic.id} className="p-6" id={topic.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{topic.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">Who uses it: {topic.who}</p>
                  </div>
                  {primaryLink && (
                    <Link to={resolveLink(primaryLink)}>
                      <Button variant="outline">Open this screen</Button>
                    </Link>
                  )}
                </div>

                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-700">1) What this is</p>
                    <p>{topic.what}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">2) Why it matters</p>
                    <p>{topic.why}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">3) When to use it</p>
                    <p>{topic.when}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">4) Who uses it</p>
                    <p>{topic.who}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">5) Step-by-step instructions</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">6) Inputs and fields explained</p>
                    <ul className="mt-2 space-y-1">
                      {topic.fields.map((field) => (
                        <li key={field.label}>
                          <span className="font-semibold text-ink">{field.label}:</span> {field.description}
                        </li>
                      ))}
                    </ul>
                    {topic.glossary && (
                      <div className="mt-3 space-y-2">
                        {topic.glossary.map((term) => (
                          <div key={term.term} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                            <p className="font-semibold text-ink">{term.term}</p>
                            <p>Plain: {term.plain}</p>
                            <p>In this app: {term.appMeaning}</p>
                            <p>Example: {term.example}</p>
                            <p>Where: {term.where}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">7) Statuses explained</p>
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Meaning</th>
                            <th className="px-3 py-2">Next action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topic.statuses.map((row) => (
                            <tr key={row.status} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-semibold text-ink">{row.status}</td>
                              <td className="px-3 py-2">{row.meaning}</td>
                              <td className="px-3 py-2">{row.nextAction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">8) Common mistakes + fixes</p>
                    <ul className="mt-2 space-y-1">
                      {topic.mistakes.map((row) => (
                        <li key={row.mistake}>
                          <span className="font-semibold text-ink">{row.mistake}</span> — {row.fix}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">9) Example scenario</p>
                    <p>{topic.example}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">10) Related links</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topic.links.map((link) => (
                        <Link key={link.label} to={resolveLink(link)}>
                          <Button variant="outline">{link.label}</Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
