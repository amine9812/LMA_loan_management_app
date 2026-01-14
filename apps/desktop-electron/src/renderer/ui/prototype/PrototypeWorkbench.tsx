import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";

const suggestions = [
  {
    type: "Obligation",
    title: "Quarterly Financial Statements",
    snippet: "Borrower shall deliver quarterly financial statements within 45 days after quarter end.",
    confidence: 78
  },
  {
    type: "Covenant",
    title: "Leverage Ratio",
    snippet: "Leverage Ratio shall not exceed 3.5x as of any quarter end.",
    confidence: 74
  },
  {
    type: "Definition",
    title: "EBITDA",
    snippet: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
    confidence: 66
  }
];

export default function PrototypeWorkbench() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Document-to-Data Workbench"
        subtitle="Offline extraction suggestions with confidence and provenance."
        actions={
          <Link to="/prototype/term-sheet">
            <Button variant="secondary">Next: Term Sheet</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink">Sample Loan Agreement</p>
            <p className="mt-2 text-xs text-slate-500">Preview placeholder for PDF viewer.</p>
            <div className="mt-4 h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.title} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{suggestion.title}</p>
                  <Badge tone="info">{suggestion.type}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">Confidence {suggestion.confidence}%</p>
                <p className="mt-2 text-xs text-slate-600">{suggestion.snippet}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary">Confirm</Button>
                  <Button variant="outline">Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
