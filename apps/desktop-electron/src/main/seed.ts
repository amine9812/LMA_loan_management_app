import fs from "fs";
import { createHash, randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import { hashPasswordSync } from "./auth";
import { ensureSamplePdf } from "./storage";
import { computeCovenant, generateSchedule } from "@covenantpulse/core";
import type { DueRule, TermSheetData } from "@covenantpulse/shared";

const nowIso = () => new Date().toISOString();

const buildDraftHtml = (params: {
  title: string;
  subtitle: string;
  sections: string[];
}): string => {
  const sectionHtml = params.sections
    .map((section) => `<section><p>${section}</p></section>`)
    .join("");
  return `<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<title>${params.title}</title>\n<style>\nbody { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }\nh1 { margin-bottom: 4px; }\nh2 { margin-top: 0; color: #64748b; font-weight: 500; }\nsection { margin-top: 16px; padding: 12px 0; border-top: 1px solid #e2e8f0; }\n</style>\n</head>\n<body>\n<h1>${params.title}</h1>\n<h2>${params.subtitle}</h2>\n${sectionHtml}\n</body>\n</html>`;
};

type SeedOptions = {
  resetDemoUsers?: boolean;
};

export async function seedDatabase(
  db: SqliteDatabase,
  storage?: { documentsDir: string },
  options?: SeedOptions
): Promise<"seeded" | "already"> {
  const seedUsers = [
    {
      name: "Admin User",
      email: "admin@example.com",
      role: "Admin",
      password: "Admin123!"
    },
    {
      name: "Lender Ops",
      email: "lender@example.com",
      role: "LenderOps",
      password: "Lender123!"
    },
    {
      name: "Borrower Reporter",
      email: "borrower@example.com",
      role: "BorrowerReporter",
      password: "Borrower123!"
    }
  ];

  const resetDemoUsers = options?.resetDemoUsers ?? false;

  const users = seedUsers.map((user) => {
    const existingUser = db
      .prepare("SELECT id, name, email, role FROM users WHERE email = ?")
      .get(user.email) as { id: string; name: string; email: string; role: string } | undefined;
    if (existingUser) {
      if (resetDemoUsers) {
        db.prepare("UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?").run(
          user.name,
          user.role,
          hashPasswordSync(user.password),
          existingUser.id
        );
        return { id: existingUser.id, name: user.name, email: user.email, role: user.role };
      }
      return { ...existingUser, role: existingUser.role as "Admin" | "LenderOps" | "BorrowerReporter" };
    }
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      user.name,
      user.email,
      hashPasswordSync(user.password),
      user.role,
      nowIso()
    );
    return { id, name: user.name, email: user.email, role: user.role };
  });

  const existing = db
    .prepare("SELECT COUNT(*) as count FROM loans WHERE name IN (?, ?)")
    .get("Acme Manufacturing Term Loan", "GreenBuild Sustainability-Linked Revolver") as {
    count: number;
  };
  if (existing.count > 0) {
    return "already";
  }

  const existingLeverage = db
    .prepare("SELECT id FROM formulas WHERE key = ?")
    .get("LEVERAGE_RATIO") as { id: string } | undefined;
  const existingInterest = db
    .prepare("SELECT id FROM formulas WHERE key = ?")
    .get("INTEREST_COVERAGE") as { id: string } | undefined;
  const formulaLeverageId = existingLeverage?.id ?? randomUUID();
  const formulaInterestId = existingInterest?.id ?? randomUUID();

  if (!existingLeverage) {
    db.prepare(
      "INSERT INTO formulas (id, key, name, expression_json, description) VALUES (?, ?, ?, ?, ?)"
    ).run(
      formulaLeverageId,
      "LEVERAGE_RATIO",
      "Leverage Ratio",
      JSON.stringify({
        type: "op",
        op: "/",
        left: { type: "var", key: "TotalDebt" },
        right: { type: "var", key: "EBITDA" }
      }),
      "Total Debt / EBITDA"
    );
  }

  if (!existingInterest) {
    db.prepare(
      "INSERT INTO formulas (id, key, name, expression_json, description) VALUES (?, ?, ?, ?, ?)"
    ).run(
      formulaInterestId,
      "INTEREST_COVERAGE",
      "Interest Coverage",
      JSON.stringify({
        type: "op",
        op: "/",
        left: { type: "var", key: "EBITDA" },
        right: { type: "var", key: "InterestExpense" }
      }),
      "EBITDA / Interest Expense"
    );
  }

  const currentYear = new Date().getFullYear();
  const loans = [
    {
      id: randomUUID(),
      name: "Acme Manufacturing Term Loan",
      borrowerName: "Acme Manufacturing",
      lenderName: "Atlas Capital",
      currency: "USD",
      startDate: `${currentYear}-01-01`,
      status: "Active"
    },
    {
      id: randomUUID(),
      name: "GreenBuild Sustainability-Linked Revolver",
      borrowerName: "GreenBuild Holdings",
      lenderName: "Evergreen Bank",
      currency: "USD",
      startDate: `${currentYear}-03-01`,
      status: "Active"
    }
  ];
  const loanDocumentIds = new Map<string, string>();
  const covenantIdsByLoan = new Map<string, { leverageId: string; interestId: string }>();
  const termSheetVersionIds = new Map<string, { v1: string; v2: string }>();
  const documentGroupIds = new Map<string, string>();
  const documentVersionIds = new Map<string, { v1: string; v2: string }>();
  const termSheetDataByLoan = new Map<string, { v1: TermSheetData; v2: TermSheetData }>();

  loans.forEach((loan) => {
    db.prepare(
      "INSERT INTO loans (id, name, borrower_name, lender_name, currency, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      loan.id,
      loan.name,
      loan.borrowerName,
      loan.lenderName,
      loan.currency,
      loan.startDate,
      loan.status,
      nowIso()
    );
  });

  loans.forEach((loan) => {
    db.prepare(
      "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), loan.id, "Borrower", loan.borrowerName, "finance@" + loan.borrowerName.toLowerCase().replace(/\s+/g, "") + ".com");
    db.prepare(
      "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), loan.id, "Lender", loan.lenderName, "ops@" + loan.lenderName.toLowerCase().replace(/\s+/g, "") + ".com");
  });

  if (storage) {
    for (const loan of loans) {
      const docId = randomUUID();
      const filename = loan.name.replace(/\s+/g, "_") + "_Agreement.pdf";
      const filePath = `${storage.documentsDir}/${docId}_${filename}`;
      await ensureSamplePdf({
        filePath,
        title: loan.name,
        subtitle: "Sample Loan Agreement"
      });
      const fileHash = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

      db.prepare(
        "INSERT INTO documents (id, loan_id, filename, file_path, sha256, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        docId,
        loan.id,
        filename,
        filePath,
        fileHash,
        users[0].id,
        nowIso()
      );
      loanDocumentIds.set(loan.id, docId);
    }
  }

  const obligationTemplates = [
    {
      title: "Quarterly Financial Statements",
      description: "Deliver quarterly financial statements within 45 days of quarter end.",
      frequency: "Quarterly",
      dueRule: { type: "after_period_end", daysAfter: 45, period: "Quarter" },
      severity: "High"
    },
    {
      title: "Annual Audited Statements",
      description: "Provide audited annual statements within 90 days of fiscal year end.",
      frequency: "Annually",
      dueRule: { type: "after_period_end", daysAfter: 90, period: "Year" },
      severity: "High"
    },
    {
      title: "Compliance Certificate",
      description: "Quarterly compliance certificate signed by CFO.",
      frequency: "Quarterly",
      dueRule: { type: "after_period_end", daysAfter: 60, period: "Quarter" },
      severity: "Med"
    },
    {
      title: "Insurance Certificate",
      description: "Maintain evidence of required insurance coverage.",
      frequency: "Annually",
      dueRule: { type: "fixed_date", month: 1, day: 31, note: "Annual insurance renewal" },
      severity: "Med"
    },
    {
      title: "Notice of Default",
      description: "Notify lender within 5 business days of any default event.",
      frequency: "Adhoc",
      dueRule: { type: "custom", description: "Due upon default event" },
      severity: "High"
    }
  ];

  loans.forEach((loan) => {
    obligationTemplates.forEach((template) => {
      const obligationId = randomUUID();
      db.prepare(
        "INSERT INTO obligations (id, loan_id, title, description, frequency, due_rule_json, owner_party, severity, status, source_clause_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        obligationId,
        loan.id,
        template.title,
        template.description,
        template.frequency,
        JSON.stringify(template.dueRule),
        "Borrower",
        template.severity,
        "Active",
        null,
        nowIso()
      );

      if (template.frequency !== "Adhoc") {
        const instances = generateSchedule({
          loanStartDate: loan.startDate,
          frequency: template.frequency as "Monthly" | "Quarterly" | "Annually",
          dueRule: template.dueRule as DueRule,
          monthsAhead: 12
        });

        instances.slice(0, 4).forEach((instance) => {
          db.prepare(
            "INSERT INTO obligation_instances (id, obligation_id, period_start, period_end, due_date, status, last_reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).run(
            randomUUID(),
            obligationId,
            instance.periodStart,
            instance.periodEnd,
            instance.dueDate,
            "Pending",
            null
          );
        });
      }
    });
  });

  loans.forEach((loan) => {
    const leverageId = randomUUID();
    const interestId = randomUUID();
    db.prepare(
      "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      leverageId,
      loan.id,
      "Leverage Ratio",
      "Ratio",
      formulaLeverageId,
      "<=",
      4.0,
      "Quarterly",
      null,
      "Active"
    );

    db.prepare(
      "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      interestId,
      loan.id,
      "Interest Coverage",
      "Ratio",
      formulaInterestId,
      ">=",
      2.0,
      "Quarterly",
      null,
      "Active"
    );
    covenantIdsByLoan.set(loan.id, { leverageId, interestId });
  });

  const templateSeeds = [
    {
      key: "def_ebitda",
      category: "Definitions",
      title: "EBITDA Definition",
      bodyText:
        "EBITDA means earnings before interest, taxes, depreciation, and amortization, as adjusted for {{EBITDAAdjustments}}.",
      placeholders: ["EBITDAAdjustments"]
    },
    {
      key: "reporting_quarterly",
      category: "Reporting",
      title: "Quarterly Financial Statements",
      bodyText:
        "Borrower shall deliver quarterly financial statements within {{DaysAfterPeriodEnd}} days after each fiscal quarter end.",
      placeholders: ["DaysAfterPeriodEnd"]
    },
    {
      key: "covenant_leverage",
      category: "Covenants",
      title: "Leverage Ratio Covenant",
      bodyText:
        "Borrower shall not permit the Leverage Ratio to exceed {{LeverageThreshold}}x as of any quarter end.",
      placeholders: ["LeverageThreshold"]
    },
    {
      key: "covenant_interest",
      category: "Covenants",
      title: "Interest Coverage Covenant",
      bodyText:
        "Borrower shall maintain an Interest Coverage Ratio of at least {{InterestCoverageThreshold}}x.",
      placeholders: ["InterestCoverageThreshold"]
    },
    {
      key: "notice_default",
      category: "Events of Default",
      title: "Notice of Default",
      bodyText:
        "Borrower shall notify the Lender within five business days of any event of default.",
      placeholders: []
    }
  ];
  templateSeeds.forEach((template) => {
    db.prepare(
      "INSERT INTO clause_templates (id, key, category, title, body_text, placeholders_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      template.key,
      template.category,
      template.title,
      template.bodyText,
      JSON.stringify(template.placeholders),
      users[0].id,
      nowIso(),
      nowIso()
    );
  });

  loans.forEach((loan) => {
    const baseTermSheet: TermSheetData = {
      facilityType: loan.name.includes("Revolver") ? "Revolving Credit Facility" : "Term Loan",
      commitmentAmount: loan.name.includes("Revolver") ? 30000000 : 25000000,
      marginBps: loan.name.includes("Revolver") ? 250 : 275,
      maturityDate: `${currentYear + 5}-12-31`,
      leverageThreshold: 4.0,
      interestCoverageThreshold: 2.0,
      reportingDaysAfterPeriodEnd: 45,
      ebitdaAdjustments: ["Non-cash charges", "Restructuring costs"]
    };
    const v1Data = baseTermSheet;
    const v2Data: TermSheetData = {
      ...baseTermSheet,
      leverageThreshold: 3.5,
      reportingDaysAfterPeriodEnd: 60
    };

    const v1Id = randomUUID();
    const v2Id = randomUUID();
    termSheetVersionIds.set(loan.id, { v1: v1Id, v2: v2Id });
    termSheetDataByLoan.set(loan.id, { v1: v1Data, v2: v2Data });

    db.prepare(
      "INSERT INTO term_sheet_versions (id, loan_id, version_no, data_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(v1Id, loan.id, 1, JSON.stringify(v1Data), users[0].id, nowIso());
    db.prepare(
      "INSERT INTO term_sheet_versions (id, loan_id, version_no, data_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(v2Id, loan.id, 2, JSON.stringify(v2Data), users[0].id, nowIso());

    db.prepare(
      "INSERT INTO definitions (id, loan_id, term, definition_text, source_clause_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      loan.id,
      "EBITDA",
      "EBITDA means earnings before interest, taxes, depreciation, and amortization, with adjustments for permitted add-backs.",
      null,
      users[0].id,
      nowIso(),
      nowIso()
    );
  });

  const greenAssessmentSeeds = new Map<
    string,
    {
      inputs: Record<string, unknown>;
      breakdown: Record<string, unknown>;
      score: number;
      verdict: string;
      redFlags: string[];
    }
  >();
  greenAssessmentSeeds.set(loans[0].id, {
    inputs: {
      useOfProceeds: ["Working Capital", "Plant Upgrade"],
      kpis: { emissionsReductionPct: 8, energyEfficiencyPct: 6, renewableSharePct: 5 },
      reportingCadence: "Annual",
      verification: "Internal",
      traceability: "Moderate",
      exclusions: ["Fossil fuel expansion"],
      notes: "Operational improvements without formal green taxonomy alignment."
    },
    breakdown: {
      components: {
        eligibility: 10,
        kpiAmbition: 8,
        verificationReporting: 8,
        traceability: 10,
        exclusions: 0
      },
      missingData: ["Third-party assurance", "Use-of-proceeds allocation register"],
      redFlags: ["Fossil fuel expansion"]
    },
    score: 36,
    verdict: "NotGreen",
    redFlags: ["Fossil fuel expansion"]
  });

  greenAssessmentSeeds.set(loans[1].id, {
    inputs: {
      useOfProceeds: ["Renewable Energy", "Green Buildings", "Clean Transport"],
      kpis: { emissionsReductionPct: 28, energyEfficiencyPct: 20, renewableSharePct: 55 },
      reportingCadence: "Quarterly",
      verification: "ThirdParty",
      traceability: "Strong",
      exclusions: [],
      notes: "Sustainability-linked facility with verified KPIs."
    },
    breakdown: {
      components: {
        eligibility: 28,
        kpiAmbition: 22,
        verificationReporting: 18,
        traceability: 12,
        exclusions: 10
      },
      missingData: [],
      redFlags: []
    },
    score: 90,
    verdict: "Green",
    redFlags: []
  });

  if (storage) {
    loans.forEach((loan) => {
      const groupId = randomUUID();
      documentGroupIds.set(loan.id, groupId);
      db.prepare(
        "INSERT INTO document_groups (id, loan_id, type, name, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(groupId, loan.id, "Agreement", `${loan.name} Agreement`, nowIso());

      const termSheets = termSheetDataByLoan.get(loan.id);
      const termSheetIds = termSheetVersionIds.get(loan.id);
      if (!termSheets || !termSheetIds) {
        return;
      }

      const v1Id = randomUUID();
      const v1Filename = `${loan.name.replace(/\s+/g, "_")}_Draft_v1.html`;
      const v1Path = `${storage.documentsDir}/${v1Id}_${v1Filename}`;
      const v1Html = buildDraftHtml({
        title: `${loan.name} Draft v1`,
        subtitle: "Term Sheet v1",
        sections: [
          `Facility: ${termSheets.v1.facilityType}`,
          `Commitment: ${loan.currency} ${termSheets.v1.commitmentAmount}`,
          `Margin: ${termSheets.v1.marginBps} bps`,
          `Maturity: ${termSheets.v1.maturityDate}`,
          `Leverage: <= ${termSheets.v1.leverageThreshold}x`,
          `Interest Coverage: >= ${termSheets.v1.interestCoverageThreshold}x`,
          `Reporting: ${termSheets.v1.reportingDaysAfterPeriodEnd} days after period end`
        ]
      });
      fs.writeFileSync(v1Path, v1Html, "utf8");
      const v1Hash = createHash("sha256").update(fs.readFileSync(v1Path)).digest("hex");
      db.prepare(
        "INSERT INTO document_versions (id, document_group_id, version_no, filename, file_path, sha256, created_by, created_at, source, term_sheet_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        v1Id,
        groupId,
        1,
        v1Filename,
        v1Path,
        v1Hash,
        users[0].id,
        nowIso(),
        "Upload",
        termSheetIds.v1
      );

      const v2Id = randomUUID();
      const v2Filename = `${loan.name.replace(/\s+/g, "_")}_Draft_v2.html`;
      const v2Path = `${storage.documentsDir}/${v2Id}_${v2Filename}`;
      const v2Html = buildDraftHtml({
        title: `${loan.name} Draft v2`,
        subtitle: "Term Sheet v2",
        sections: [
          `Facility: ${termSheets.v2.facilityType}`,
          `Commitment: ${loan.currency} ${termSheets.v2.commitmentAmount}`,
          `Margin: ${termSheets.v2.marginBps} bps`,
          `Maturity: ${termSheets.v2.maturityDate}`,
          `Leverage: <= ${termSheets.v2.leverageThreshold}x`,
          `Interest Coverage: >= ${termSheets.v2.interestCoverageThreshold}x`,
          `Reporting: ${termSheets.v2.reportingDaysAfterPeriodEnd} days after period end`
        ]
      });
      fs.writeFileSync(v2Path, v2Html, "utf8");
      const v2Hash = createHash("sha256").update(fs.readFileSync(v2Path)).digest("hex");
      db.prepare(
        "INSERT INTO document_versions (id, document_group_id, version_no, filename, file_path, sha256, created_by, created_at, source, term_sheet_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        v2Id,
        groupId,
        2,
        v2Filename,
        v2Path,
        v2Hash,
        users[0].id,
        nowIso(),
        "Generated",
        termSheetIds.v2
      );
      documentVersionIds.set(loan.id, { v1: v1Id, v2: v2Id });
    });
  }

  loans.forEach((loan) => {
    const assessment = greenAssessmentSeeds.get(loan.id);
    if (!assessment) {
      return;
    }
    db.prepare(
      "INSERT INTO green_assessments (id, loan_id, version_no, inputs_json, breakdown_json, score, verdict, red_flags_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      loan.id,
      1,
      JSON.stringify(assessment.inputs),
      JSON.stringify(assessment.breakdown),
      assessment.score,
      assessment.verdict,
      JSON.stringify(assessment.redFlags),
      users[0].id,
      nowIso(),
      nowIso()
    );
  });

  loans.forEach((loan) => {
    const docId = loanDocumentIds.get(loan.id);
    if (!docId) {
      return;
    }
    db.prepare(
      "INSERT INTO green_evidence_tags (id, loan_id, document_id, category, snippet, page_number, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      loan.id,
      docId,
      loan.name.includes("GreenBuild") ? "Renewable Energy" : "Energy Efficiency",
      loan.name.includes("GreenBuild")
        ? "Borrower commits to allocate proceeds to certified renewable energy projects."
        : "Borrower will retrofit plant equipment to reduce energy intensity by 6%.",
      4,
      users[0].id,
      nowIso()
    );
  });

  if (storage) {
    const seedLoanId = loans[0].id;
    const seedDocId = loanDocumentIds.get(seedLoanId);
    if (seedDocId) {
      const runId = randomUUID();
      db.prepare(
        "INSERT INTO extraction_runs (id, document_id, document_version_id, adapter_key, status, started_at, finished_at, summary_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        runId,
        seedDocId,
        null,
        "mock",
        "Completed",
        nowIso(),
        nowIso(),
        JSON.stringify({ clauses: 1, obligations: 1, covenants: 1, definitions: 1 })
      );

      const suggestionSeeds = [
        {
          type: "Clause",
          payload: {
            clauseType: "Obligation",
            title: "Quarterly Financial Statements",
            textSnippet: "Borrower shall deliver quarterly financial statements within 45 days after quarter end.",
            pageNumber: 3,
            tags: ["financials", "reporting"]
          },
          confidence: 0.78
        },
        {
          type: "Obligation",
          payload: {
            title: "Quarterly Financial Statements",
            description: "Deliver quarterly financials within 45 days of quarter end.",
            frequency: "Quarterly",
            dueRule: { type: "after_period_end", daysAfter: 45, period: "Quarter" },
            ownerParty: "Borrower",
            severity: "High",
            sourceSnippet: "deliver quarterly financial statements within 45 days",
            pageNumber: 3
          },
          confidence: 0.74
        },
        {
          type: "Covenant",
          payload: {
            name: "Leverage Ratio",
            covenantType: "Ratio",
            formulaKey: "LEVERAGE_RATIO",
            thresholdOp: "<=",
            thresholdValue: 3.5,
            frequency: "Quarterly",
            sourceSnippet: "Leverage Ratio shall not exceed 3.5x",
            pageNumber: 12
          },
          confidence: 0.69
        },
        {
          type: "Definition",
          payload: {
            term: "EBITDA",
            definitionText: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
            sourceSnippet: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
            pageNumber: 5
          },
          confidence: 0.66
        }
      ];

      suggestionSeeds.forEach((suggestion) => {
        db.prepare(
          "INSERT INTO extracted_suggestions (id, extraction_run_id, suggestion_type, payload_json, confidence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          randomUUID(),
          runId,
          suggestion.type,
          JSON.stringify(suggestion.payload),
          suggestion.confidence,
          "Proposed",
          nowIso(),
          nowIso()
        );
      });
    }
  }

  const seedLoanId = loans[0].id;
  const seedCovenants = covenantIdsByLoan.get(seedLoanId);
  if (seedCovenants) {
    db.prepare(
      "INSERT INTO consistency_findings (id, loan_id, document_version_id, rule_key, severity, message, affected_entity_type, affected_entity_id, status, created_at, resolved_at, resolved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      seedLoanId,
      documentVersionIds.get(seedLoanId)?.v2 ?? null,
      "TERM_SHEET_THRESHOLD_MISMATCH",
      "High",
      "Leverage Ratio threshold in term sheet v2 (3.5x) differs from covenant record (4.0x).",
      "Covenant",
      seedCovenants.leverageId,
      "Open",
      nowIso(),
      null,
      null
    );
  }

  const firstLoanId = loans[0].id;
  const submissionId = randomUUID();
  const periodStart = `${currentYear}-01-01`;
  const periodEnd = `${currentYear}-03-31`;
  db.prepare(
    "INSERT INTO submissions (id, loan_id, submitter_user_id, type, period_start, period_end, status, submitted_at, review_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    submissionId,
    firstLoanId,
    users[2].id,
    "Financials",
    periodStart,
    periodEnd,
    "Submitted",
    nowIso(),
    "Awaiting lender review."
  );

  const financialItems = [
    { key: "TotalDebt", valueNumber: 12500000 },
    { key: "EBITDA", valueNumber: 4200000 },
    { key: "InterestExpense", valueNumber: 1800000 }
  ];
  financialItems.forEach((item) => {
    db.prepare(
      "INSERT INTO submission_items (id, submission_id, obligation_instance_id, key, value_text, value_number, value_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      submissionId,
      null,
      item.key,
      null,
      item.valueNumber,
      null,
      null
    );
  });

  const covenants = db
    .prepare(
      "SELECT c.id, c.threshold_op, c.threshold_value, f.expression_json FROM covenants c JOIN formulas f ON c.formula_id = f.id WHERE c.loan_id = ?"
    )
    .all(firstLoanId) as {
    id: string;
    threshold_op: string;
    threshold_value: number;
    expression_json: string;
  }[];

  const metrics = Object.fromEntries(
    financialItems.map((item) => [item.key, item.valueNumber])
  );

  covenants.forEach((covenant) => {
    const expression = JSON.parse(covenant.expression_json);
    const result = computeCovenant(
      expression,
      metrics,
      covenant.threshold_op as "<=" | ">=" | "<" | ">" | "=",
      covenant.threshold_value
    );

    db.prepare(
      "INSERT INTO covenant_results (id, covenant_id, period_start, period_end, computed_value, threshold_value, pass_fail, computed_at, computed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      covenant.id,
      periodStart,
      periodEnd,
      result.computedValue,
      covenant.threshold_value,
      result.passFail,
      nowIso(),
      users[2].id,
      "Seeded calculation"
    );
  });

  const waiverId = randomUUID();
  db.prepare(
    "INSERT INTO waivers (id, loan_id, related_type, related_id, reason, requested_by, status, decided_by, decided_at, period_start, period_end, proposed_remedy_date, decision_note, conditions, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    waiverId,
    firstLoanId,
    "Covenant",
    seedCovenants?.leverageId ?? "",
    "Temporary leverage spike due to acquisition integration costs.",
    users[2].id,
    "Requested",
    null,
    null,
    periodStart,
    periodEnd,
    `${currentYear}-06-30`,
    null,
    "Monthly reporting until leverage ratio normalizes.",
    `${currentYear}-12-31`
  );

  db.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    users[0].id,
    "seed",
    "system",
    firstLoanId,
    null,
    JSON.stringify({ seeded: true }),
    nowIso()
  );

  return "seeded";
}
