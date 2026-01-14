import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Input from "../components/Input";

export default function PrototypeSubmission() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Borrower Submission"
        subtitle="Enter financial metrics and upload evidence."
        actions={
          <Link to="/prototype/review">
            <Button variant="secondary">Next: Review</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Total Debt" value="12,500,000" readOnly />
          <Input label="EBITDA" value="4,200,000" readOnly />
          <Input label="Interest Expense" value="1,800,000" readOnly />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="secondary">Submit</Button>
          <Button variant="outline">Upload Evidence</Button>
        </div>
      </Card>
    </div>
  );
}
