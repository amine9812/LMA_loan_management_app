import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";

const findings = [
  {
    id: "finding-1",
    severity: "High",
    message: "Leverage Ratio threshold in term sheet v2 (3.5x) differs from covenant record (4.0x)."
  },
  {
    id: "finding-2",
    severity: "Med",
    message: "Quarterly statements due date does not match updated reporting timeline."
  }
];

export default function PrototypeConsistency() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Consistency Checker"
        subtitle="Offline rule engine highlights mismatches and drifts."
        actions={
          <Link to="/prototype/export">
            <Button variant="secondary">Next: Export</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Findings</h3>
          <Button variant="secondary">Run Check</Button>
        </div>
        <div className="mt-4 space-y-3">
          {findings.map((finding) => (
            <div key={finding.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Badge tone={finding.severity === "High" ? "danger" : "warning"}>{finding.severity}</Badge>
                <Button variant="outline">Resolve</Button>
              </div>
              <p className="mt-2 text-sm text-slate-600">{finding.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
