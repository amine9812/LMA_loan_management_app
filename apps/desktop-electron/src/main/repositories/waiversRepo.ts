import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Attachment, Waiver, WaiverCreateInput } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbWaiver = {
  id: string;
  loan_id: string;
  related_type: string;
  related_id: string;
  reason: string;
  requested_by: string;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  period_start: string | null;
  period_end: string | null;
  proposed_remedy_date: string | null;
  decision_note: string | null;
  conditions: string | null;
  expiry_date: string | null;
};

type DbAttachment = {
  id: string;
  waiver_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

function mapWaiver(row: DbWaiver): Waiver {
  return {
    id: row.id,
    loanId: row.loan_id,
    relatedType: row.related_type as Waiver["relatedType"],
    relatedId: row.related_id,
    reason: row.reason,
    requestedBy: row.requested_by,
    status: row.status as Waiver["status"],
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

function mapAttachment(row: DbAttachment): Attachment {
  return {
    id: row.id,
    submissionId: row.waiver_id,
    filename: row.filename,
    filePath: row.file_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at
  };
}

export class WaiversRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): Waiver[] {
    const rows = this.db
      .prepare("SELECT * FROM waivers WHERE loan_id = ? ORDER BY decided_at DESC")
      .all(loanId) as DbWaiver[];
    return rows.map(mapWaiver);
  }

  create(input: WaiverCreateInput, requestedBy: string): Waiver {
    const waiverId = randomUUID();
    this.db
      .prepare(
        "INSERT INTO waivers (id, loan_id, related_type, related_id, reason, requested_by, status, decided_by, decided_at, period_start, period_end, proposed_remedy_date, decision_note, conditions, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        waiverId,
        input.loanId,
        input.relatedType,
        input.relatedId,
        input.reason,
        requestedBy,
        "Requested",
        null,
        null,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.proposedRemedyDate ?? null,
        null,
        input.conditions ?? null,
        input.expiryDate ?? null
      );
    const row = this.db
      .prepare("SELECT * FROM waivers WHERE id = ?")
      .get(waiverId) as DbWaiver;
    return mapWaiver(row);
  }

  decide(params: {
    waiverId: string;
    status: "Approved" | "Rejected";
    decidedBy: string;
    decisionNote?: string;
    conditions?: string;
    expiryDate?: string | null;
  }): Waiver {
    this.db
      .prepare(
        "UPDATE waivers SET status = ?, decided_by = ?, decided_at = ?, decision_note = ?, conditions = ?, expiry_date = ? WHERE id = ?"
      )
      .run(
        params.status,
        params.decidedBy,
        nowIso(),
        params.decisionNote ?? null,
        params.conditions ?? null,
        params.expiryDate ?? null,
        params.waiverId
      );
    const row = this.db
      .prepare("SELECT * FROM waivers WHERE id = ?")
      .get(params.waiverId) as DbWaiver;
    return mapWaiver(row);
  }

  addAttachment(params: {
    waiverId: string;
    filename: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): void {
    this.db
      .prepare(
        "INSERT INTO waiver_attachments (id, waiver_id, filename, file_path, mime_type, size_bytes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        randomUUID(),
        params.waiverId,
        params.filename,
        params.filePath,
        params.mimeType,
        params.sizeBytes,
        nowIso()
      );
  }

  listAttachments(waiverId: string): Attachment[] {
    const rows = this.db
      .prepare("SELECT * FROM waiver_attachments WHERE waiver_id = ? ORDER BY uploaded_at DESC")
      .all(waiverId) as DbAttachment[];
    return rows.map(mapAttachment);
  }
}
