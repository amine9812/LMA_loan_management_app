import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Badge from "../components/Badge";

export default function PrototypeReview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Review Screen"
        subtitle="Lender Ops validates borrower submissions."
        actions={
          <Link to="/prototype/waiver">
            <Button variant="secondary">Next: Waiver</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Submission: Q1 Financials</p>
            <p className="text-xs text-slate-500">Submitted by Borrower Reporter</p>
          </div>
          <Badge tone="warning">Waiting Review</Badge>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary">Approve</Button>
          <Button variant="outline">Reject</Button>
        </div>
      </Card>
    </div>
  );
}
