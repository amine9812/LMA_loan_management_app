// Repo discovery: DB = better-sqlite3 via /packages/db with SQL migrations; API boundary = Electron IPC handlers here.
// Auth/RBAC = bcryptjs + in-memory sessions in auth.ts with assertRole helper; domain logic in /packages/core; Zod schemas/types in /packages/shared.
// Plan: add new tables/migrations + shared types/schemas; implement extraction adapters + IPC with RBAC/audit; add core diff/consistency logic;
// extend UI for Workbench/Term Sheet/Drafts/Consistency + interoperability export/import; update seeds/tests/docs.
import { app, dialog, ipcMain, shell } from "electron";
import { createHash, randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type { SqliteDatabase } from "@covenantpulse/db";
import type {
  Attachment,
  ApiResult,
  Clause,
  ClauseTemplate,
  ConsistencyFinding,
  Covenant,
  CovenantResult,
  DueRule,
  Definition,
  Document,
  DocumentGroup,
  DocumentVersion,
  ExtractedSuggestion,
  ExtractionRun,
  ExportHistory,
  GreenAssessment,
  GreenEvidenceTag,
  LoanObligationSchemaV01,
  Loan,
  Obligation,
  ObligationInstance,
  SemanticDiffItem,
  Submission,
  SubmissionDetail,
  TermSheetData,
  TermSheetVersion,
  User,
  Waiver
} from "@covenantpulse/shared";
import {
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
  waiverDecisionSchema,
  templateCreateSchema,
  templateUpdateSchema,
  termSheetCreateSchema,
  consistencyRunSchema,
  consistencyResolveSchema,
  submissionCreateSchema,
  submissionSubmitSchema,
  userCreateSchema,
  waiverCreateSchema
} from "@covenantpulse/shared";
import { computeSemanticDiff, runConsistencyChecks } from "@covenantpulse/core";
import { getSession, createSession, destroySession, verifyPassword, hashPassword } from "./auth";
import { assertRole } from "./rbac";
import { importFile, readFileAsDataUrl, type StoragePaths } from "./storage";
import { logAuditEvent } from "./audit";
import { loadIntegrations } from "./integrations";
import { extractDocumentText, loadDocumentExtractionAdapters } from "./documentExtraction";
import { importLoanObligationSchema, readSchemaFile } from "./interoperability";
import { seedDatabase } from "./seed";
import {
  AuditRepo,
  CovenantsRepo,
  DocumentsRepo,
  ExportHistoryRepo,
  GreenAssessmentRepo,
  LoansRepo,
  ObligationsRepo,
  SubmissionsRepo,
  WaiversRepo
} from "./repositories";
import { buildDashboardSummary, refreshOverdue } from "./services/alertsService";
import { computeCovenantResults as computeCovenantResultsService } from "./services/covenantEngine";
import { exportCsv, exportJson, exportPdf } from "./services/exportService";
import { saveGreenAssessment, type GreenAssessmentInputs } from "./services/greenAssessmentService";
import { buildSchedule } from "./services/schedulerService";

const nowIso = () => new Date().toISOString();

const applyTemplate = (body: string, values: Record<string, string | number>) =>
  body.replace(/{{(.*?)}}/g, (_match, key) => String(values[key.trim()] ?? ""));

const buildDraftHtml = (params: { title: string; subtitle: string; sections: string[] }) => {
  const sectionHtml = params.sections.map((section) => `<section><p>${section}</p></section>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${params.title}</title>
<style>
body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
h1 { margin-bottom: 4px; }
h2 { margin-top: 0; color: #64748b; font-weight: 500; }
section { margin-top: 16px; padding: 12px 0; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<h1>${params.title}</h1>
<h2>${params.subtitle}</h2>
${sectionHtml}
</body>
</html>`;
};

export async function registerIpcHandlers(params: {
  db: SqliteDatabase;
  storage: StoragePaths;
}): Promise<void> {
  const { db, storage } = params;

  const wrap = <T>(handler: () => T | Promise<T>): Promise<ApiResult<T>> =>
    Promise.resolve()
      .then(handler)
      .then((data) => ({ ok: true as const, data }))
      .catch((error: Error) => ({
        ok: false as const,
        error: error.message || "Unknown error"
      }));

  const requireSession = (sessionId: string) => {
    const session = getSession(sessionId);
    if (!session) {
      throw new Error("Unauthenticated");
    }
    return session;
  };

  const integrations = loadIntegrations();
  const loansRepo = new LoansRepo(db);
  const obligationsRepo = new ObligationsRepo(db);
  const covenantsRepo = new CovenantsRepo(db);
  const submissionsRepo = new SubmissionsRepo(db);
  const documentsRepo = new DocumentsRepo(db);
  const greenRepo = new GreenAssessmentRepo(db);
  const auditRepo = new AuditRepo(db);
  const waiversRepo = new WaiversRepo(db);
  const exportHistoryRepo = new ExportHistoryRepo(db);

  ipcMain.handle("auth:login", async (_event, payload) => {
    return wrap(async () => {
      const userRow = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(payload.email) as DbUser | undefined;
      if (!userRow) {
        throw new Error("Invalid credentials");
      }
      const valid = await verifyPassword(payload.password, userRow.password_hash);
      if (!valid) {
        throw new Error("Invalid credentials");
      }
      const user = mapUser(userRow);
      const session = createSession(user);
      return { sessionId: session.sessionId, user };
    });
  });

  ipcMain.handle("auth:logout", async (_event, payload) => {
    return wrap(() => {
      destroySession(payload.sessionId);
      return { ok: true };
    });
  });

  ipcMain.handle("auth:me", async (_event, payload) => {
    return wrap(() => {
      const session = getSession(payload.sessionId);
      if (!session) {
        return null;
      }
      const userRow = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(session.userId) as DbUser | undefined;
      return userRow ? { user: mapUser(userRow) } : null;
    });
  });

  ipcMain.handle("demo:seed", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const status = await seedDatabase(db, storage, { resetDemoUsers: true });
      return { status };
    });
  });

  ipcMain.handle("users:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin"]);
      const rows = db
        .prepare("SELECT * FROM users ORDER BY created_at DESC")
        .all() as DbUser[];
      return rows.map(mapUser);
    });
  });

  ipcMain.handle("users:create", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin"]);
      const input = userCreateSchema.parse(payload.input);
      const exists = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(input.email);
      if (exists) {
        throw new Error("Email already exists");
      }
      const id = randomUUID();
      const passwordHash = await hashPassword(input.password);
      db.prepare(
        "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, input.name, input.email, passwordHash, input.role, nowIso());
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "create",
        entityType: "user",
        entityId: id,
        after: { name: input.name, email: input.email, role: input.role }
      });
      const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
      return mapUser(userRow);
    });
  });

  ipcMain.handle("users:updateRole", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin"]);
      const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) as
        | DbUser
        | undefined;
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(payload.role, payload.userId);
      const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) as DbUser;
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "update_role",
        entityType: "user",
        entityId: payload.userId,
        before: existing ? { role: existing.role } : null,
        after: { role: payload.role }
      });
      return mapUser(userRow);
    });
  });

  ipcMain.handle("users:resetPassword", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin"]);
      const passwordHash = await hashPassword(payload.newPassword);
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
        passwordHash,
        payload.userId
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "reset_password",
        entityType: "user",
        entityId: payload.userId,
        before: null,
        after: { reset: true }
      });
      return { ok: true };
    });
  });

  ipcMain.handle("loans:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return loansRepo.list();
    });
  });

  ipcMain.handle("loans:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = loanCreateSchema.parse(payload.input);
      const loan = loansRepo.create(input);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "create",
        entityType: "loan",
        entityId: loan.id,
        after: input
      });
      return loan;
    });
  });

  ipcMain.handle("loans:get", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return loansRepo.get(payload.loanId);
    });
  });

  ipcMain.handle("loans:update", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const updates = payload.input;
      const updated = loansRepo.update(payload.loanId, updates);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "update",
        entityType: "loan",
        entityId: payload.loanId,
        after: updated
      });
      return updated;
    });
  });

  ipcMain.handle("obligations:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return obligationsRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("obligations:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = obligationCreateSchema.parse(payload.input);
      const obligation = obligationsRepo.create(input);

      if (input.frequency !== "Adhoc") {
        const schedule = buildSchedule({
          loanStartDate: getLoanStartDate(db, input.loanId),
          frequency: input.frequency,
          dueRule: input.dueRule,
          monthsAhead: 12
        });
        obligationsRepo.createInstances({
          obligationId: obligation.id,
          instances: schedule
        });
      }

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "create",
        entityType: "obligation",
        entityId: obligation.id,
        after: input
      });

      return obligation;
    });
  });

  ipcMain.handle("obligations:update", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const existing = db
        .prepare("SELECT * FROM obligations WHERE id = ?")
        .get(payload.obligationId) as DbObligation | undefined;
      if (!existing) {
        throw new Error("Obligation not found");
      }
      const input = payload.input;
      const merged = {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        frequency: input.frequency ?? existing.frequency,
        due_rule_json: input.dueRule ? JSON.stringify(input.dueRule) : existing.due_rule_json,
        owner_party: input.ownerParty ?? existing.owner_party,
        severity: input.severity ?? existing.severity,
        status: input.status ?? existing.status,
        source_clause_id: input.sourceClauseId ?? existing.source_clause_id
      };
      db.prepare(
        "UPDATE obligations SET title = ?, description = ?, frequency = ?, due_rule_json = ?, owner_party = ?, severity = ?, status = ?, source_clause_id = ? WHERE id = ?"
      ).run(
        merged.title,
        merged.description,
        merged.frequency,
        merged.due_rule_json,
        merged.owner_party,
        merged.severity,
        merged.status,
        merged.source_clause_id,
        payload.obligationId
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "update",
        entityType: "obligation",
        entityId: payload.obligationId,
        before: existing,
        after: merged
      });

      const row = db
        .prepare("SELECT * FROM obligations WHERE id = ?")
        .get(payload.obligationId) as DbObligation;
      return mapObligation(row);
    });
  });

  ipcMain.handle("obligations:generateSchedule", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const obligations = db
        .prepare("SELECT * FROM obligations WHERE loan_id = ?")
        .all(payload.loanId) as DbObligation[];
      let created = 0;
      obligations.forEach((obligation) => {
        if (obligation.frequency === "Adhoc") {
          return;
        }
        const schedule = buildSchedule({
          loanStartDate: getLoanStartDate(db, payload.loanId),
          frequency: obligation.frequency as Obligation["frequency"],
          dueRule: JSON.parse(obligation.due_rule_json) as DueRule,
          monthsAhead: payload.monthsAhead
        });

        schedule.forEach((instance) => {
          const exists = db
            .prepare(
              "SELECT id FROM obligation_instances WHERE obligation_id = ? AND period_start = ? AND period_end = ?"
            )
            .get(obligation.id, instance.periodStart, instance.periodEnd);
          if (exists) {
            return;
          }
          db.prepare(
            "INSERT INTO obligation_instances (id, obligation_id, period_start, period_end, due_date, status, last_reminder_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).run(
            randomUUID(),
            obligation.id,
            instance.periodStart,
            instance.periodEnd,
            instance.dueDate,
            "Pending",
            null
          );
          created += 1;
        });
      });
      return { created };
    });
  });

  ipcMain.handle("obligationInstances:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      refreshOverdue(db);
      return obligationsRepo.listInstancesByLoan(payload.loanId);
    });
  });

  ipcMain.handle("obligationInstances:update", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const status = payload.status;
      const dueDate = payload.dueDate;
      const updated = obligationsRepo.updateInstance(payload.instanceId, { status, dueDate });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "update",
        entityType: "obligation_instance",
        entityId: payload.instanceId,
        after: { status, dueDate }
      });
      return updated;
    });
  });

  ipcMain.handle("covenants:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return covenantsRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("covenants:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = covenantCreateSchema.parse(payload.input);
      const covenant = covenantsRepo.create(input);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "create",
        entityType: "covenant",
        entityId: covenant.id,
        after: input
      });
      return covenant;
    });
  });

  ipcMain.handle("covenants:results", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return covenantsRepo.listResultsByLoan(payload.loanId);
    });
  });

  ipcMain.handle("formulas:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db.prepare("SELECT id, key, name, description FROM formulas").all() as {
        id: string;
        key: string;
        name: string;
        description: string;
      }[];
      return rows.map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description
      }));
    });
  });

  ipcMain.handle("submissions:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return submissionsRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("submissions:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "BorrowerReporter", "LenderOps"]);
      const input = submissionCreateSchema.parse(payload.input);
      const submission = submissionsRepo.create(input);

      if (input.type === "ObligationEvidence") {
        const instanceIds = input.items
          .map((item) => item.obligationInstanceId)
          .filter((id): id is string => Boolean(id));
        instanceIds.forEach((id) => {
          db.prepare("UPDATE obligation_instances SET status = ? WHERE id = ?").run(
            "Submitted",
            id
          );
        });
      }

      if (input.type === "Financials") {
        const metrics = Object.fromEntries(
          input.items
            .filter((item) => typeof item.valueNumber === "number")
            .map((item) => [item.key, item.valueNumber as number])
        );
        computeCovenantResultsService({
          db,
          metrics,
          loanId: input.loanId,
          actorUserId: input.submitterUserId,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null
        });
      }

      logAuditEvent({
        db,
        actorUserId: input.submitterUserId,
        action: "create",
        entityType: "submission",
        entityId: submission.id,
        after: input
      });

      return submission;
    });
  });

  ipcMain.handle("submissions:detail", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const submission = submissionsRepo.getById(payload.submissionId);
      if (!submission) {
        throw new Error("Submission not found");
      }
      const items = submissionsRepo.listItems(payload.submissionId);
      const attachments = submissionsRepo.listAttachments(payload.submissionId);
      const covenantResults = covenantsRepo.listResultsByLoanPeriod({
        loanId: submission.loanId,
        periodStart: submission.periodStart ?? null,
        periodEnd: submission.periodEnd ?? null
      });
      return { submission, items, attachments, covenantResults };
    });
  });

  ipcMain.handle("submissions:submit", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "BorrowerReporter", "LenderOps"]);
      const input = submissionSubmitSchema.parse(payload.input);
      const submission = submissionsRepo.getById(input.submissionId);
      if (!submission) {
        throw new Error("Submission not found");
      }
      const items = submissionsRepo.listItems(input.submissionId);
      const updated = submissionsRepo.updateStatus({
        submissionId: input.submissionId,
        status: "Submitted",
        submittedAt: nowIso()
      });

      if (submission.type === "ObligationEvidence") {
        items
          .map((item) => item.obligationInstanceId)
          .filter((id): id is string => Boolean(id))
          .forEach((id) => {
            db.prepare("UPDATE obligation_instances SET status = ? WHERE id = ?").run(
              "Submitted",
              id
            );
          });
      }

      if (submission.type === "Financials") {
        const metrics = Object.fromEntries(
          items
            .filter((item) => typeof item.valueNumber === "number")
            .map((item) => [item.key, item.valueNumber as number])
        );
        computeCovenantResultsService({
          db,
          metrics,
          loanId: submission.loanId,
          actorUserId: session.userId,
          periodStart: submission.periodStart ?? null,
          periodEnd: submission.periodEnd ?? null
        });
      }

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "submit",
        entityType: "submission",
        entityId: input.submissionId,
        after: { status: "Submitted" }
      });

      return updated;
    });
  });

  ipcMain.handle("submissions:review", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const updated = submissionsRepo.updateStatus({
        submissionId: payload.submissionId,
        status: payload.status,
        reviewNotes: payload.notes ?? null
      });

      if (payload.status === "Approved" || payload.status === "Rejected") {
        const items = db
          .prepare("SELECT obligation_instance_id FROM submission_items WHERE submission_id = ?")
          .all(payload.submissionId) as { obligation_instance_id: string | null }[];
        items
          .map((item) => item.obligation_instance_id)
          .filter((id): id is string => Boolean(id))
          .forEach((id) => {
            db.prepare("UPDATE obligation_instances SET status = ? WHERE id = ?").run(
              payload.status === "Approved" ? "Approved" : "Rejected",
              id
            );
          });
      }

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "review",
        entityType: "submission",
        entityId: payload.submissionId,
        after: { status: payload.status, notes: payload.notes }
      });

      return updated;
    });
  });

  ipcMain.handle("documents:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return documentsRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("documents:import", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter"]);
      const result = await dialog.showOpenDialog({
        title: "Import Loan Document",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error("No file selected");
      }
      const imported = importFile({
        sourcePath: result.filePaths[0],
        destinationDir: storage.documentsDir
      });
      const doc = documentsRepo.create({
        loanId: payload.loanId,
        filename: imported.filename,
        filePath: imported.filePath,
        sha256: imported.sha256,
        uploadedBy: session.userId
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "upload",
        entityType: "document",
        entityId: doc.id,
        after: { loanId: payload.loanId, filename: imported.filename }
      });
      return doc;
    });
  });

  ipcMain.handle("documents:dataUrl", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(payload.documentId) as
        | DbDocument
        | undefined;
      if (!row) {
        throw new Error("Document not found");
      }
      const dataUrl = readFileAsDataUrl({
        filePath: row.file_path,
        allowedDirs: [storage.documentsDir],
        mimeType: "application/pdf"
      });
      return { dataUrl };
    });
  });

  ipcMain.handle("documentVersions:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return documentsRepo.listVersionsByLoan(payload.loanId);
    });
  });

  ipcMain.handle("documentVersions:dataUrl", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      const row = db
        .prepare("SELECT * FROM document_versions WHERE id = ?")
        .get(payload.documentVersionId) as DbDocumentVersion | undefined;
      if (!row) {
        throw new Error("Document version not found");
      }
      const ext = path.extname(row.file_path).toLowerCase();
      const mimeType = ext === ".pdf" ? "application/pdf" : "text/html";
      const dataUrl = readFileAsDataUrl({
        filePath: row.file_path,
        allowedDirs: [storage.documentsDir],
        mimeType
      });
      return { dataUrl };
    });
  });

  ipcMain.handle("clauses:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return documentsRepo.listClauses(payload.documentId);
    });
  });

  ipcMain.handle("clauses:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = clauseCreateSchema.parse(payload.input);
      const clause = documentsRepo.createClause({
        documentId: input.documentId,
        clauseType: input.clauseType,
        title: input.title,
        textSnippet: input.textSnippet,
        pageNumber: input.pageNumber,
        tags: input.tags,
        createdBy: session.userId
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "create",
        entityType: "clause",
        entityId: clause.id,
        after: input
      });
      return clause;
    });
  });

  ipcMain.handle("extraction:run", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = extractionRunSchema.parse(payload.input);
      const adapters = loadDocumentExtractionAdapters();
      const adapter = adapters.find((item) => item.key === input.adapterKey);
      if (!adapter) {
        throw new Error("Extraction adapter not found");
      }

      let filePath = "";
      let loanId = "";
      let entityType = "document";
      let entityId = input.documentId ?? "";

      if (input.documentId) {
        const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(input.documentId) as
          | DbDocument
          | undefined;
        if (!doc) {
          throw new Error("Document not found");
        }
        filePath = doc.file_path;
        loanId = doc.loan_id;
      } else if (input.documentVersionId) {
        const row = db
          .prepare(
            "SELECT dv.*, dg.loan_id as loan_id FROM document_versions dv JOIN document_groups dg ON dg.id = dv.document_group_id WHERE dv.id = ?"
          )
          .get(input.documentVersionId) as (DbDocumentVersion & { loan_id: string }) | undefined;
        if (!row) {
          throw new Error("Document version not found");
        }
        filePath = row.file_path;
        loanId = row.loan_id;
        entityType = "document_version";
        entityId = row.id;
      }

      const runId = randomUUID();
      const startedAt = nowIso();
      let status: ExtractionRun["status"] = "Completed";
      let summary = {
        clauses: 0,
        obligations: 0,
        covenants: 0,
        definitions: 0
      };

      let result: Awaited<ReturnType<typeof adapter.extract>> | null = null;
      try {
        const extracted = await extractDocumentText(filePath);
        result = await adapter.extract({
          documentId: input.documentId ?? input.documentVersionId ?? "unknown",
          rawText: extracted.rawText,
          pages: extracted.pages
        });
      } catch (error) {
        status = "Failed";
        summary = { clauses: 0, obligations: 0, covenants: 0, definitions: 0 };
      }

      if (result) {
        summary = {
          clauses: result.suggestedClauses.length,
          obligations: result.suggestedObligations.length,
          covenants: result.suggestedCovenants.length,
          definitions: result.suggestedDefinitions.length
        };
      }

      db.prepare(
        "INSERT INTO extraction_runs (id, document_id, document_version_id, adapter_key, status, started_at, finished_at, summary_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        runId,
        input.documentId ?? null,
        input.documentVersionId ?? null,
        adapter.key,
        status,
        startedAt,
        nowIso(),
        JSON.stringify(summary)
      );

      if (status === "Failed" || !result) {
        logAuditEvent({
          db,
          actorUserId: session.userId,
          action: "EXTRACTION_RUN",
          entityType,
          entityId,
          after: { status: "Failed" }
        });
        throw new Error("Extraction failed");
      }

      const insertSuggestion = (type: string, suggestion: { payload: unknown; confidence: number }) => {
        db.prepare(
          "INSERT INTO extracted_suggestions (id, extraction_run_id, suggestion_type, payload_json, confidence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          randomUUID(),
          runId,
          type,
          JSON.stringify(suggestion.payload),
          suggestion.confidence,
          "Proposed",
          nowIso(),
          nowIso()
        );
      };

      result.suggestedClauses.forEach((suggestion) => insertSuggestion("Clause", suggestion));
      result.suggestedObligations.forEach((suggestion) => insertSuggestion("Obligation", suggestion));
      result.suggestedCovenants.forEach((suggestion) => insertSuggestion("Covenant", suggestion));
      result.suggestedDefinitions.forEach((suggestion) => insertSuggestion("Definition", suggestion));

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "EXTRACTION_RUN",
        entityType,
        entityId,
        after: { loanId, summary }
      });

      const row = db.prepare("SELECT * FROM extraction_runs WHERE id = ?").get(runId) as DbExtractionRun;
      return mapExtractionRun(row);
    });
  });

  ipcMain.handle("extraction:runs", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      if (!payload.documentId && !payload.documentVersionId) {
        throw new Error("documentId or documentVersionId required");
      }
      const rows = payload.documentId
        ? (db
            .prepare("SELECT * FROM extraction_runs WHERE document_id = ? ORDER BY started_at DESC")
            .all(payload.documentId) as DbExtractionRun[])
        : (db
            .prepare(
              "SELECT * FROM extraction_runs WHERE document_version_id = ? ORDER BY started_at DESC"
            )
            .all(payload.documentVersionId) as DbExtractionRun[]);
      return rows.map(mapExtractionRun);
    });
  });

  ipcMain.handle("extraction:suggestions", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db
        .prepare("SELECT * FROM extracted_suggestions WHERE extraction_run_id = ? ORDER BY created_at DESC")
        .all(payload.runId) as DbExtractedSuggestion[];
      return rows.map(mapExtractedSuggestion);
    });
  });

  ipcMain.handle("extraction:confirm", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = suggestionConfirmSchema.parse(payload.input);
      const suggestion = db
        .prepare("SELECT * FROM extracted_suggestions WHERE id = ?")
        .get(input.suggestionId) as DbExtractedSuggestion | undefined;
      if (!suggestion) {
        throw new Error("Suggestion not found");
      }
      const run = db
        .prepare("SELECT * FROM extraction_runs WHERE id = ?")
        .get(suggestion.extraction_run_id) as DbExtractionRun | undefined;
      if (!run) {
        throw new Error("Extraction run not found");
      }

      const payloadData = JSON.parse(suggestion.payload_json) as Record<string, unknown>;
      const merged = (input.edits ? { ...payloadData, ...input.edits } : payloadData) as Record<
        string,
        any
      >;

      const documentId = run.document_id;
      const loanId = documentId
        ? (db.prepare("SELECT loan_id FROM documents WHERE id = ?").get(documentId) as { loan_id: string })
            .loan_id
        : (db
            .prepare(
              "SELECT dg.loan_id as loan_id FROM document_versions dv JOIN document_groups dg ON dg.id = dv.document_group_id WHERE dv.id = ?"
            )
            .get(run.document_version_id) as { loan_id: string } | undefined)?.loan_id;
      if (!loanId) {
        throw new Error("Loan not found for extraction run");
      }

      let createdEntity: { type: string; id: string } | null = null;

      const createClauseFromSuggestion = (params: {
        clauseType: string;
        title: string;
        textSnippet: string;
        pageNumber?: number | null;
        tags?: string[];
      }): string | null => {
        if (!documentId) {
          return null;
        }
        const clauseId = randomUUID();
        db.prepare(
          "INSERT INTO clauses (id, document_id, clause_type, title, text_snippet, page_number, tags_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          clauseId,
          documentId,
          params.clauseType,
          params.title,
          params.textSnippet,
          params.pageNumber ?? 1,
          JSON.stringify(params.tags ?? []),
          session.userId,
          nowIso()
        );
        return clauseId;
      };

      if (suggestion.suggestion_type === "Clause") {
        const clauseId = createClauseFromSuggestion({
          clauseType: String(merged.clauseType ?? "Other"),
          title: String(merged.title ?? "Extracted Clause"),
          textSnippet: String(merged.textSnippet ?? ""),
          pageNumber: merged.pageNumber as number | undefined,
          tags: merged.tags as string[] | undefined
        });
        if (!clauseId) {
          throw new Error("Document required to create clause");
        }
        createdEntity = { type: "clause", id: clauseId };
      }

      if (suggestion.suggestion_type === "Obligation") {
        const clauseId = createClauseFromSuggestion({
          clauseType: "Obligation",
          title: String(merged.title ?? "Extracted Obligation"),
          textSnippet: String(merged.sourceSnippet ?? merged.description ?? ""),
          pageNumber: merged.pageNumber as number | undefined,
          tags: ["extracted"]
        });
        const obligationId = randomUUID();
        const dueRule = merged.dueRule as DueRule;
        db.prepare(
          "INSERT INTO obligations (id, loan_id, title, description, frequency, due_rule_json, owner_party, severity, status, source_clause_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          obligationId,
          loanId,
          String(merged.title ?? "Extracted Obligation"),
          String(merged.description ?? ""),
          String(merged.frequency ?? "Adhoc"),
          JSON.stringify(dueRule),
          String(merged.ownerParty ?? "Borrower"),
          String(merged.severity ?? "Med"),
          "Active",
          clauseId,
          nowIso()
        );

        if (merged.frequency && merged.frequency !== "Adhoc") {
          const schedule = buildSchedule({
            loanStartDate: getLoanStartDate(db, loanId),
            frequency: merged.frequency as Obligation["frequency"],
            dueRule,
            monthsAhead: 12
          });
          schedule.forEach((instance) => {
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

        createdEntity = { type: "obligation", id: obligationId };
      }

      if (suggestion.suggestion_type === "Covenant") {
        const clauseId = createClauseFromSuggestion({
          clauseType: "Covenant",
          title: String(merged.name ?? "Extracted Covenant"),
          textSnippet: String(merged.sourceSnippet ?? merged.name ?? ""),
          pageNumber: merged.pageNumber as number | undefined,
          tags: ["extracted"]
        });
        const formulaKey = String(merged.formulaKey ?? "CUSTOM_FORMULA");
        let formulaId = db
          .prepare("SELECT id FROM formulas WHERE key = ?")
          .get(formulaKey) as { id: string } | undefined;
        if (!formulaId) {
          const newFormulaId = randomUUID();
          db.prepare(
            "INSERT INTO formulas (id, key, name, expression_json, description) VALUES (?, ?, ?, ?, ?)"
          ).run(
            newFormulaId,
            formulaKey,
            formulaKey,
            JSON.stringify({ type: "var", key: formulaKey }),
            "Imported formula placeholder"
          );
          formulaId = { id: newFormulaId };
        }
        const covenantId = randomUUID();
        db.prepare(
          "INSERT INTO covenants (id, loan_id, name, covenant_type, formula_id, threshold_op, threshold_value, frequency, source_clause_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          covenantId,
          loanId,
          String(merged.name ?? "Extracted Covenant"),
          String(merged.covenantType ?? "Ratio"),
          formulaId.id,
          String(merged.thresholdOp ?? "<="),
          Number(merged.thresholdValue ?? 0),
          String(merged.frequency ?? "Quarterly"),
          clauseId,
          "Active"
        );
        createdEntity = { type: "covenant", id: covenantId };
      }

      if (suggestion.suggestion_type === "Definition") {
        const clauseId = createClauseFromSuggestion({
          clauseType: "Definition",
          title: String(merged.term ?? "Extracted Definition"),
          textSnippet: String(merged.definitionText ?? ""),
          pageNumber: merged.pageNumber as number | undefined,
          tags: ["definition"]
        });
        const definitionId = randomUUID();
        db.prepare(
          "INSERT INTO definitions (id, loan_id, term, definition_text, source_clause_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          definitionId,
          loanId,
          String(merged.term ?? "Term"),
          String(merged.definitionText ?? ""),
          clauseId,
          session.userId,
          nowIso(),
          nowIso()
        );
        logAuditEvent({
          db,
          actorUserId: session.userId,
          action: "DEFINITION_CREATED",
          entityType: "definition",
          entityId: definitionId,
          after: merged
        });
        createdEntity = { type: "definition", id: definitionId };
      }

      if (!createdEntity) {
        throw new Error("Unsupported suggestion type");
      }

      db.prepare(
        "UPDATE extracted_suggestions SET status = ?, payload_json = ?, updated_at = ? WHERE id = ?"
      ).run(
        "Confirmed",
        JSON.stringify(merged),
        nowIso(),
        suggestion.id
      );

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: input.edits ? "SUGGESTION_EDITED_CONFIRMED" : "SUGGESTION_CONFIRMED",
        entityType: createdEntity.type,
        entityId: createdEntity.id,
        after: merged
      });

      const row = db
        .prepare("SELECT * FROM extracted_suggestions WHERE id = ?")
        .get(suggestion.id) as DbExtractedSuggestion;
      return mapExtractedSuggestion(row);
    });
  });

  ipcMain.handle("extraction:reject", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const suggestion = db
        .prepare("SELECT * FROM extracted_suggestions WHERE id = ?")
        .get(payload.suggestionId) as DbExtractedSuggestion | undefined;
      if (!suggestion) {
        throw new Error("Suggestion not found");
      }
      db.prepare("UPDATE extracted_suggestions SET status = ?, updated_at = ? WHERE id = ?").run(
        "Rejected",
        nowIso(),
        payload.suggestionId
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "SUGGESTION_REJECTED",
        entityType: "extracted_suggestion",
        entityId: payload.suggestionId,
        before: suggestion
      });
      const row = db
        .prepare("SELECT * FROM extracted_suggestions WHERE id = ?")
        .get(payload.suggestionId) as DbExtractedSuggestion;
      return mapExtractedSuggestion(row);
    });
  });

  ipcMain.handle("definitions:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db
        .prepare("SELECT * FROM definitions WHERE loan_id = ? ORDER BY term ASC")
        .all(payload.loanId) as DbDefinition[];
      return rows.map(mapDefinition);
    });
  });

  ipcMain.handle("definitions:upsert", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = definitionUpsertSchema.parse(payload.input);
      if (input.id) {
        const existing = db
          .prepare("SELECT * FROM definitions WHERE id = ?")
          .get(input.id) as DbDefinition | undefined;
        if (existing) {
          db.prepare(
            "UPDATE definitions SET term = ?, definition_text = ?, source_clause_id = ?, updated_at = ? WHERE id = ?"
          ).run(
            input.term,
            input.definitionText,
            input.sourceClauseId ?? null,
            nowIso(),
            input.id
          );
          logAuditEvent({
            db,
            actorUserId: session.userId,
            action: "DEFINITION_UPDATED",
            entityType: "definition",
            entityId: input.id,
            before: existing,
            after: input
          });
          const row = db.prepare("SELECT * FROM definitions WHERE id = ?").get(input.id) as DbDefinition;
          return mapDefinition(row);
        }
      }

      const definitionId = input.id ?? randomUUID();
      db.prepare(
        "INSERT INTO definitions (id, loan_id, term, definition_text, source_clause_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        definitionId,
        input.loanId,
        input.term,
        input.definitionText,
        input.sourceClauseId ?? null,
        session.userId,
        nowIso(),
        nowIso()
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "DEFINITION_CREATED",
        entityType: "definition",
        entityId: definitionId,
        after: input
      });
      const row = db.prepare("SELECT * FROM definitions WHERE id = ?").get(definitionId) as DbDefinition;
      return mapDefinition(row);
    });
  });

  ipcMain.handle("definitions:delete", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const existing = db
        .prepare("SELECT * FROM definitions WHERE id = ?")
        .get(payload.definitionId) as DbDefinition | undefined;
      if (!existing) {
        throw new Error("Definition not found");
      }
      db.prepare("DELETE FROM definitions WHERE id = ?").run(payload.definitionId);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "DEFINITION_DELETED",
        entityType: "definition",
        entityId: payload.definitionId,
        before: existing
      });
      return { ok: true };
    });
  });

  ipcMain.handle("termSheets:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db
        .prepare("SELECT * FROM term_sheet_versions WHERE loan_id = ? ORDER BY version_no DESC")
        .all(payload.loanId) as DbTermSheetVersion[];
      return rows.map(mapTermSheetVersion);
    });
  });

  ipcMain.handle("termSheets:get", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const row = db
        .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
        .get(payload.termSheetVersionId) as DbTermSheetVersion | undefined;
      if (!row) {
        throw new Error("Term sheet not found");
      }
      return mapTermSheetVersion(row);
    });
  });

  ipcMain.handle("termSheets:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = termSheetCreateSchema.parse(payload.input);
      const currentMax = db
        .prepare("SELECT MAX(version_no) as maxVersion FROM term_sheet_versions WHERE loan_id = ?")
        .get(input.loanId) as { maxVersion: number | null };
      const nextVersion = (currentMax.maxVersion ?? 0) + 1;
      const termSheetId = randomUUID();
      db.prepare(
        "INSERT INTO term_sheet_versions (id, loan_id, version_no, data_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        termSheetId,
        input.loanId,
        nextVersion,
        JSON.stringify(input.data),
        session.userId,
        nowIso()
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "TERM_SHEET_VERSION_CREATED",
        entityType: "term_sheet",
        entityId: termSheetId,
        after: input
      });
      const row = db
        .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
        .get(termSheetId) as DbTermSheetVersion;
      return mapTermSheetVersion(row);
    });
  });

  ipcMain.handle("templates:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const rows = db
        .prepare("SELECT * FROM clause_templates ORDER BY category ASC, title ASC")
        .all() as DbClauseTemplate[];
      return rows.map(mapClauseTemplate);
    });
  });

  ipcMain.handle("templates:get", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const row = db
        .prepare("SELECT * FROM clause_templates WHERE id = ?")
        .get(payload.templateId) as DbClauseTemplate | undefined;
      if (!row) {
        throw new Error("Template not found");
      }
      return mapClauseTemplate(row);
    });
  });

  ipcMain.handle("templates:create", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = templateCreateSchema.parse(payload.input);
      const exists = db
        .prepare("SELECT id FROM clause_templates WHERE key = ?")
        .get(input.key) as { id: string } | undefined;
      if (exists) {
        throw new Error("Template key already exists");
      }
      const templateId = randomUUID();
      db.prepare(
        "INSERT INTO clause_templates (id, key, category, title, body_text, placeholders_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        templateId,
        input.key,
        input.category,
        input.title,
        input.bodyText,
        JSON.stringify(input.placeholders),
        session.userId,
        nowIso(),
        nowIso()
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "TEMPLATE_CREATED",
        entityType: "clause_template",
        entityId: templateId,
        after: input
      });
      const row = db
        .prepare("SELECT * FROM clause_templates WHERE id = ?")
        .get(templateId) as DbClauseTemplate;
      return mapClauseTemplate(row);
    });
  });

  ipcMain.handle("templates:update", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = templateUpdateSchema.parse(payload.input);
      const existing = db
        .prepare("SELECT * FROM clause_templates WHERE id = ?")
        .get(input.id) as DbClauseTemplate | undefined;
      if (!existing) {
        throw new Error("Template not found");
      }
      const merged = {
        key: input.key ?? existing.key,
        category: input.category ?? existing.category,
        title: input.title ?? existing.title,
        body_text: input.bodyText ?? existing.body_text,
        placeholders_json: input.placeholders ? JSON.stringify(input.placeholders) : existing.placeholders_json
      };
      db.prepare(
        "UPDATE clause_templates SET key = ?, category = ?, title = ?, body_text = ?, placeholders_json = ?, updated_at = ? WHERE id = ?"
      ).run(
        merged.key,
        merged.category,
        merged.title,
        merged.body_text,
        merged.placeholders_json,
        nowIso(),
        input.id
      );
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "TEMPLATE_UPDATED",
        entityType: "clause_template",
        entityId: input.id,
        before: existing,
        after: merged
      });
      const row = db
        .prepare("SELECT * FROM clause_templates WHERE id = ?")
        .get(input.id) as DbClauseTemplate;
      return mapClauseTemplate(row);
    });
  });

  ipcMain.handle("templates:delete", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const existing = db
        .prepare("SELECT * FROM clause_templates WHERE id = ?")
        .get(payload.templateId) as DbClauseTemplate | undefined;
      if (!existing) {
        throw new Error("Template not found");
      }
      db.prepare("DELETE FROM clause_templates WHERE id = ?").run(payload.templateId);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "TEMPLATE_DELETED",
        entityType: "clause_template",
        entityId: payload.templateId,
        before: existing
      });
      return { ok: true };
    });
  });

  ipcMain.handle("drafts:generate", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = draftGenerationSchema.parse(payload.input);

      const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(input.loanId) as DbLoan;
      const termSheet = db
        .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
        .get(input.termSheetVersionId) as DbTermSheetVersion | undefined;
      if (!termSheet) {
        throw new Error("Term sheet not found");
      }
      const templates = db
        .prepare(
          `SELECT * FROM clause_templates WHERE key IN (${input.templateKeys.map(() => "?").join(",")})`
        )
        .all(...input.templateKeys) as DbClauseTemplate[];
      if (templates.length === 0) {
        throw new Error("No templates selected");
      }

      const termSheetData = JSON.parse(termSheet.data_json) as {
        facilityType: string;
        commitmentAmount: number;
        marginBps: number;
        maturityDate: string;
        leverageThreshold: number;
        interestCoverageThreshold: number;
        reportingDaysAfterPeriodEnd: number;
        ebitdaAdjustments: string[];
      };
      const variables: Record<string, string | number> = {
        BorrowerName: loan.borrower_name,
        LenderName: loan.lender_name,
        FacilityType: termSheetData.facilityType,
        CommitmentAmount: termSheetData.commitmentAmount,
        MarginBps: termSheetData.marginBps,
        MaturityDate: termSheetData.maturityDate,
        LeverageThreshold: termSheetData.leverageThreshold,
        InterestCoverageThreshold: termSheetData.interestCoverageThreshold,
        DaysAfterPeriodEnd: termSheetData.reportingDaysAfterPeriodEnd,
        EBITDAAdjustments: termSheetData.ebitdaAdjustments.join(", ")
      };

      const sections = templates.map((template) => applyTemplate(template.body_text, variables));
      const html = buildDraftHtml({
        title: `${loan.name} Draft`,
        subtitle: `Term Sheet v${termSheet.version_no}`,
        sections
      });

      const groupRow = db
        .prepare("SELECT * FROM document_groups WHERE loan_id = ? AND type = 'Agreement'")
        .get(input.loanId) as DbDocumentGroup | undefined;
      const groupId = groupRow?.id ?? randomUUID();
      if (!groupRow) {
        db.prepare(
          "INSERT INTO document_groups (id, loan_id, type, name, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(groupId, input.loanId, "Agreement", `${loan.name} Agreement`, nowIso());
      }

      const maxVersion = db
        .prepare("SELECT MAX(version_no) as maxVersion FROM document_versions WHERE document_group_id = ?")
        .get(groupId) as { maxVersion: number | null };
      const nextVersion = (maxVersion.maxVersion ?? 0) + 1;
      const documentVersionId = randomUUID();
      const filename = `${loan.name.replace(/\s+/g, "_")}_Draft_v${nextVersion}.html`;
      const filePath = path.join(storage.documentsDir, `${documentVersionId}_${filename}`);
      fs.writeFileSync(filePath, html, "utf8");
      const sha256 = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
      db.prepare(
        "INSERT INTO document_versions (id, document_group_id, version_no, filename, file_path, sha256, created_by, created_at, source, term_sheet_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        documentVersionId,
        groupId,
        nextVersion,
        filename,
        filePath,
        sha256,
        session.userId,
        nowIso(),
        "Generated",
        termSheet.id
      );

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "DOC_VERSION_CREATED",
        entityType: "document_version",
        entityId: documentVersionId,
        after: { loanId: input.loanId, termSheetVersionId: termSheet.id }
      });

      const row = db
        .prepare("SELECT * FROM document_versions WHERE id = ?")
        .get(documentVersionId) as DbDocumentVersion;
      return mapDocumentVersion(row);
    });
  });

  ipcMain.handle("diffs:semantic", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const input = semanticDiffSchema.parse(payload.input);
      const versionA = db
        .prepare("SELECT * FROM document_versions WHERE id = ?")
        .get(input.documentVersionAId) as DbDocumentVersion | undefined;
      const versionB = db
        .prepare("SELECT * FROM document_versions WHERE id = ?")
        .get(input.documentVersionBId) as DbDocumentVersion | undefined;
      if (!versionA || !versionB) {
        throw new Error("Document versions not found");
      }
      if (!versionA.term_sheet_version_id || !versionB.term_sheet_version_id) {
        throw new Error("Document versions are missing term sheet links");
      }
      const termA = db
        .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
        .get(versionA.term_sheet_version_id) as DbTermSheetVersion;
      const termB = db
        .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
        .get(versionB.term_sheet_version_id) as DbTermSheetVersion;
      const diff = computeSemanticDiff({
        from: JSON.parse(termA.data_json),
        to: JSON.parse(termB.data_json)
      }) as SemanticDiffItem[];

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "SEMANTIC_DIFF_VIEWED",
        entityType: "loan",
        entityId: input.loanId,
        after: { documentVersionAId: versionA.id, documentVersionBId: versionB.id }
      });

      return diff;
    });
  });

  ipcMain.handle("consistency:run", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = consistencyRunSchema.parse(payload.input);
      const obligations = db
        .prepare("SELECT * FROM obligations WHERE loan_id = ?")
        .all(input.loanId) as DbObligation[];
      const obligationInstances = db
        .prepare(
          "SELECT oi.* FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ?"
        )
        .all(input.loanId) as DbObligationInstance[];
      const covenants = db
        .prepare("SELECT * FROM covenants WHERE loan_id = ?")
        .all(input.loanId) as DbCovenant[];
      const formulas = db
        .prepare("SELECT * FROM formulas")
        .all() as DbFormula[];
      const definitions = db
        .prepare("SELECT * FROM definitions WHERE loan_id = ?")
        .all(input.loanId) as DbDefinition[];
      const clauses = db
        .prepare(
          "SELECT c.* FROM clauses c JOIN documents d ON d.id = c.document_id WHERE d.loan_id = ?"
        )
        .all(input.loanId) as DbClause[];

      let termSheetData: TermSheetData | null = null;
      if (input.documentVersionId) {
        const version = db
          .prepare("SELECT * FROM document_versions WHERE id = ?")
          .get(input.documentVersionId) as DbDocumentVersion | undefined;
        if (version?.term_sheet_version_id) {
          const termSheet = db
            .prepare("SELECT * FROM term_sheet_versions WHERE id = ?")
            .get(version.term_sheet_version_id) as DbTermSheetVersion | undefined;
          termSheetData = termSheet ? (JSON.parse(termSheet.data_json) as TermSheetData) : null;
        }
      } else {
        const termSheet = db
          .prepare(
            "SELECT * FROM term_sheet_versions WHERE loan_id = ? ORDER BY version_no DESC LIMIT 1"
          )
          .get(input.loanId) as DbTermSheetVersion | undefined;
        termSheetData = termSheet ? (JSON.parse(termSheet.data_json) as TermSheetData) : null;
      }

      const findings = runConsistencyChecks({
        termSheet: termSheetData,
        obligations: obligations.map(mapObligation),
        obligationInstances: obligationInstances.map(mapObligationInstance),
        covenants: covenants.map(mapCovenant),
        formulas: formulas.map((formula) => ({
          id: formula.id,
          expression: JSON.parse(formula.expression_json)
        })),
        definitions: definitions.map(mapDefinition),
        clauses: clauses.map(mapClause)
      });

      findings.forEach((finding) => {
        db.prepare(
          "INSERT INTO consistency_findings (id, loan_id, document_version_id, rule_key, severity, message, affected_entity_type, affected_entity_id, status, created_at, resolved_at, resolved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          randomUUID(),
          input.loanId,
          input.documentVersionId ?? null,
          finding.ruleKey,
          finding.severity,
          finding.message,
          finding.affectedEntityType,
          finding.affectedEntityId,
          "Open",
          nowIso(),
          null,
          null
        );
      });

      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "CONSISTENCY_CHECK_RUN",
        entityType: "loan",
        entityId: input.loanId,
        after: { count: findings.length }
      });

      const rows = db
        .prepare("SELECT * FROM consistency_findings WHERE loan_id = ? ORDER BY created_at DESC")
        .all(input.loanId) as DbConsistencyFinding[];
      return rows.map(mapConsistencyFinding);
    });
  });

  ipcMain.handle("consistency:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db
        .prepare("SELECT * FROM consistency_findings WHERE loan_id = ? ORDER BY created_at DESC")
        .all(payload.loanId) as DbConsistencyFinding[];
      return rows.map(mapConsistencyFinding);
    });
  });

  ipcMain.handle("consistency:resolve", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = consistencyResolveSchema.parse(payload.input);
      const existing = db
        .prepare("SELECT * FROM consistency_findings WHERE id = ?")
        .get(input.findingId) as DbConsistencyFinding | undefined;
      if (!existing) {
        throw new Error("Finding not found");
      }
      db.prepare(
        "UPDATE consistency_findings SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?"
      ).run("Resolved", nowIso(), session.userId, input.findingId);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "CONSISTENCY_FINDING_RESOLVED",
        entityType: "consistency_finding",
        entityId: input.findingId,
        before: existing
      });
      const row = db
        .prepare("SELECT * FROM consistency_findings WHERE id = ?")
        .get(input.findingId) as DbConsistencyFinding;
      return mapConsistencyFinding(row);
    });
  });

  ipcMain.handle("green:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return greenRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("green:latest", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return greenRepo.getLatest(payload.loanId);
    });
  });

  ipcMain.handle("green:save", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = greenAssessmentSaveSchema.parse(payload.input);
      const assessment = saveGreenAssessment({
        repo: greenRepo,
        loanId: input.loanId,
        inputs: input.inputs as GreenAssessmentInputs,
        createdBy: session.userId
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "GREEN_ASSESSMENT_SAVED",
        entityType: "green_assessment",
        entityId: assessment.id,
        after: input
      });
      return assessment;
    });
  });

  ipcMain.handle("green:evidence:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return greenRepo.listEvidenceTags(payload.loanId);
    });
  });

  ipcMain.handle("green:evidence:add", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = greenEvidenceTagSchema.parse(payload.input);
      const tag = greenRepo.addEvidenceTag({
        loanId: input.loanId,
        documentId: input.documentId,
        category: input.category,
        snippet: input.snippet,
        pageNumber: input.pageNumber ?? null,
        createdBy: session.userId
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "GREEN_EVIDENCE_TAG_ADDED",
        entityType: "green_evidence",
        entityId: tag.id,
        after: input
      });
      return tag;
    });
  });

  ipcMain.handle("attachments:add", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "BorrowerReporter", "LenderOps"]);
      const result = await dialog.showOpenDialog({
        title: "Add Attachment",
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error("No file selected");
      }
      const imported = importFile({
        sourcePath: result.filePaths[0],
        destinationDir: storage.attachmentsDir
      });
      db.prepare(
        "INSERT INTO attachments (id, submission_id, filename, file_path, mime_type, size_bytes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        payload.submissionId,
        imported.filename,
        imported.filePath,
        imported.mimeType,
        imported.sizeBytes,
        nowIso()
      );
      return { ok: true };
    });
  });

  ipcMain.handle("attachments:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const rows = db
        .prepare("SELECT * FROM attachments WHERE submission_id = ? ORDER BY uploaded_at DESC")
        .all(payload.submissionId) as DbAttachment[];
      return rows.map(mapAttachment);
    });
  });

  ipcMain.handle("attachments:dataUrl", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const row = db
        .prepare("SELECT * FROM attachments WHERE id = ?")
        .get(payload.attachmentId) as DbAttachment | undefined;
      if (!row) {
        throw new Error("Attachment not found");
      }
      const dataUrl = readFileAsDataUrl({
        filePath: row.file_path,
        allowedDirs: [storage.attachmentsDir],
        mimeType: row.mime_type
      });
      return { dataUrl, filename: row.filename };
    });
  });

  ipcMain.handle("waivers:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return waiversRepo.listByLoan(payload.loanId);
    });
  });

  ipcMain.handle("waivers:request", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter"]);
      const input = waiverCreateSchema.parse(payload.input);
      const waiver = waiversRepo.create(input, session.userId);
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "request",
        entityType: "waiver",
        entityId: waiver.id,
        after: input
      });
      return waiver;
    });
  });

  ipcMain.handle("waivers:decide", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const input = waiverDecisionSchema.parse(payload.input);
      const waiver = waiversRepo.decide({
        waiverId: input.waiverId,
        status: input.status,
        decidedBy: session.userId,
        decisionNote: input.decisionNote,
        conditions: input.conditions,
        expiryDate: input.expiryDate ?? null
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "decide",
        entityType: "waiver",
        entityId: input.waiverId,
        after: input
      });
      return waiver;
    });
  });

  ipcMain.handle("waivers:attachments:add", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "BorrowerReporter", "LenderOps"]);
      const result = await dialog.showOpenDialog({
        title: "Add Waiver Attachment",
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error("No file selected");
      }
      const imported = importFile({
        sourcePath: result.filePaths[0],
        destinationDir: storage.attachmentsDir
      });
      waiversRepo.addAttachment({
        waiverId: payload.waiverId,
        filename: imported.filename,
        filePath: imported.filePath,
        mimeType: imported.mimeType,
        sizeBytes: imported.sizeBytes
      });
      return { ok: true };
    });
  });

  ipcMain.handle("waivers:attachments:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      return waiversRepo.listAttachments(payload.waiverId);
    });
  });

  ipcMain.handle("waivers:attachments:dataUrl", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "BorrowerReporter", "Auditor"]);
      const row = db
        .prepare("SELECT * FROM waiver_attachments WHERE id = ?")
        .get(payload.attachmentId) as {
        id: string;
        file_path: string;
        mime_type: string;
        filename: string;
      } | undefined;
      if (!row) {
        throw new Error("Attachment not found");
      }
      const dataUrl = readFileAsDataUrl({
        filePath: row.file_path,
        allowedDirs: [storage.attachmentsDir],
        mimeType: row.mime_type
      });
      return { dataUrl, filename: row.filename };
    });
  });

  ipcMain.handle("audit:list", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      return auditRepo.listForLoan(payload.loanId);
    });
  });

  ipcMain.handle("alerts:dashboard", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, [
        "Admin",
        "LenderOps",
        "BorrowerReporter",
        "Auditor"
      ]);
      return buildDashboardSummary(db);
    });
  });

  ipcMain.handle("exports:csv", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      const folder = await dialog.showOpenDialog({
        title: "Select export folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (folder.canceled || folder.filePaths.length === 0) {
        throw new Error("Export canceled");
      }
      return exportCsv({
        db,
        loanId: payload.loanId,
        targetDir: folder.filePaths[0],
        createdBy: session.userId
      });
    });
  });

  ipcMain.handle("exports:pdf", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      const folder = await dialog.showOpenDialog({
        title: "Select export folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (folder.canceled || folder.filePaths.length === 0) {
        throw new Error("Export canceled");
      }
      return exportPdf({
        db,
        loanId: payload.loanId,
        targetDir: folder.filePaths[0],
        createdBy: session.userId
      });
    });
  });

  ipcMain.handle("exports:history", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      return exportHistoryRepo.list({ loanId: payload.loanId });
    });
  });

  ipcMain.handle("exports:openFolder", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      shell.showItemInFolder(payload.path);
      return { ok: true };
    });
  });

  ipcMain.handle("interop:export", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      const input = interoperabilityExportSchema.parse(payload.input);
      const folder = await dialog.showOpenDialog({
        title: "Select export folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (folder.canceled || folder.filePaths.length === 0) {
        throw new Error("Export canceled");
      }
      const result = await exportJson({
        db,
        loanId: input.loanId,
        targetDir: folder.filePaths[0],
        createdBy: session.userId,
        appVersion: app.getVersion(),
        includeAuditEvents: input.includeAuditEvents,
        includeDocumentsMetadataOnly: input.includeDocumentsMetadataOnly
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "EXPORT_SCHEMA",
        entityType: "loan",
        entityId: input.loanId,
        after: { path: result.path }
      });
      return { path: result.path };
    });
  });

  ipcMain.handle("interop:previewImport", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      try {
        const result = await dialog.showOpenDialog({
          title: "Import Loan Obligation Schema",
          filters: [{ name: "JSON", extensions: ["json"] }],
          properties: ["openFile"]
        });
        if (result.canceled || result.filePaths.length === 0) {
          throw new Error("Import canceled");
        }
        const schema = readSchemaFile(result.filePaths[0]);
        const summary = {
          loanName: schema.loan.name,
          parties: schema.parties.length,
          documents: schema.documents.length,
          clauses: schema.clauses.length,
          obligations: schema.obligations.length,
          covenants: schema.covenants.length
        };
        return { summary, payload: schema };
      } catch (error) {
        logAuditEvent({
          db,
          actorUserId: session.userId,
          action: "IMPORT_SCHEMA_FAILED",
          entityType: "loan_schema",
          entityId: "preview",
          after: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    });
  });

  ipcMain.handle("interop:import", async (_event, payload) => {
    return wrap(async () => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps"]);
      const schema = payload.schema as LoanObligationSchemaV01;
      const result = await importLoanObligationSchema({
        db,
        payload: schema,
        documentsDir: storage.documentsDir,
        actorUserId: session.userId
      });
      logAuditEvent({
        db,
        actorUserId: session.userId,
        action: "IMPORT_SCHEMA",
        entityType: "loan",
        entityId: result.loanId,
        after: { sourceLoanId: schema.loan.id }
      });
      return result;
    });
  });

  ipcMain.handle("integrations:status", async (_event, payload) => {
    return wrap(() => {
      const session = requireSession(payload.sessionId);
      assertRole(session, ["Admin", "LenderOps", "Auditor"]);
      return integrations.map((integration) => integration.getStatus());
    });
  });
}

function getLoanStartDate(db: SqliteDatabase, loanId: string): string {
  const row = db.prepare("SELECT start_date FROM loans WHERE id = ?").get(loanId) as {
    start_date: string;
  };
  return row?.start_date ?? new Date().toISOString();
}

type DbUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: User["role"];
  created_at: string;
};

type DbLoan = {
  id: string;
  name: string;
  borrower_name: string;
  lender_name: string;
  currency: string;
  start_date: string;
  status: Loan["status"];
  created_at: string;
};

type DbDocument = {
  id: string;
  loan_id: string;
  filename: string;
  file_path: string;
  sha256: string;
  uploaded_by: string;
  uploaded_at: string;
};

type DbDocumentGroup = {
  id: string;
  loan_id: string;
  type: DocumentGroup["type"];
  name: string;
  created_at: string;
};

type DbDocumentVersion = {
  id: string;
  document_group_id: string;
  version_no: number;
  filename: string;
  file_path: string;
  sha256: string;
  created_by: string;
  created_at: string;
  source: DocumentVersion["source"];
  term_sheet_version_id: string | null;
};

type DbExtractionRun = {
  id: string;
  document_id: string | null;
  document_version_id: string | null;
  adapter_key: string;
  status: ExtractionRun["status"];
  started_at: string;
  finished_at: string | null;
  summary_json: string | null;
};

type DbExtractedSuggestion = {
  id: string;
  extraction_run_id: string;
  suggestion_type: ExtractedSuggestion["suggestionType"];
  payload_json: string;
  confidence: number;
  status: ExtractedSuggestion["status"];
  created_at: string;
  updated_at: string;
};

type DbDefinition = {
  id: string;
  loan_id: string;
  term: string;
  definition_text: string;
  source_clause_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type DbTermSheetVersion = {
  id: string;
  loan_id: string;
  version_no: number;
  data_json: string;
  created_by: string;
  created_at: string;
};

type DbClauseTemplate = {
  id: string;
  key: string;
  category: string;
  title: string;
  body_text: string;
  placeholders_json: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type DbConsistencyFinding = {
  id: string;
  loan_id: string;
  document_version_id: string | null;
  rule_key: string;
  severity: ConsistencyFinding["severity"];
  message: string;
  affected_entity_type: string;
  affected_entity_id: string;
  status: ConsistencyFinding["status"];
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

type DbClause = {
  id: string;
  document_id: string;
  clause_type: Clause["clauseType"];
  title: string;
  text_snippet: string;
  page_number: number;
  tags_json: string;
  created_by: string;
  created_at: string;
};

type DbObligation = {
  id: string;
  loan_id: string;
  title: string;
  description: string;
  frequency: Obligation["frequency"];
  due_rule_json: string;
  owner_party: Obligation["ownerParty"];
  severity: Obligation["severity"];
  status: Obligation["status"];
  source_clause_id: string | null;
  created_at: string;
};

type DbObligationInstance = {
  id: string;
  obligation_id: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string;
  status: ObligationInstance["status"];
  last_reminder_at: string | null;
};

type DbCovenant = {
  id: string;
  loan_id: string;
  name: string;
  covenant_type: Covenant["covenantType"];
  formula_id: string;
  threshold_op: Covenant["thresholdOp"];
  threshold_value: number;
  frequency: Covenant["frequency"];
  source_clause_id: string | null;
  status: Covenant["status"];
};

type DbFormula = {
  id: string;
  key: string;
  name: string;
  expression_json: string;
  description: string;
};

type DbCovenantResult = {
  id: string;
  covenant_id: string;
  period_start: string | null;
  period_end: string | null;
  computed_value: number;
  threshold_value: number;
  pass_fail: "Pass" | "Fail";
  computed_at: string;
  computed_by: string;
  notes: string | null;
};

type DbSubmission = {
  id: string;
  loan_id: string;
  submitter_user_id: string;
  type: Submission["type"];
  period_start: string | null;
  period_end: string | null;
  status: Submission["status"];
  submitted_at: string | null;
  review_notes: string | null;
};

type DbAttachment = {
  id: string;
  submission_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

type DbWaiver = {
  id: string;
  loan_id: string;
  related_type: Waiver["relatedType"];
  related_id: string;
  reason: string;
  requested_by: string;
  status: Waiver["status"];
  decided_by: string | null;
  decided_at: string | null;
  period_start: string | null;
  period_end: string | null;
  proposed_remedy_date: string | null;
  decision_note: string | null;
  conditions: string | null;
  expiry_date: string | null;
};

type DbAudit = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
};

function mapUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}

function mapLoan(row: DbLoan): Loan {
  return {
    id: row.id,
    name: row.name,
    borrowerName: row.borrower_name,
    lenderName: row.lender_name,
    currency: row.currency,
    startDate: row.start_date,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapDocument(row: DbDocument): Document {
  return {
    id: row.id,
    loanId: row.loan_id,
    filename: row.filename,
    filePath: row.file_path,
    sha256: row.sha256,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at
  };
}

function mapDocumentGroup(row: DbDocumentGroup): DocumentGroup {
  return {
    id: row.id,
    loanId: row.loan_id,
    type: row.type,
    name: row.name,
    createdAt: row.created_at
  };
}

function mapDocumentVersion(row: DbDocumentVersion): DocumentVersion {
  return {
    id: row.id,
    documentGroupId: row.document_group_id,
    versionNo: row.version_no,
    filename: row.filename,
    filePath: row.file_path,
    sha256: row.sha256,
    createdBy: row.created_by,
    createdAt: row.created_at,
    source: row.source,
    termSheetVersionId: row.term_sheet_version_id
  };
}

function mapExtractionRun(row: DbExtractionRun): ExtractionRun {
  return {
    id: row.id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    adapterKey: row.adapter_key,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    summaryJson: row.summary_json
  };
}

function mapExtractedSuggestion(row: DbExtractedSuggestion): ExtractedSuggestion {
  return {
    id: row.id,
    extractionRunId: row.extraction_run_id,
    suggestionType: row.suggestion_type,
    payloadJson: row.payload_json,
    confidence: row.confidence,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDefinition(row: DbDefinition): Definition {
  return {
    id: row.id,
    loanId: row.loan_id,
    term: row.term,
    definitionText: row.definition_text,
    sourceClauseId: row.source_clause_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTermSheetVersion(row: DbTermSheetVersion): TermSheetVersion {
  return {
    id: row.id,
    loanId: row.loan_id,
    versionNo: row.version_no,
    dataJson: row.data_json,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapClauseTemplate(row: DbClauseTemplate): ClauseTemplate {
  return {
    id: row.id,
    key: row.key,
    category: row.category,
    title: row.title,
    bodyText: row.body_text,
    placeholdersJson: row.placeholders_json,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapConsistencyFinding(row: DbConsistencyFinding): ConsistencyFinding {
  return {
    id: row.id,
    loanId: row.loan_id,
    documentVersionId: row.document_version_id,
    ruleKey: row.rule_key,
    severity: row.severity,
    message: row.message,
    affectedEntityType: row.affected_entity_type,
    affectedEntityId: row.affected_entity_id,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by
  };
}

function mapClause(row: DbClause): Clause {
  return {
    id: row.id,
    documentId: row.document_id,
    clauseType: row.clause_type,
    title: row.title,
    textSnippet: row.text_snippet,
    pageNumber: row.page_number,
    tagsJson: row.tags_json,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapObligation(row: DbObligation): Obligation {
  return {
    id: row.id,
    loanId: row.loan_id,
    title: row.title,
    description: row.description,
    frequency: row.frequency,
    dueRuleJson: row.due_rule_json,
    ownerParty: row.owner_party,
    severity: row.severity,
    status: row.status,
    sourceClauseId: row.source_clause_id,
    createdAt: row.created_at
  };
}

function mapObligationInstance(row: DbObligationInstance): ObligationInstance {
  return {
    id: row.id,
    obligationId: row.obligation_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueDate: row.due_date,
    status: row.status,
    lastReminderAt: row.last_reminder_at
  };
}

function mapCovenant(row: DbCovenant): Covenant {
  return {
    id: row.id,
    loanId: row.loan_id,
    name: row.name,
    covenantType: row.covenant_type,
    formulaId: row.formula_id,
    thresholdOp: row.threshold_op,
    thresholdValue: row.threshold_value,
    frequency: row.frequency,
    sourceClauseId: row.source_clause_id,
    status: row.status
  };
}

function mapCovenantResult(row: DbCovenantResult): CovenantResult {
  return {
    id: row.id,
    covenantId: row.covenant_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    computedValue: row.computed_value,
    thresholdValue: row.threshold_value,
    passFail: row.pass_fail,
    computedAt: row.computed_at,
    computedBy: row.computed_by,
    notes: row.notes
  };
}

function mapSubmission(row: DbSubmission): Submission {
  return {
    id: row.id,
    loanId: row.loan_id,
    submitterUserId: row.submitter_user_id,
    type: row.type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewNotes: row.review_notes
  };
}

function mapAttachment(row: DbAttachment): Attachment {
  return {
    id: row.id,
    submissionId: row.submission_id,
    filename: row.filename,
    filePath: row.file_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at
  };
}

function mapWaiver(row: DbWaiver): Waiver {
  return {
    id: row.id,
    loanId: row.loan_id,
    relatedType: row.related_type,
    relatedId: row.related_id,
    reason: row.reason,
    requestedBy: row.requested_by,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    proposedRemedyDate: row.proposed_remedy_date,
    decisionNote: row.decision_note,
    conditions: row.conditions,
    expiryDate: row.expiry_date
  };
}

function mapAuditEvent(row: DbAudit) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeJson: row.before_json,
    afterJson: row.after_json,
    createdAt: row.created_at
  };
}
