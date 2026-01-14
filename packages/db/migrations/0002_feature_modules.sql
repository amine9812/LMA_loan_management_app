BEGIN;

CREATE TABLE IF NOT EXISTS definitions (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  term TEXT NOT NULL,
  definition_text TEXT NOT NULL,
  source_clause_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id),
  FOREIGN KEY (source_clause_id) REFERENCES clauses (id)
);

CREATE TABLE IF NOT EXISTS document_groups (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_group_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  term_sheet_version_id TEXT,
  FOREIGN KEY (document_group_id) REFERENCES document_groups (id),
  FOREIGN KEY (term_sheet_version_id) REFERENCES term_sheet_versions (id)
);

CREATE TABLE IF NOT EXISTS extraction_runs (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  document_version_id TEXT,
  adapter_key TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  summary_json TEXT,
  FOREIGN KEY (document_id) REFERENCES documents (id),
  FOREIGN KEY (document_version_id) REFERENCES document_versions (id)
);

CREATE TABLE IF NOT EXISTS extracted_suggestions (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (extraction_run_id) REFERENCES extraction_runs (id)
);

CREATE TABLE IF NOT EXISTS term_sheet_versions (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS clause_templates (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  placeholders_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consistency_findings (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  document_version_id TEXT,
  rule_key TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  affected_entity_type TEXT NOT NULL,
  affected_entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  FOREIGN KEY (loan_id) REFERENCES loans (id),
  FOREIGN KEY (document_version_id) REFERENCES document_versions (id)
);

CREATE INDEX IF NOT EXISTS idx_definitions_loan_id ON definitions(loan_id);
CREATE INDEX IF NOT EXISTS idx_definitions_term ON definitions(term);
CREATE INDEX IF NOT EXISTS idx_document_groups_loan_id ON document_groups(loan_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_group_version ON document_versions(document_group_id, version_no);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_document_id ON extraction_runs(document_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_document_version_id ON extraction_runs(document_version_id);
CREATE INDEX IF NOT EXISTS idx_extracted_suggestions_run_id ON extracted_suggestions(extraction_run_id);
CREATE INDEX IF NOT EXISTS idx_extracted_suggestions_status ON extracted_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_term_sheet_versions_loan_id ON term_sheet_versions(loan_id);
CREATE INDEX IF NOT EXISTS idx_term_sheet_versions_version ON term_sheet_versions(version_no);
CREATE INDEX IF NOT EXISTS idx_clause_templates_category ON clause_templates(category);
CREATE INDEX IF NOT EXISTS idx_consistency_findings_loan_id ON consistency_findings(loan_id);
CREATE INDEX IF NOT EXISTS idx_consistency_findings_status ON consistency_findings(status);
CREATE INDEX IF NOT EXISTS idx_consistency_findings_severity ON consistency_findings(severity);

COMMIT;
