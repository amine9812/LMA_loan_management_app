import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";

export default function PrototypeTermSheet() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Term Sheet Versions"
        subtitle="Compare v1 vs v2 changes before drafting."
        actions={
          <Link to="/prototype/drafts">
            <Button variant="secondary">Next: Drafts</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Term Sheet v1</h3>
            <Badge tone="neutral">Baseline</Badge>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Facility: Term Loan</p>
            <p>Commitment: USD 25,000,000</p>
            <p>Margin: 275 bps</p>
            <p>Maturity: 2029-12-31</p>
            <p>Leverage Threshold: 4.0x</p>
            <p>Interest Coverage: 2.0x</p>
            <p>Reporting: 45 days after period end</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Term Sheet v2</h3>
            <Badge tone="warning">Negotiated</Badge>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Facility: Term Loan</p>
            <p>Commitment: USD 25,000,000</p>
            <p>Margin: 275 bps</p>
            <p>Maturity: 2029-12-31</p>
            <p>Leverage Threshold: 3.5x</p>
            <p>Interest Coverage: 2.0x</p>
            <p>Reporting: 60 days after period end</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
