import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { SqliteDatabase } from "@covenantpulse/db";
import { buildLoanObligationSchema } from "../interoperability";
import { GreenAssessmentRepo, ExportHistoryRepo } from "../repositories";

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, "_").replace(/_+/g, "_").slice(0, 80);
}

export async function exportCsv(params: {
  db: SqliteDatabase;
  loanId: string;
  targetDir: string;
  createdBy: string;
}): Promise<{ path: string }> {
  const loan = params.db.prepare("SELECT * FROM loans WHERE id = ?").get(params.loanId) as {
    name: string;
  };
  const obligations = params.db
    .prepare(
      "SELECT o.title, o.frequency, oi.due_date, oi.status FROM obligations o JOIN obligation_instances oi ON o.id = oi.obligation_id WHERE o.loan_id = ? ORDER BY oi.due_date ASC"
    )
    .all(params.loanId) as { title: string; frequency: string; due_date: string; status: string }[];
  const results = params.db
    .prepare(
      "SELECT c.name, cr.period_end, cr.computed_value, cr.pass_fail FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ? ORDER BY cr.computed_at DESC"
    )
    .all(params.loanId) as {
    name: string;
    period_end: string;
    computed_value: number;
    pass_fail: string;
  }[];

  const csvLines: string[] = [];
  csvLines.push(`Loan,${loan.name}`);
  csvLines.push("");
  csvLines.push("Obligations");
  csvLines.push("Title,Frequency,Due Date,Status");
  obligations.forEach((row) => {
    csvLines.push(`${row.title},${row.frequency},${row.due_date ?? ""},${row.status ?? ""}`);
  });
  csvLines.push("");
  csvLines.push("Covenant Results");
  csvLines.push("Covenant,Period End,Computed,Result");
  results.forEach((row) => {
    csvLines.push(`${row.name},${row.period_end ?? ""},${row.computed_value ?? ""},${row.pass_fail ?? ""}`);
  });

  const fileName = `${sanitizeFileName(loan.name)}_Compliance.csv`;
  const filePath = path.join(params.targetDir, fileName);
  fs.writeFileSync(filePath, csvLines.join("\n"), "utf8");

  const historyRepo = new ExportHistoryRepo(params.db);
  historyRepo.add({ loanId: params.loanId, exportType: "CSV", filePath, createdBy: params.createdBy });

  return { path: filePath };
}

export async function exportPdf(params: {
  db: SqliteDatabase;
  loanId: string;
  targetDir: string;
  createdBy: string;
}): Promise<{ path: string }> {
  const loan = params.db.prepare("SELECT * FROM loans WHERE id = ?").get(params.loanId) as {
    name: string;
    borrower_name: string;
    lender_name: string;
  };
  const upcoming = params.db
    .prepare(
      "SELECT o.title, oi.due_date FROM obligations o JOIN obligation_instances oi ON o.id = oi.obligation_id WHERE o.loan_id = ? AND date(oi.due_date) BETWEEN date('now') AND date('now', '+60 days') ORDER BY oi.due_date ASC LIMIT 8"
    )
    .all(params.loanId) as { title: string; due_date: string }[];
  const overdue = params.db
    .prepare(
      "SELECT o.title, oi.due_date FROM obligations o JOIN obligation_instances oi ON o.id = oi.obligation_id WHERE o.loan_id = ? AND oi.status = 'Overdue' ORDER BY oi.due_date ASC LIMIT 8"
    )
    .all(params.loanId) as { title: string; due_date: string }[];
  const results = params.db
    .prepare(
      "SELECT c.name, cr.period_end, cr.computed_value, cr.pass_fail FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ? ORDER BY cr.computed_at DESC LIMIT 8"
    )
    .all(params.loanId) as {
    name: string;
    period_end: string;
    computed_value: number;
    pass_fail: string;
  }[];
  const waivers = params.db
    .prepare("SELECT related_type, status, reason FROM waivers WHERE loan_id = ?")
    .all(params.loanId) as { related_type: string; status: string; reason: string }[];

  const greenRepo = new GreenAssessmentRepo(params.db);
  const green = greenRepo.getLatest(params.loanId);
  const greenBreakdown = green?.breakdownJson ? JSON.parse(green.breakdownJson) : null;

  const fileName = `${sanitizeFileName(loan.name)}_CompliancePack.pdf`;
  const filePath = path.join(params.targetDir, fileName);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(18).text("CovenantPulse Compliance Pack", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Loan: ${loan.name}`);
  doc.text(`Borrower: ${loan.borrower_name}`);
  doc.text(`Lender: ${loan.lender_name}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);

  doc.moveDown();
  doc.fontSize(14).text("Upcoming Obligations", { underline: true });
  upcoming.forEach((item) => {
    doc.fontSize(11).text(`- ${item.title} (due ${item.due_date})`);
  });

  doc.moveDown();
  doc.fontSize(14).text("Overdue Items", { underline: true });
  overdue.forEach((item) => {
    doc.fontSize(11).text(`- ${item.title} (due ${item.due_date})`);
  });

  doc.moveDown();
  doc.fontSize(14).text("Latest Covenant Results", { underline: true });
  results.forEach((item) => {
    doc.fontSize(11).text(`- ${item.name}: ${item.computed_value} (${item.pass_fail})`);
  });

  doc.moveDown();
  doc.fontSize(14).text("Waivers", { underline: true });
  waivers.forEach((item) => {
    doc.fontSize(11).text(`- ${item.related_type}: ${item.status} (${item.reason})`);
  });

  doc.moveDown();
  doc.fontSize(14).text("Green Loan Assessment", { underline: true });
  if (green) {
    doc.fontSize(11).text(`Score: ${green.score} / 100`);
    doc.fontSize(11).text(`Verdict: ${green.verdict}`);
    if (greenBreakdown?.components) {
      doc.fontSize(11).text(
        `Eligibility: ${greenBreakdown.components.eligibility} | KPI Ambition: ${greenBreakdown.components.kpiAmbition} | Verification: ${greenBreakdown.components.verificationReporting}`
      );
    }
    if (greenBreakdown?.redFlags?.length) {
      doc.fontSize(11).text(`Red Flags: ${greenBreakdown.redFlags.join(", ")}`);
    }
  } else {
    doc.fontSize(11).text("No green assessment completed yet.");
  }

  doc.end();

  const historyRepo = new ExportHistoryRepo(params.db);
  historyRepo.add({ loanId: params.loanId, exportType: "PDF", filePath, createdBy: params.createdBy });

  return { path: filePath };
}

export async function exportJson(params: {
  db: SqliteDatabase;
  loanId: string;
  targetDir: string;
  createdBy: string;
  appVersion: string;
  includeAuditEvents: boolean;
  includeDocumentsMetadataOnly: boolean;
}): Promise<{ path: string }> {
  const schema = buildLoanObligationSchema({
    db: params.db,
    loanId: params.loanId,
    options: {
      includeAuditEvents: params.includeAuditEvents,
      includeDocumentsMetadataOnly: params.includeDocumentsMetadataOnly,
      appVersion: params.appVersion
    }
  });
  const fileName = `${sanitizeFileName(params.loanId)}_LoanSchema.json`;
  const filePath = path.join(params.targetDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), "utf8");

  const historyRepo = new ExportHistoryRepo(params.db);
  historyRepo.add({ loanId: params.loanId, exportType: "JSON", filePath, createdBy: params.createdBy });

  return { path: filePath };
}
