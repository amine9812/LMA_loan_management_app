import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Table from "../components/Table";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";

export default function Loans() {
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { setCurrentLoanId } = useCurrentLoan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    borrowerName: "",
    lenderName: "",
    currency: "USD",
    startDate: "2024-01-01",
    status: "Active"
  });

  const { data, isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const result = await ipcInvoke("loans:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await ipcInvoke("alerts:dashboard", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const handleCreate = async () => {
    try {
      const result = await ipcInvoke("loans:create", { sessionId: sessionId ?? "", input: form });
      const created = unwrapResult(result);
      setCurrentLoanId(created.id);
      setShowForm(false);
      setForm({ name: "", borrowerName: "", lenderName: "", currency: "USD", startDate: "2024-01-01", status: "Active" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast("Loan created successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to create loan.", "error");
    }
  };

  const activeFilter = searchParams.get("filter");
  const filterLabelMap: Record<string, string> = {
    dueSoon: "Due Soon",
    overdue: "Overdue",
    breaches: "Breaches",
    pendingWaivers: "Pending Waivers",
    waitingReview: "Waiting Review"
  };
  const alertMap = new Map(
    (alertsQuery.data?.loans ?? []).map((loan) => [loan.loanId, loan])
  );
  const filteredLoans = (data ?? []).filter((loan) => {
    if (!activeFilter) {
      return true;
    }
    const summary = alertMap.get(loan.id);
    if (!summary) {
      return false;
    }
    if (activeFilter === "dueSoon") return summary.dueSoon > 0;
    if (activeFilter === "overdue") return summary.overdue > 0;
    if (activeFilter === "breaches") return summary.breaches > 0;
    if (activeFilter === "pendingWaivers") return summary.pendingWaivers > 0;
    if (activeFilter === "waitingReview") return summary.waitingReview > 0;
    return true;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Loan Workspaces"
        subtitle="Create and monitor loan-level covenant compliance workspaces."
        actions={
          <div className="flex items-center gap-2">
            <HelpLink topicId="loans" />
            <Button onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? "Close" : "New Loan"}
            </Button>
          </div>
        }
      />

      {activeFilter && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Filter active:{" "}
              <span className="font-semibold text-ink">
                {filterLabelMap[activeFilter] ?? activeFilter}
              </span>
            </p>
            <Button
              variant="outline"
              onClick={() => {
                searchParams.delete("filter");
                setSearchParams(searchParams);
              }}
            >
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Create Loan</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Loan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              label="Borrower"
              value={form.borrowerName}
              onChange={(e) => setForm({ ...form, borrowerName: e.target.value })}
            />
            <Input
              label="Lender"
              value={form.lenderName}
              onChange={(e) => setForm({ ...form, lenderName: e.target.value })}
            />
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Closed</option>
            </Select>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={handleCreate}>
              Save Loan
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Portfolio</h3>
        <p className="text-sm text-slate-500">Select a loan to manage obligations and covenants.</p>
        <div className="mt-4">
          <Table>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Loan</th>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3">Lender</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Soon</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Breaches</th>
                <th className="px-4 py-3">Pending Waivers</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={9}>
                    Loading loans...
                  </td>
                </tr>
              )}
              {filteredLoans.map((loan) => {
                const summary = alertMap.get(loan.id);
                return (
                <tr key={loan.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <Link
                      className="text-accent hover:underline"
                      to={`/loans/${loan.id}`}
                      onClick={() => setCurrentLoanId(loan.id)}
                    >
                      {loan.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{loan.borrowerName}</td>
                  <td className="px-4 py-3 text-slate-600">{loan.lenderName}</td>
                  <td className="px-4 py-3 text-slate-600">{loan.currency}</td>
                  <td className="px-4 py-3 text-slate-600">{loan.status}</td>
                  <td className="px-4 py-3 text-slate-600">{summary?.dueSoon ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{summary?.overdue ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{summary?.breaches ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{summary?.pendingWaivers ?? 0}</td>
                </tr>
              )})}
            </tbody>
          </Table>
          {!isLoading && filteredLoans.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              No loans yet. Click “New Loan” to create your first workspace.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
