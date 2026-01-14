# CovenantPulse Baseline Audit

## Stack
- Desktop: Electron 31 + Vite + React 18 + TypeScript
- UI: Tailwind CSS + custom components
- State: React Query
- DB: SQLite via `better-sqlite3`
- Exports: `pdfkit` for PDF, CSV via text
- PDF preview: PDF data URLs + iframe (pdf.js-dist available)
- Validation: Zod schemas in `packages/shared`
- Monorepo: `/apps/desktop-electron`, `/packages/shared`, `/packages/core`, `/packages/db`

## Data Storage
- SQLite file: `<userData>/covenantpulse/covenantpulse.sqlite`
- Storage paths: `<userData>/covenantpulse/{documents,attachments,exports}`
- Migrations: `apps/desktop-electron/resources/migrations/*.sql`
- Seed data created on first run in `apps/desktop-electron/src/main/seed.ts`

## Routing / Screens
- `/login` (login)
- `/` (dashboard)
- `/loans` (loan list + create)
- `/loans/:loanId` (loan detail tabs)
- `/loans/:loanId/obligations/new` (obligation builder)
- `/loans/:loanId/covenants/new` (covenant builder)
- `/submissions` (borrower submissions)
- `/review` (lender review queue)
- `/waivers` (waiver center)
- `/exports` (exports + interoperability)
- `/settings` (admin settings)
- `/prototype/*` (prototype flows)

## Broken / Unreliable Flows (observed + likely causes)
- Loan creation not appearing across screens reliably: inconsistent cache invalidation + reliance on renderer-only mock fallback.
- Dashboard alerts empty: due to missing/overdue instance refresh, missing waiver counts, limited alert computations.
- Submissions/review unclear: no submission detail view, attachments not previewed, covenant results not shown on review.
- Waivers unclear: limited fields, no link to breaches/overdue, no expiry/conditions.
- Exports inconsistent: saves to a file but no folder choice/history/open action; renderer-only mode returns placeholder paths.
- Green loan assessment missing entirely.
- Help/User Guide missing entirely.
- Error handling is inconsistent: many actions fail silently or with raw errors; no toasts.

## Definition of Done Checklist
- [x] Data access layer (repositories + services) implemented and used for critical flows
- [x] Persistence reliable (SQLite single source of truth) and UI refreshes after mutations
- [x] Dashboard alerts include due soon/overdue/review/breaches/pending waivers with links
- [x] Submission workflow complete (draft -> submit -> review -> approve/reject) with evidence + covenant calc
- [x] Waiver workflow understandable with attachments, conditions, expiry, audit
- [x] Exports produce real files to chosen folder + export history
- [x] Green Loan Assessment module implemented with scoring + evidence tags
- [x] Documents management supports preview + links to submissions/waivers/green evidence
- [x] Help/User Guide section implemented for all tabs
- [x] Tests added/updated for critical flows
