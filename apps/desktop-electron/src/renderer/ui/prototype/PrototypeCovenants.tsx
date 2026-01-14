import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Table from "../components/Table";

export default function PrototypeCovenants() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Covenant Builder"
        subtitle="Prebuilt ratio templates and threshold logic."
        actions={
          <Link to="/prototype/submission">
            <Button variant="secondary">Next: Submission</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <Table>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Covenant</th>
              <th className="px-4 py-3">Formula</th>
              <th className="px-4 py-3">Threshold</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">Leverage Ratio</td>
              <td className="px-4 py-3">Total Debt / EBITDA</td>
              <td className="px-4 py-3">&lt;= 3.5x</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">Interest Coverage</td>
              <td className="px-4 py-3">EBITDA / Interest Expense</td>
              <td className="px-4 py-3">&gt;= 2.0x</td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
