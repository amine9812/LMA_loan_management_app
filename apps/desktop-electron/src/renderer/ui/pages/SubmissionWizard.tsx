import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Select from "../components/Select";
import Input from "../components/Input";
import Button from "../components/Button";
import Badge from "../components/Badge";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";
import type { ObligationInstance } from "@shared";

export default function SubmissionWizard() {
  const { sessionId, user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { currentLoanId, setCurrentLoanId } = useCurrentLoan();
  const [searchParams] = useSearchParams();
  const [loanId, setLoanId] = useState<string>("");
  const [type, setType] = useState<"Financials" | "ObligationEvidence">("Financials");
  const [periodStart, setPeriodStart] = useState("2024-01-01");
  const [periodEnd, setPeriodEnd] = useState("2024-03-31");
  const [metrics, setMetrics] = useState({
    TotalDebt: 0,
    EBITDA: 0,
    InterestExpense: 0
  });
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; dataUrl: string } | null>(null);
  const loanParam = searchParams.get("loanId");

  useEffect(() => {
    if (loanParam && loanParam !== loanId) {
      setLoanId(loanParam);
    }
  }, [loanParam, loanId]);

  useEffect(() => {
    if (!loanId && currentLoanId) {
      setLoanId(currentLoanId);
    }
  }, [currentLoanId, loanId]);

  useEffect(() => {
    if (loanId) {
      setCurrentLoanId(loanId);
    }
  }, [loanId, setCurrentLoanId]);

  const loansQuery = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const result = await ipcInvoke("loans:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const instancesQuery = useQuery({
    queryKey: ["obligationInstances", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("obligationInstances:list", { sessionId: sessionId ?? "", loanId });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId && type === "ObligationEvidence")
  });

  const attachmentsQuery = useQuery({
    queryKey: ["attachments", submissionId],
    queryFn: async () => {
      const result = await ipcInvoke("attachments:list", {
        sessionId: sessionId ?? "",
        submissionId: submissionId ?? ""
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && submissionId)
  });

  const pendingInstances = useMemo(() => {
    return (instancesQuery.data ?? []).filter(
      (instance: ObligationInstance) => instance.status === "Pending"
    );
  }, [instancesQuery.data]);

  const createSubmission = async (status: "Draft" | "Submitted") => {
    if (!sessionId || !user || !loanId) {
      return;
    }
    const items =
      type === "Financials"
        ? Object.entries(metrics).map(([key, value]) => ({
            key,
            valueNumber: Number(value)
          }))
        : selectedInstances.map((id) => ({
            key: "Evidence",
            obligationInstanceId: id,
            valueText: "Evidence attached"
          }));

    try {
      const result = await ipcInvoke("submissions:create", {
        sessionId,
        input: {
          loanId,
          submitterUserId: user.id,
          type: type === "Financials" ? "Financials" : "ObligationEvidence",
          periodStart: type === "Financials" ? periodStart : null,
          periodEnd: type === "Financials" ? periodEnd : null,
          status,
          items
        }
      });

      const submission = unwrapResult(result);
      setSubmissionId(submission.id);
      setStatusMessage(status === "Draft" ? "Draft saved. Add attachments before submitting." : "Submission sent to lender.");
      queryClient.invalidateQueries({ queryKey: ["submissions", loanId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
      pushToast(status === "Draft" ? "Draft saved." : "Submission sent for review.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to save submission.", "error");
    }
  };

  const submitDraft = async () => {
    if (!sessionId || !submissionId) {
      return;
    }
    try {
      const result = await ipcInvoke("submissions:submit", {
        sessionId,
        input: { submissionId }
      });
      unwrapResult(result);
      setStatusMessage("Submission sent to lender.");
      queryClient.invalidateQueries({ queryKey: ["submissions", loanId] });
      queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast("Draft submitted to lender.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to submit draft.", "error");
    }
  };

  const addAttachment = async () => {
    if (!sessionId || !submissionId) {
      return;
    }
    try {
      await ipcInvoke("attachments:add", { sessionId, submissionId });
      setStatusMessage("Attachment added.");
      queryClient.invalidateQueries({ queryKey: ["attachments", submissionId] });
      pushToast("Attachment uploaded.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to add attachment.", "error");
    }
  };

  const previewAttachment = async (attachmentId: string) => {
    if (!sessionId) {
      return;
    }
    const result = await ipcInvoke("attachments:dataUrl", { sessionId, attachmentId });
    const data = unwrapResult(result);
    setAttachmentPreview({ name: data.filename, dataUrl: data.dataUrl });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrower Submission"
        subtitle="Provide financial inputs or obligation evidence for lender review."
        actions={<HelpLink topicId="submissions" />}
      />

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Loan" value={loanId} onChange={(e) => setLoanId(e.target.value)}>
            <option value="">Select a loan</option>
            {loansQuery.data?.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.name}
              </option>
            ))}
          </Select>
          <Select label="Submission type" value={type} onChange={(e) => setType(e.target.value as "Financials" | "ObligationEvidence")}>
            <option value="Financials">Financials</option>
            <option value="ObligationEvidence">Obligation evidence</option>
          </Select>
        </div>

        {type === "Financials" && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Period start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <Input label="Period end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            <div />
            <Input
              label="Total Debt"
              type="number"
              value={metrics.TotalDebt}
              onChange={(e) => setMetrics({ ...metrics, TotalDebt: Number(e.target.value) })}
            />
            <Input
              label="EBITDA"
              type="number"
              value={metrics.EBITDA}
              onChange={(e) => setMetrics({ ...metrics, EBITDA: Number(e.target.value) })}
            />
            <Input
              label="Interest Expense"
              type="number"
              value={metrics.InterestExpense}
              onChange={(e) => setMetrics({ ...metrics, InterestExpense: Number(e.target.value) })}
            />
          </div>
        )}

        {type === "ObligationEvidence" && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-600">Select obligation instances</p>
            <div className="mt-3 space-y-2">
              {pendingInstances.map((instance) => (
                <label key={instance.id} className="flex items-center gap-3 rounded-lg bg-white px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedInstances.includes(instance.id)}
                    onChange={(e) => {
                      setSelectedInstances((prev) =>
                        e.target.checked ? [...prev, instance.id] : prev.filter((id) => id !== instance.id)
                      );
                    }}
                  />
                  <span className="text-sm text-ink">Due {instance.dueDate}</span>
                  <Badge tone="info">{instance.status}</Badge>
                </label>
              ))}
            </div>
          </div>
        )}

        {statusMessage && <p className="mt-4 text-sm text-emerald-600">{statusMessage}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => createSubmission("Draft")}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={() => createSubmission("Submitted")}>
            Submit New
          </Button>
          {submissionId && (
            <>
              <Button variant="outline" onClick={addAttachment}>
                Add Attachment
              </Button>
              <Button variant="secondary" onClick={submitDraft}>
                Submit Draft
              </Button>
            </>
          )}
        </div>
      </Card>

      {submissionId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Submission Attachments</h3>
          <div className="mt-4 space-y-2">
            {attachmentsQuery.data?.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <span>{attachment.filename}</span>
                <Button variant="outline" onClick={() => previewAttachment(attachment.id)}>
                  Preview
                </Button>
              </div>
            ))}
            {attachmentsQuery.data?.length === 0 && (
              <p className="text-sm text-slate-500">No attachments uploaded yet.</p>
            )}
          </div>
          {attachmentPreview && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-ink">{attachmentPreview.name}</p>
              <iframe className="mt-2 h-56 w-full rounded" src={attachmentPreview.dataUrl} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
