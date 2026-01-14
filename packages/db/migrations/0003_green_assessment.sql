ALTER TABLE waivers ADD COLUMN period_start TEXT;
ALTER TABLE waivers ADD COLUMN period_end TEXT;
ALTER TABLE waivers ADD COLUMN proposed_remedy_date TEXT;
ALTER TABLE waivers ADD COLUMN decision_note TEXT;
ALTER TABLE waivers ADD COLUMN conditions TEXT;
ALTER TABLE waivers ADD COLUMN expiry_date TEXT;

ALTER TABLE submissions ADD COLUMN review_notes TEXT;

CREATE TABLE IF NOT EXISTS green_assessments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  inputs_json TEXT NOT NULL,
  breakdown_json TEXT NOT NULL,
  score REAL NOT NULL,
  verdict TEXT NOT NULL,
  red_flags_json TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_green_assessments_loan_id ON green_assessments(loan_id);

CREATE TABLE IF NOT EXISTS green_evidence_tags (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  category TEXT NOT NULL,
  snippet TEXT NOT NULL,
  page_number INTEGER,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(document_id) REFERENCES documents(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_green_evidence_tags_loan_id ON green_evidence_tags(loan_id);

CREATE TABLE IF NOT EXISTS waiver_attachments (
  id TEXT PRIMARY KEY,
  waiver_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY(waiver_id) REFERENCES waivers(id)
);

CREATE INDEX IF NOT EXISTS idx_waiver_attachments_waiver_id ON waiver_attachments(waiver_id);

CREATE TABLE IF NOT EXISTS export_history (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_export_history_loan_id ON export_history(loan_id);
