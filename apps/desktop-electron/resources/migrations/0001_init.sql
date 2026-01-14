BEGIN;

CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  lender_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  start_date TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_parties (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  party_type TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS clauses (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  clause_type TEXT NOT NULL,
  title TEXT NOT NULL,
  text_snippet TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  tags_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE IF NOT EXISTS obligations (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL,
  due_rule_json TEXT NOT NULL,
  owner_party TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  source_clause_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS obligation_instances (
  id TEXT PRIMARY KEY,
  obligation_id TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL,
  last_reminder_at TEXT,
  FOREIGN KEY (obligation_id) REFERENCES obligations (id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  submitter_user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  status TEXT NOT NULL,
  submitted_at TEXT,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS submission_items (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  obligation_instance_id TEXT,
  key TEXT NOT NULL,
  value_text TEXT,
  value_number REAL,
  value_json TEXT,
  notes TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions (id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions (id)
);

CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expression_json TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS covenants (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  covenant_type TEXT NOT NULL,
  formula_id TEXT NOT NULL,
  threshold_op TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  frequency TEXT NOT NULL,
  source_clause_id TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans (id),
  FOREIGN KEY (formula_id) REFERENCES formulas (id)
);

CREATE TABLE IF NOT EXISTS covenant_results (
  id TEXT PRIMARY KEY,
  covenant_id TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  computed_value REAL NOT NULL,
  threshold_value REAL NOT NULL,
  pass_fail TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  computed_by TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (covenant_id) REFERENCES covenants (id)
);

CREATE TABLE IF NOT EXISTS waivers (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  related_type TEXT NOT NULL,
  related_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT,
  FOREIGN KEY (loan_id) REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loan_parties_loan_id ON loan_parties(loan_id);
CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_obligations_loan_id ON obligations(loan_id);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON obligations(status);
CREATE INDEX IF NOT EXISTS idx_obligation_instances_obligation_id ON obligation_instances(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_instances_due_date ON obligation_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_obligation_instances_status ON obligation_instances(status);
CREATE INDEX IF NOT EXISTS idx_submissions_loan_id ON submissions(loan_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submission_items_submission_id ON submission_items(submission_id);
CREATE INDEX IF NOT EXISTS idx_attachments_submission_id ON attachments(submission_id);
CREATE INDEX IF NOT EXISTS idx_covenants_loan_id ON covenants(loan_id);
CREATE INDEX IF NOT EXISTS idx_covenants_status ON covenants(status);
CREATE INDEX IF NOT EXISTS idx_covenant_results_covenant_id ON covenant_results(covenant_id);
CREATE INDEX IF NOT EXISTS idx_waivers_loan_id ON waivers(loan_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);

COMMIT;
