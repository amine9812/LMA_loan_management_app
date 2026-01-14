import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";

const flows = [
  { title: "Loan Overview", description: "Seeded loan workspace with alerts.", to: "/prototype/loan" },
  { title: "Obligation Builder", description: "Define due rules and schedule generation.", to: "/prototype/obligations" },
  { title: "Covenant Builder", description: "Configure ratios and thresholds.", to: "/prototype/covenants" },
  { title: "Document Workbench", description: "Confirm extraction suggestions.", to: "/prototype/workbench" },
  { title: "Term Sheet Versions", description: "Review v1/v2 negotiation changes.", to: "/prototype/term-sheet" },
  { title: "Drafts & Diff", description: "Generate drafts and view semantic diff.", to: "/prototype/drafts" },
  { title: "Consistency Checker", description: "Run rule engine findings.", to: "/prototype/consistency" },
  { title: "Borrower Submission", description: "Enter financials and upload evidence.", to: "/prototype/submission" },
  { title: "Review & Approval", description: "Approve or reject borrower submissions.", to: "/prototype/review" },
  { title: "Waiver Workflow", description: "Request and decide covenant waivers.", to: "/prototype/waiver" },
  { title: "Export Pack", description: "Generate CSV/PDF summary outputs.", to: "/prototype/export" }
];

export default function PrototypeLanding() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Prototype Mode"
        subtitle="Clickable demo flows with seeded data and guided navigation."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {flows.map((flow) => (
          <Link key={flow.to} to={flow.to}>
            <Card className="p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-lg font-semibold text-ink">{flow.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{flow.description}</p>
              <p className="mt-4 text-xs uppercase tracking-widest text-accent">Open flow</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
