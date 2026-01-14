import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Table from "../components/Table";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { sessionId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await ipcInvoke("alerts:dashboard", { sessionId: sessionId ?? "" });
      const summary = unwrapResult(result);
      const greenResults = await Promise.all(
        summary.loans.map(async (loan) => {
          const res = await ipcInvoke("green:latest", { sessionId: sessionId ?? "", loanId: loan.loanId });
          const latest = unwrapResult(res);
          return { loanId: loan.loanId, verdict: latest?.verdict ?? "Unrated" };
        })
      );
      const greenByLoan: Record<string, string> = {};
      const greenSummary = { green: 0, transitional: 0, notGreen: 0, unrated: 0 };
      greenResults.forEach((item) => {
        const verdict = item.verdict === "NotGreen" ? "Not Green" : item.verdict;
        greenByLoan[item.loanId] = verdict;
        if (verdict === "Green") greenSummary.green += 1;
        else if (verdict === "Transitional") greenSummary.transitional += 1;
        else if (verdict === "Not Green") greenSummary.notGreen += 1;
        else greenSummary.unrated += 1;
      });
      return { ...summary, greenSummary, greenByLoan };
    },
    enabled: Boolean(sessionId)
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio Overview"
        subtitle="Live covenant health, upcoming due dates, and review workload."
        actions={<HelpLink topicId="dashboard" />}
      />

      {isLoading && <p className="text-slate-500">Loading dashboard...</p>}
      {error && <p className="text-rose-600">Failed to load dashboard.</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-6">
          <Link to="/loans?filter=dueSoon" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Due Soon</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{data.totals.dueSoon}</p>
            </Card>
          </Link>
          <Link to="/loans?filter=overdue" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Overdue</p>
              <p className="mt-3 text-3xl font-semibold text-ember">{data.totals.overdue}</p>
            </Card>
          </Link>
          <Link to="/review" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Waiting Review</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{data.totals.waitingReview}</p>
            </Card>
          </Link>
          <Link to="/loans?filter=breaches" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Breaches</p>
              <p className="mt-3 text-3xl font-semibold text-rose-600">{data.totals.breaches}</p>
            </Card>
          </Link>
          <Link to="/waivers?filter=pending" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Pending Waivers</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{data.totals.pendingWaivers}</p>
            </Card>
          </Link>
          <Link to="/loans" className="block">
            <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Green Status</p>
              <p className="mt-3 text-2xl font-semibold text-ink">
                {data.greenSummary.green} Green
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.greenSummary.transitional} Transitional · {data.greenSummary.notGreen} Not Green
              </p>
            </Card>
          </Link>
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Loan Alerts</h2>
                <p className="text-sm text-slate-500">Prioritize work by risk and due dates.</p>
              </div>
            </div>
            <div className="mt-4">
              <Table>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Loan</th>
                    <th className="px-4 py-3">Due Soon</th>
                    <th className="px-4 py-3">Overdue</th>
                    <th className="px-4 py-3">Waiting Review</th>
                    <th className="px-4 py-3">Breaches</th>
                    <th className="px-4 py-3">Pending Waivers</th>
                    <th className="px-4 py-3">Green Status</th>
                    <th className="px-4 py-3">Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.loans.map((loan) => (
                    <tr key={loan.loanId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-ink">
                        <Link className="text-accent hover:underline" to={`/loans/${loan.loanId}`}>
                          {loan.loanName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{loan.dueSoon}</td>
                      <td className="px-4 py-3">
                        <Badge tone={loan.overdue > 0 ? "danger" : "neutral"}>{loan.overdue}</Badge>
                      </td>
                      <td className="px-4 py-3">{loan.waitingReview}</td>
                      <td className="px-4 py-3">
                        <Badge tone={loan.breaches > 0 ? "warning" : "neutral"}>{loan.breaches}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={loan.pendingWaivers > 0 ? "warning" : "neutral"}>
                          {loan.pendingWaivers}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {data.greenByLoan?.[loan.loanId] ?? "Unrated"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{loan.nextDueDate ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <p className="text-sm text-slate-500">Latest audit trail events across loans.</p>
            <div className="mt-4 space-y-3 text-sm">
              {data.recentActivity.length === 0 && (
                <p className="text-slate-500">No recent activity logged yet.</p>
              )}
              {data.recentActivity.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="font-semibold text-ink">
                    {event.action.replace(/_/g, " ")} · {event.entityType}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
