import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Clause, Document, DocumentVersion } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbDocument = {
  id: string;
  loan_id: string;
  filename: string;
  file_path: string;
  sha256: string;
  uploaded_by: string;
  uploaded_at: string;
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
  source: string;
  term_sheet_version_id: string | null;
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
    source: row.source as DocumentVersion["source"],
    termSheetVersionId: row.term_sheet_version_id
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

export class DocumentsRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listByLoan(loanId: string): Document[] {
    const rows = this.db
      .prepare("SELECT * FROM documents WHERE loan_id = ? ORDER BY uploaded_at DESC")
      .all(loanId) as DbDocument[];
    return rows.map(mapDocument);
  }

  get(documentId: string): Document | null {
    const row = this.db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(documentId) as DbDocument | undefined;
    return row ? mapDocument(row) : null;
  }

  create(params: {
    loanId: string;
    filename: string;
    filePath: string;
    sha256: string;
    uploadedBy: string;
  }): Document {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO documents (id, loan_id, filename, file_path, sha256, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(id, params.loanId, params.filename, params.filePath, params.sha256, params.uploadedBy, nowIso());
    const row = this.db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as DbDocument;
    return mapDocument(row);
  }

  listVersionsByLoan(loanId: string): DocumentVersion[] {
    const rows = this.db
      .prepare(
        "SELECT dv.* FROM document_versions dv JOIN document_groups dg ON dg.id = dv.document_group_id WHERE dg.loan_id = ? ORDER BY dv.created_at DESC"
      )
      .all(loanId) as DbDocumentVersion[];
    return rows.map(mapDocumentVersion);
  }

  listClauses(documentId: string): Clause[] {
    const rows = this.db
      .prepare("SELECT * FROM clauses WHERE document_id = ? ORDER BY created_at DESC")
      .all(documentId) as DbClause[];
    return rows.map(mapClause);
  }

  createClause(params: {
    documentId: string;
    clauseType: Clause["clauseType"];
    title: string;
    textSnippet: string;
    pageNumber: number;
    tags: string[];
    createdBy: string;
  }): Clause {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO clauses (id, document_id, clause_type, title, text_snippet, page_number, tags_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        params.documentId,
        params.clauseType,
        params.title,
        params.textSnippet,
        params.pageNumber,
        JSON.stringify(params.tags),
        params.createdBy,
        nowIso()
      );
    const row = this.db
      .prepare("SELECT * FROM clauses WHERE id = ?")
      .get(id) as DbClause;
    return mapClause(row);
  }
}
