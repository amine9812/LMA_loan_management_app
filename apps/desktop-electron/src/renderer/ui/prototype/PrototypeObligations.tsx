import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Table from "../components/Table";

export default function PrototypeObligations() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Prototype: Obligation Builder"
        subtitle="Sample obligations and due rule templates."
        actions={
          <Link to="/prototype/covenants">
            <Button variant="secondary">Next: Covenants</Button>
          </Link>
        }
      />
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Obligations</h3>
        <Table>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Due Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">Quarterly Financial Statements</td>
              <td className="px-4 py-3">Quarterly</td>
              <td className="px-4 py-3">45 days after quarter end</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">Annual Audited Statements</td>
              <td className="px-4 py-3">Annually</td>
              <td className="px-4 py-3">90 days after fiscal year end</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">Insurance Certificate</td>
              <td className="px-4 py-3">Annually</td>
              <td className="px-4 py-3">Fixed date: Jan 31</td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
