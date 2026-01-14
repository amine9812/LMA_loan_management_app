import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { Loan, LoanCreateInput } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbLoan = {
  id: string;
  name: string;
  borrower_name: string;
  lender_name: string;
  currency: string;
  start_date: string;
  status: string;
  created_at: string;
};

function mapLoan(row: DbLoan): Loan {
  return {
    id: row.id,
    name: row.name,
    borrowerName: row.borrower_name,
    lenderName: row.lender_name,
    currency: row.currency,
    startDate: row.start_date,
    status: row.status as Loan["status"],
    createdAt: row.created_at
  };
}

export class LoansRepo {
  constructor(private readonly db: SqliteDatabase) {}

  list(): Loan[] {
    const rows = this.db
      .prepare("SELECT * FROM loans ORDER BY created_at DESC")
      .all() as DbLoan[];
    return rows.map(mapLoan);
  }

  get(loanId: string): Loan | null {
    const row = this.db
      .prepare("SELECT * FROM loans WHERE id = ?")
      .get(loanId) as DbLoan | undefined;
    return row ? mapLoan(row) : null;
  }

  create(input: LoanCreateInput): Loan {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO loans (id, name, borrower_name, lender_name, currency, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        input.name,
        input.borrowerName,
        input.lenderName,
        input.currency,
        input.startDate,
        input.status,
        nowIso()
      );
    this.db
      .prepare(
        "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
      )
      .run(randomUUID(), id, "Borrower", input.borrowerName, null);
    this.db
      .prepare(
        "INSERT INTO loan_parties (id, loan_id, party_type, name, contact_email) VALUES (?, ?, ?, ?, ?)"
      )
      .run(randomUUID(), id, "Lender", input.lenderName, null);
    const row = this.db
      .prepare("SELECT * FROM loans WHERE id = ?")
      .get(id) as DbLoan;
    return mapLoan(row);
  }

  update(loanId: string, input: Partial<LoanCreateInput>): Loan {
    const existing = this.db
      .prepare("SELECT * FROM loans WHERE id = ?")
      .get(loanId) as DbLoan | undefined;
    if (!existing) {
      throw new Error("Loan not found");
    }
    const merged = {
      name: input.name ?? existing.name,
      borrower_name: input.borrowerName ?? existing.borrower_name,
      lender_name: input.lenderName ?? existing.lender_name,
      currency: input.currency ?? existing.currency,
      start_date: input.startDate ?? existing.start_date,
      status: input.status ?? existing.status
    };
    this.db
      .prepare(
        "UPDATE loans SET name = ?, borrower_name = ?, lender_name = ?, currency = ?, start_date = ?, status = ? WHERE id = ?"
      )
      .run(
        merged.name,
        merged.borrower_name,
        merged.lender_name,
        merged.currency,
        merged.start_date,
        merged.status,
        loanId
      );
    this.db
      .prepare("UPDATE loan_parties SET name = ? WHERE loan_id = ? AND party_type = 'Borrower'")
      .run(merged.borrower_name, loanId);
    this.db
      .prepare("UPDATE loan_parties SET name = ? WHERE loan_id = ? AND party_type = 'Lender'")
      .run(merged.lender_name, loanId);
    const row = this.db
      .prepare("SELECT * FROM loans WHERE id = ?")
      .get(loanId) as DbLoan;
    return mapLoan(row);
  }
}
