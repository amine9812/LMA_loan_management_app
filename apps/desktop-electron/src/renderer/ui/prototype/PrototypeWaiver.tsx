import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Badge from "../components/Badge";

export default function PrototypeWaiver() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Waiver Workflow"
        subtitle="Covenant breach triggers a waiver request."
        actions={
          <Link to="/prototype/export">
            <Button variant="secondary">Next: Export</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Leverage Ratio Waiver</p>
            <p className="text-xs text-slate-500">Reason: temporary inventory build</p>
          </div>
          <Badge tone="warning">Requested</Badge>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary">Approve Waiver</Button>
          <Button variant="outline">Reject Waiver</Button>
        </div>
      </Card>
    </div>
  );
}
