import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Attachment, Submission, SubmissionCreateInput, SubmissionItem } from "@covenantpulse/shared";
import { nowIso } from "./utils";

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

type DbSubmissionItem = {
  id: string;
  submission_id: string;
  obligation_instance_id: string | null;
  key: string;
  value_text: string | null;
  value_number: number | null;
  value_json: string | null;
  notes: string | null;
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

function mapItem(row: DbSubmissionItem): SubmissionItem {
  return {
    id: row.id,
    submissionId: row.submission_id,
    obligationInstanceId: row.obligation_instance_id,
    key: row.key,
    valueText: row.value_text,
    valueNumber: row.value_number,
    valueJson: row.value_json,
    notes: row.notes
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

export class SubmissionsRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): Submission[] {
    const rows = this.db
      .prepare("SELECT * FROM submissions WHERE loan_id = ? ORDER BY submitted_at DESC")
      .all(loanId) as DbSubmission[];
    return rows.map(mapSubmission);
  }

  getById(submissionId: string): Submission | null {
    const row = this.db
      .prepare("SELECT * FROM submissions WHERE id = ?")
      .get(submissionId) as DbSubmission | undefined;
    return row ? mapSubmission(row) : null;
  }

  create(input: SubmissionCreateInput): Submission {
    const submissionId = randomUUID();
    this.db
      .prepare(
        "INSERT INTO submissions (id, loan_id, submitter_user_id, type, period_start, period_end, status, submitted_at, review_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        submissionId,
        input.loanId,
        input.submitterUserId,
        input.type,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.status,
        input.status === "Submitted" ? nowIso() : null,
        null
      );

    input.items.forEach((item) => {
      this.db
        .prepare(
          "INSERT INTO submission_items (id, submission_id, obligation_instance_id, key, value_text, value_number, value_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          randomUUID(),
          submissionId,
          item.obligationInstanceId ?? null,
          item.key,
          item.valueText ?? null,
          item.valueNumber ?? null,
          item.valueJson ?? null,
          item.notes ?? null
        );
    });

    const row = this.db
      .prepare("SELECT * FROM submissions WHERE id = ?")
      .get(submissionId) as DbSubmission;
    return mapSubmission(row);
  }

  updateStatus(params: {
    submissionId: string;
    status: Submission["status"];
    reviewNotes?: string | null;
    submittedAt?: string | null;
  }): Submission {
    const existing = this.db
      .prepare("SELECT submitted_at FROM submissions WHERE id = ?")
      .get(params.submissionId) as { submitted_at: string | null } | undefined;
    if (!existing) {
      throw new Error("Submission not found");
    }
    const submittedAt = params.submittedAt ?? existing.submitted_at;
    this.db
      .prepare("UPDATE submissions SET status = ?, review_notes = ?, submitted_at = ? WHERE id = ?")
      .run(params.status, params.reviewNotes ?? null, submittedAt, params.submissionId);
    const row = this.db
      .prepare("SELECT * FROM submissions WHERE id = ?")
      .get(params.submissionId) as DbSubmission;
    return mapSubmission(row);
  }

  listItems(submissionId: string): SubmissionItem[] {
    const rows = this.db
      .prepare("SELECT * FROM submission_items WHERE submission_id = ?")
      .all(submissionId) as DbSubmissionItem[];
    return rows.map(mapItem);
  }

  listAttachments(submissionId: string): Attachment[] {
    const rows = this.db
      .prepare("SELECT * FROM attachments WHERE submission_id = ? ORDER BY uploaded_at DESC")
      .all(submissionId) as DbAttachment[];
    return rows.map(mapAttachment);
  }
}
