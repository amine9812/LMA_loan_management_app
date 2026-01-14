import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { GreenAssessment, GreenEvidenceTag } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbGreenAssessment = {
  id: string;
  loan_id: string;
  version_no: number;
  inputs_json: string;
  breakdown_json: string;
  score: number;
  verdict: string;
  red_flags_json: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type DbEvidenceTag = {
  id: string;
  loan_id: string;
  document_id: string;
  category: string;
  snippet: string;
  page_number: number | null;
  created_by: string;
  created_at: string;
};

function mapAssessment(row: DbGreenAssessment): GreenAssessment {
  return {
    id: row.id,
    loanId: row.loan_id,
    versionNo: row.version_no,
    inputsJson: row.inputs_json,
    breakdownJson: row.breakdown_json,
    score: row.score,
    verdict: row.verdict as GreenAssessment["verdict"],
    redFlagsJson: row.red_flags_json,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEvidence(row: DbEvidenceTag): GreenEvidenceTag {
  return {
    id: row.id,
    loanId: row.loan_id,
    documentId: row.document_id,
    category: row.category,
    snippet: row.snippet,
    pageNumber: row.page_number,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export class GreenAssessmentRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): GreenAssessment[] {
    const rows = this.db
      .prepare("SELECT * FROM green_assessments WHERE loan_id = ? ORDER BY version_no DESC")
      .all(loanId) as DbGreenAssessment[];
    return rows.map(mapAssessment);
  }

  getLatest(loanId: string): GreenAssessment | null {
    const row = this.db
      .prepare("SELECT * FROM green_assessments WHERE loan_id = ? ORDER BY version_no DESC LIMIT 1")
      .get(loanId) as DbGreenAssessment | undefined;
    return row ? mapAssessment(row) : null;
  }

  create(params: {
    loanId: string;
    versionNo: number;
    inputsJson: string;
    breakdownJson: string;
    score: number;
    verdict: GreenAssessment["verdict"];
    redFlagsJson: string | null;
    createdBy: string;
  }): GreenAssessment {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO green_assessments (id, loan_id, version_no, inputs_json, breakdown_json, score, verdict, red_flags_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        params.loanId,
        params.versionNo,
        params.inputsJson,
        params.breakdownJson,
        params.score,
        params.verdict,
        params.redFlagsJson,
        params.createdBy,
        nowIso(),
        nowIso()
      );
    const row = this.db
      .prepare("SELECT * FROM green_assessments WHERE id = ?")
      .get(id) as DbGreenAssessment;
    return mapAssessment(row);
  }

  listEvidenceTags(loanId: string): GreenEvidenceTag[] {
    const rows = this.db
      .prepare("SELECT * FROM green_evidence_tags WHERE loan_id = ? ORDER BY created_at DESC")
      .all(loanId) as DbEvidenceTag[];
    return rows.map(mapEvidence);
  }

  addEvidenceTag(params: {
    loanId: string;
    documentId: string;
    category: string;
    snippet: string;
    pageNumber: number | null;
    createdBy: string;
  }): GreenEvidenceTag {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO green_evidence_tags (id, loan_id, document_id, category, snippet, page_number, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        params.loanId,
        params.documentId,
        params.category,
        params.snippet,
        params.pageNumber,
        params.createdBy,
        nowIso()
      );
    const row = this.db
      .prepare("SELECT * FROM green_evidence_tags WHERE id = ?")
      .get(id) as DbEvidenceTag;
    return mapEvidence(row);
  }
}
