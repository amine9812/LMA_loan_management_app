import type { SqliteDatabase } from "@covenantpulse/db";
import type { AlertCounts } from "@covenantpulse/shared";
import { AuditRepo } from "../repositories";
import { nowIso } from "../repositories/utils";

type LoanAlertCounts = AlertCounts & { nextDueDate: string | null };

type DbLoan = { id: string; name: string };

export function refreshOverdue(db: SqliteDatabase): void {
  const now = nowIso();
  db.prepare(
    "UPDATE obligation_instances SET status = 'Overdue' WHERE due_date < ? AND status = 'Pending'"
  ).run(now);
}

export function computeLoanAlertCounts(db: SqliteDatabase, loanId: string): LoanAlertCounts {
  const dueSoon = db
    .prepare(
      "SELECT COUNT(*) as count FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ? AND oi.status = 'Pending' AND date(oi.due_date) BETWEEN date('now') AND date('now', '+14 days')"
    )
    .get(loanId) as { count: number };
  const overdue = db
    .prepare(
      "SELECT COUNT(*) as count FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ? AND oi.status = 'Overdue'"
    )
    .get(loanId) as { count: number };
  const waitingReview = db
    .prepare(
      "SELECT COUNT(*) as count FROM submissions WHERE loan_id = ? AND status IN ('Submitted','UnderReview')"
    )
    .get(loanId) as { count: number };
  const breaches = db
    .prepare(
      "SELECT COUNT(*) as count FROM covenant_results cr JOIN covenants c ON c.id = cr.covenant_id WHERE c.loan_id = ? AND cr.pass_fail = 'Fail'"
    )
    .get(loanId) as { count: number };
  const pendingWaivers = db
    .prepare("SELECT COUNT(*) as count FROM waivers WHERE loan_id = ? AND status = 'Requested'")
    .get(loanId) as { count: number };
  const nextDue = db
    .prepare(
      "SELECT oi.due_date as due_date FROM obligation_instances oi JOIN obligations o ON o.id = oi.obligation_id WHERE o.loan_id = ? AND oi.status IN ('Pending','Overdue') ORDER BY oi.due_date ASC LIMIT 1"
    )
    .get(loanId) as { due_date: string } | undefined;

  return {
    dueSoon: dueSoon?.count ?? 0,
    overdue: overdue?.count ?? 0,
    waitingReview: waitingReview?.count ?? 0,
    breaches: breaches?.count ?? 0,
    pendingWaivers: pendingWaivers?.count ?? 0,
    nextDueDate: nextDue?.due_date ?? null
  };
}

export function buildDashboardSummary(db: SqliteDatabase): {
  totals: AlertCounts;
  loans: Array<{ loanId: string; loanName: string } & LoanAlertCounts>;
  recentActivity: ReturnType<AuditRepo["listRecent"]>;
} {
  refreshOverdue(db);
  const loans = db.prepare("SELECT id, name FROM loans").all() as DbLoan[];
  const totals: AlertCounts = {
    dueSoon: 0,
    overdue: 0,
    waitingReview: 0,
    breaches: 0,
    pendingWaivers: 0
  };

  const loanSummaries = loans.map((loan) => {
    const counts = computeLoanAlertCounts(db, loan.id);
    totals.dueSoon += counts.dueSoon;
    totals.overdue += counts.overdue;
    totals.waitingReview += counts.waitingReview;
    totals.breaches += counts.breaches;
    totals.pendingWaivers += counts.pendingWaivers;
    return {
      loanId: loan.id,
      loanName: loan.name,
      ...counts
    };
  });

  const auditRepo = new AuditRepo(db);
  const recentActivity = auditRepo.listRecent(6);

  return { totals, loans: loanSummaries, recentActivity };
}
