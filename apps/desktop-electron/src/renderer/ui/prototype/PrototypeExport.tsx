import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

export default function PrototypeExport() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Export Pack"
        subtitle="Generate CSV and PDF compliance packs."
        actions={
          <Link to="/prototype">
            <Button variant="outline">Back to Prototype Hub</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <p className="text-sm text-slate-500">
          Compliance pack includes loan summary, upcoming obligations, covenant results, and waiver status.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary">Export CSV</Button>
          <Button variant="outline">Export PDF</Button>
        </div>
      </Card>
    </div>
  );
}
