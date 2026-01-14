import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

export default function PrototypeLoan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Loan Overview"
        subtitle="Acme Manufacturing Term Loan - USD - Active"
        actions={
          <Link to="/prototype/obligations">
            <Button variant="secondary">Next: Obligations</Button>
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Due Soon</p>
          <p className="mt-2 text-3xl font-semibold text-ink">4</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Overdue</p>
          <p className="mt-2 text-3xl font-semibold text-ember">1</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Breaches</p>
          <p className="mt-2 text-3xl font-semibold text-rose-600">1</p>
        </Card>
      </div>
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Next Deadlines</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Quarterly Financial Statements</p>
              <p className="text-xs text-slate-500">Due Apr 15, 2024</p>
            </div>
            <Badge tone="warning">Due soon</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Compliance Certificate</p>
              <p className="text-xs text-slate-500">Due Apr 30, 2024</p>
            </div>
            <Badge tone="info">Pending</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
