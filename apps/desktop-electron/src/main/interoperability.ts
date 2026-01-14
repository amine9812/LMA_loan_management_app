import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import { loanObligationSchemaV01 } from "@covenantpulse/shared";
import type { LoanObligationSchemaV01 } from "@covenantpulse/shared";
import { ensureSamplePdf } from "./storage";

export type InteropExportOptions = {
  includeAuditEvents: boolean;
  includeDocumentsMetadataOnly: boolean;
  appVersion: string;
};

export function buildLoanObligationSchema(params: {
  db: SqliteDatabase;
  loanId: string;
  options: InteropExportOptions;
}): LoanObligationSchemaV01 {
  const { db, loanId, options } = params;
  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId) as DbLoan;
  const parties = db
    .prepare("SELECT * FROM loan_parties WHERE loan_id = ?")
    .all(loanId) as DbLoanParty[];
  const documents = db
    .prepare("SELECT * FROM documents WHERE loan_id = ?")
    .all(loanId) as DbDocument[];
  const clauses = db
    .prepare("SELECT * FROM clauses WHERE document_id IN (SELECT id FROM documents WHERE loan_id = ?)")
    .all(loanId) as DbClause[];
  const obligations = db
    .prepare("SELECT * FROM obligations WHERE loan_id = ?")
    .all(loanId) as DbObligation[];
  const obligationInstances = db
    .prepare(
      "SELECT oi.* FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ?"
    )
    .all(loanId) as DbObligationInstance[];
  const formulas = db.prepare("SELECT * FROM formulas").all() as DbFormula[];
  const covenants = db
    .prepare("SELECT * FROM covenants WHERE loan_id = ?")
    .all(loanId) as DbCovenant[];
  const covenantResults = db
    .prepare(
      "SELECT cr.* FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ?"
    )
    .all(loanId) as DbCovenantResult[];
  const waivers = db
    .prepare("SELECT * FROM waivers WHERE loan_id = ?")
    .all(loanId) as DbWaiver[];

  const auditEvents = options.includeAuditEvents
    ? (db
        .prepare("SELECT * FROM audit_events WHERE entity_type = 'loan' AND entity_id = ?")
        .all(loanId) as DbAuditEvent[])
    : [];

  const schema: LoanObligationSchemaV01 = {
    meta: {
      schemaVersion: "0.1",
      exportedAt: new Date().toISOString(),
      appVersion: options.appVersion
    },
    loan: {
      id: loan.id,
      name: loan.name,
      borrowerName: loan.borrower_name,
      lenderName: loan.lender_name,
      currency: loan.currency,
      startDate: loan.start_date,
      status: loan.status
    },
    parties: parties.map((party) => ({
      id: party.id,
      partyType: party.party_type,
      name: party.name,
      contactEmail: party.contact_email
    })),
    documents: documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      sha256: options.includeDocumentsMetadataOnly ? doc.sha256 : doc.sha256,
      uploadedAt: doc.uploaded_at
    })),
    clauses: clauses.map((clause) => ({
      id: clause.id,
      type: clause.clause_type,
      title: clause.title,
      snippet: clause.text_snippet,
      page: clause.page_number,
      tags: JSON.parse(clause.tags_json),
      sourceDocumentId: clause.document_id
    })),
    obligations: obligations.map((obligation) => ({
      id: obligation.id,
      title: obligation.title,
      description: obligation.description,
      frequency: obligation.frequency,
      dueRule: JSON.parse(obligation.due_rule_json),
      ownerParty: obligation.owner_party,
      severity: obligation.severity,
      status: obligation.status,
      sourceClauseId: obligation.source_clause_id,
      createdAt: obligation.created_at
    })),
    obligationInstances: obligationInstances.map((instance) => ({
      id: instance.id,
      obligationId: instance.obligation_id,
      periodStart: instance.period_start,
      periodEnd: instance.period_end,
      dueDate: instance.due_date,
      status: instance.status
    })),
    formulas: formulas.map((formula) => ({
      id: formula.id,
      key: formula.key,
      name: formula.name,
      expression: JSON.parse(formula.expression_json),
      description: formula.description
    })),
    covenants: covenants.map((covenant) => ({
      id: covenant.id,
      name: covenant.name,
      covenantType: covenant.covenant_type,
      formulaId: covenant.formula_id,
      thresholdOp: covenant.threshold_op,
      thresholdValue: covenant.threshold_value,
      frequency: covenant.frequency,
      status: covenant.status,
      sourceClauseId: covenant.source_clause_id
    })),
    covenantResults: covenantResults.map((result) => ({
      id: result.id,
      covenantId: result.covenant_id,
      periodStart: result.period_start,
      periodEnd: result.period_end,
      computedValue: result.computed_value,
      thresholdValue: result.threshold_value,
      passFail: result.pass_fail,
      computedAt: result.computed_at,
      computedBy: result.computed_by,
      notes: result.notes
    })),
    waivers: waivers.map((waiver) => ({
      id: waiver.id,
      relatedType: waiver.related_type,
      relatedId: waiver.related_id,
      reason: waiver.reason,
      requestedBy: waiver.requested_by,
      status: waiver.status,
      decidedBy: waiver.decided_by,
      decidedAt: waiver.decided_at
    })),
    auditEvents: options.includeAuditEvents
      ? auditEvents.map((event) => ({
          id: event.id,
          actorUserId: event.actor_user_id,
          action: event.action,
          entityType: event.entity_type,
          entityId: event.entity_id,
          beforeJson: event.before_json,
          afterJson: event.after_json,
          createdAt: event.created_at
        }))
      : undefined
  };

  return schema;
}

export async function importLoanObligationSchema(params: {
  db: SqliteDatabase;
  payload: LoanObligationSchemaV01;
  documentsDir: string;
  actorUserId: string;
}): Promise<{ loanId: string }> {
  const { db, payload, documentsDir, actorUserId } = params;
  const parsed = loanObligationSchemaV01.parse(payload);
  const now = new Date().toISOString();

  const documentSeeds = await Promise.all(
    parsed.documents.map(async (doc) => {
      const newId = randomUUID();
      const filename = doc.filename;
      const filePath = path.join(documentsDir, `${newId}_${filename}`);
      await ensureSamplePdf({
        filePath,
        title: filename,
        subtitle: "Imported document placeholder"
      });
      const sha256 = doc.sha256 || "";
      return { oldId: doc.id, newId, filename, filePath, sha256 };
    })
  );

  const insert = db.transaction(() => {
    const newLoanId = randomUUID();
    db.prepare(
      "INSERT INTO loans (id, name, borrower_name, lender_name, currency, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      newLoanId,
      `${parsed.loan.name} (Imported)`,
      parsed.loan.borrowerName,
      parsed.loan.lenderName,
      parsed.loan.currency,
      parsed.loan.startDate,
      parsed.loan.status,
      now
    );

    const partyIdMap = new Map<string, string>();
    parsed.parties.forEach((party) => {
      const newId = randomUUID();
      partyIdMap.set(party.id, newId);
      db.prepare(
        "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
      ).run(newId, newLoanId, party.partyType, party.name, party.contactEmail ?? null);
    });

    const documentIdMap = new Map<string, string>();
    documentSeeds.forEach((doc) => {
      documentIdMap.set(doc.oldId, doc.newId);
      db.prepare(
        "INSERT INTO documents (id, loan_id, filename, file_path, sha256, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(doc.newId, newLoanId, doc.filename, doc.filePath, doc.sha256, actorUserId, now);
    });

    const clauseIdMap = new Map<string, string>();
    parsed.clauses.forEach((clause) => {
      const newId = randomUUID();
      clauseIdMap.set(clause.id, newId);
      db.prepare(
        "INSERT INTO clauses (id, document_id, clause_type, title, text_snippet, page_number, tags_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        newId,
        documentIdMap.get(clause.sourceDocumentId) ?? clause.sourceDocumentId,
        clause.type,
        clause.title,
        clause.snippet,
        clause.page,
        JSON.stringify(clause.tags ?? []),
        actorUserId,
        now
      );
    });

    const formulaIdMap = new Map<string, string>();
    parsed.formulas.forEach((formula) => {
      const existing = db
        .prepare("SELECT id FROM formulas WHERE key = ?")
        .get(formula.key) as { id: string } | undefined;
      const id = existing?.id ?? randomUUID();
      if (!existing) {
        db.prepare(
          "INSERT INTO formulas (id, key, name, expression_json, description) VALUES (?, ?, ?, ?, ?)"
        ).run(id, formula.key, formula.name, JSON.stringify(formula.expression), formula.description);
      }
      formulaIdMap.set(formula.id, id);
    });

    const obligationIdMap = new Map<string, string>();
    parsed.obligations.forEach((obligation) => {
      const newId = randomUUID();
      obligationIdMap.set(obligation.id, newId);
      db.prepare(
        "INSERT INTO obligations (id, loan_id, title, description, frequency, due_rule_json, owner_party, severity, status, source_clause_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        newId,
        newLoanId,
        obligation.title,
        obligation.description,
        obligation.frequency,
        JSON.stringify(obligation.dueRule),
        obligation.ownerParty,
        obligation.severity,
        obligation.status,
        obligation.sourceClauseId ? clauseIdMap.get(obligation.sourceClauseId) ?? null : null,
        obligation.createdAt
      );
    });

    parsed.obligationInstances.forEach((instance) => {
      const newId = randomUUID();
      db.prepare(
        "INSERT INTO obligation_instances (id, obligation_id, period_start, period_end, due_date, status, last_reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        newId,
        obligationIdMap.get(instance.obligationId) ?? instance.obligationId,
        instance.periodStart ?? null,
        instance.periodEnd ?? null,
        instance.dueDate,
        instance.status,
        null
      );
    });

    const covenantIdMap = new Map<string, string>();
    parsed.covenants.forEach((covenant) => {
      const newId = randomUUID();
      covenantIdMap.set(covenant.id, newId);
      db.prepare(
        "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        newId,
        newLoanId,
        covenant.name,
        covenant.covenantType,
        formulaIdMap.get(covenant.formulaId) ?? covenant.formulaId,
        covenant.thresholdOp,
        covenant.thresholdValue,
        covenant.frequency,
        covenant.sourceClauseId ? clauseIdMap.get(covenant.sourceClauseId) ?? null : null,
        covenant.status
      );
    });

    parsed.covenantResults.forEach((result) => {
      db.prepare(
        "INSERT INTO covenant_results (id, covenant_id, period_start, period_end, computed_value, threshold_value, pass_fail, computed_at, computed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        covenantIdMap.get(result.covenantId) ?? result.covenantId,
        result.periodStart ?? null,
        result.periodEnd ?? null,
        result.computedValue,
        result.thresholdValue,
        result.passFail,
        result.computedAt,
        actorUserId,
        result.notes ?? null
      );
    });

    parsed.waivers.forEach((waiver) => {
      const relatedId = waiver.relatedType === "Covenant"
        ? covenantIdMap.get(waiver.relatedId) ?? waiver.relatedId
        : obligationIdMap.get(waiver.relatedId) ?? waiver.relatedId;
      db.prepare(
        "INSERT INTO waivers (id, loan_id, related_type, related_id, reason, requested_by, status, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        newLoanId,
        waiver.relatedType,
        relatedId,
        waiver.reason,
        actorUserId,
        waiver.status,
        waiver.decidedBy ?? null,
        waiver.decidedAt ?? null
      );
    });

    return { loanId: newLoanId };
  });

  return insert();
}

export function writeSchemaToFile(params: {
  schema: LoanObligationSchemaV01;
  filePath: string;
}): void {
  fs.writeFileSync(params.filePath, JSON.stringify(params.schema, null, 2), "utf8");
}

export function readSchemaFile(filePath: string): LoanObligationSchemaV01 {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as LoanObligationSchemaV01;
  return loanObligationSchemaV01.parse(parsed);
}

type DbLoan = {
  id: string;
  name: string;
  borrower_name: string;
  lender_name: string;
  currency: string;
  start_date: string;
  status: string;
};

type DbLoanParty = {
  id: string;
  party_type: string;
  name: string;
  contact_email: string | null;
};

type DbDocument = {
  id: string;
  filename: string;
  sha256: string;
  uploaded_at: string;
};

type DbClause = {
  id: string;
  document_id: string;
  clause_type: string;
  title: string;
  text_snippet: string;
  page_number: number;
  tags_json: string;
};

type DbObligation = {
  id: string;
  title: string;
  description: string;
  frequency: string;
  due_rule_json: string;
  owner_party: string;
  severity: string;
  status: string;
  source_clause_id: string | null;
  created_at: string;
};

type DbObligationInstance = {
  id: string;
  obligation_id: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string;
  status: string;
};

type DbFormula = {
  id: string;
  key: string;
  name: string;
  expression_json: string;
  description: string;
};

type DbCovenant = {
  id: string;
  name: string;
  covenant_type: string;
  formula_id: string;
  threshold_op: string;
  threshold_value: number;
  frequency: string;
  status: string;
  source_clause_id: string | null;
};

type DbCovenantResult = {
  id: string;
  covenant_id: string;
  period_start: string | null;
  period_end: string | null;
  computed_value: number;
  threshold_value: number;
  pass_fail: string;
  computed_at: string;
  computed_by: string;
  notes: string | null;
};

type DbWaiver = {
  id: string;
  related_type: string;
  related_id: string;
  reason: string;
  requested_by: string;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
};

type DbAuditEvent = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
};
