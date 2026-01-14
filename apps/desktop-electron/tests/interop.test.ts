import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { openDatabase, runMigrations } from "@covenantpulse/db";
import { loanObligationSchemaV01 } from "@shared";
import { buildLoanObligationSchema, importLoanObligationSchema } from "../src/main/interoperability";

function setupDb() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "covenantpulse-test-"));
  const dbPath = path.join(tempDir, "test.sqlite");
  const db = openDatabase(dbPath);
  const migrationsDir = path.resolve(__dirname, "../../..", "packages/db/migrations");
  runMigrations(db, migrationsDir);
  const documentsDir = path.join(tempDir, "documents");
  fs.mkdirSync(documentsDir, { recursive: true });
  return { db, documentsDir };
}

describe("interoperability schema", () => {
  it("exports a schema that validates with Zod", () => {
    const { db } = setupDb();
    const now = new Date().toISOString();
    const userId = randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, "Test User", "test@example.com", "hash", "Admin", now);

    const loanId = randomUUID();
    db.prepare(
      "INSERT INTO loans (id, name, borrower_name, lender_name, currency, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(loanId, "Test Loan", "Borrower", "Lender", "USD", "2024-01-01", "Active", now);

    db.prepare(
      "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), loanId, "Borrower", "Borrower", "borrower@example.com");

    const docId = randomUUID();
    db.prepare(
      "INSERT INTO documents (id, loan_id, filename, file_path, sha256, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(docId, loanId, "Agreement.pdf", "/tmp/Agreement.pdf", "hash", userId, now);

    const clauseId = randomUUID();
    db.prepare(
      "INSERT INTO clauses (id, document_id, clause_type, title, text_snippet, page_number, tags_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(clauseId, docId, "Obligation", "Quarterly Statements", "Deliver statements", 1, "[]", userId, now);

    const obligationId = randomUUID();
    db.prepare(
      "INSERT INTO obligations (id, loan_id, title, description, frequency, due_rule_json, owner_party, severity, status, source_clause_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      obligationId,
      loanId,
      "Quarterly Statements",
      "Deliver statements",
      "Quarterly",
      JSON.stringify({ type: "after_period_end", daysAfter: 45, period: "Quarter" }),
      "Borrower",
      "High",
      "Active",
      clauseId,
      now
    );

    db.prepare(
      "INSERT INTO obligation_instances (id, obligation_id, period_start, period_end, due_date, status, last_reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), obligationId, now, now, now, "Pending", null);

    const formulaId = randomUUID();
    db.prepare(
      "INSERT INTO formulas (id, key, name, expression_json, description) VALUES (?, ?, ?, ?, ?)"
    ).run(formulaId, "LEVERAGE_RATIO", "Leverage Ratio", JSON.stringify({ type: "var", key: "EBITDA" }), "EBITDA");

    const covenantId = randomUUID();
    db.prepare(
      "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(covenantId, loanId, "Leverage Ratio", "Ratio", formulaId, "<=", 4.0, "Quarterly", clauseId, "Active");

    db.prepare(
      "INSERT INTO covenant_results (id, covenant_id, period_start, period_end, computed_value, threshold_value, pass_fail, computed_at, computed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), covenantId, now, now, 3.8, 4.0, "Pass", now, userId, null);

    db.prepare(
      "INSERT INTO waivers (id, loan_id, related_type, related_id, reason, requested_by, status, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), loanId, "Covenant", covenantId, "None", userId, "Requested", null, null);

    const schema = buildLoanObligationSchema({
      db,
      loanId,
      options: { includeAuditEvents: false, includeDocumentsMetadataOnly: true, appVersion: "test" }
    });

    expect(schema.meta.schemaVersion).toBe("0.1");
    expect(() => loanObligationSchemaV01.parse(schema)).not.toThrow();
  });

  it("imports a schema as a new loan copy", async () => {
    const { db, documentsDir } = setupDb();
    const now = new Date().toISOString();
    const userId = randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, "Test User", "test@example.com", "hash", "Admin", now);

    const loanId = randomUUID();
    db.prepare(
      "INSERT INTO loans (id, name, borrower_name, lender_name, currency, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(loanId, "Test Loan", "Borrower", "Lender", "USD", "2024-01-01", "Active", now);

    const schema = buildLoanObligationSchema({
      db,
      loanId,
      options: { includeAuditEvents: false, includeDocumentsMetadataOnly: true, appVersion: "test" }
    });

    const result = await importLoanObligationSchema({
      db,
      payload: schema,
      documentsDir,
      actorUserId: userId
    });

    const count = db.prepare("SELECT COUNT(*) as count FROM loans").get() as { count: number };
    expect(count.count).toBe(2);
    expect(result.loanId).not.toBe(loanId);
  });
});
