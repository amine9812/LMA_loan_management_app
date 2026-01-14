import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";

const diffs = [
  "Leverage Ratio threshold changed from 4.0x to 3.5x.",
  "Quarterly statements due days changed from 45 to 60.",
  "EBITDA adjustment list updated between versions."
];

export default function PrototypeDrafts() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Draft Versions & Semantic Diff"
        subtitle="Generated drafts linked to term sheet versions."
        actions={
          <Link to="/prototype/consistency">
            <Button variant="secondary">Next: Consistency</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Draft Versions</h3>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">Agreement v1</p>
              <p className="text-xs text-slate-500">Source: Upload</p>
            </div>
            <Badge tone="neutral">v1</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">Agreement v2</p>
              <p className="text-xs text-slate-500">Source: Generated</p>
            </div>
            <Badge tone="info">v2</Badge>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Semantic Diff Highlights</h3>
        <div className="mt-4 space-y-2">
          {diffs.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
