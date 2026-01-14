import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Table from "../components/Table";
import Button from "../components/Button";
import Badge from "../components/Badge";
import TextArea from "../components/TextArea";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";

export default function ReviewQueue() {
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { setCurrentLoanId } = useCurrentLoan();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; dataUrl: string } | null>(null);
  const loanParam = searchParams.get("loanId");

  useEffect(() => {
    if (loanParam) {
      setCurrentLoanId(loanParam);
    }
  }, [loanParam, setCurrentLoanId]);

  const { data, isLoading } = useQuery({
    queryKey: ["reviewQueue", loanParam],
    queryFn: async () => {
      const loansResult = await ipcInvoke("loans:list", { sessionId: sessionId ?? "" });
      const loans = unwrapResult(loansResult);
      const selectedLoans = loanParam ? loans.filter((loan) => loan.id === loanParam) : loans;
      const submissions = await Promise.all(
        selectedLoans.map(async (loan) => {
          const res = await ipcInvoke("submissions:list", {
            sessionId: sessionId ?? "",
            loanId: loan.id
          });
          const items = unwrapResult(res);
          return items.map((item) => ({ ...item, loanName: loan.name }));
        })
      );
      return submissions.flat().filter((item) => ["Submitted", "UnderReview"].includes(item.status));
    },
    enabled: Boolean(sessionId)
  });

  const filteredByLoan = useMemo(() => {
    if (!loanParam) {
      return data ?? [];
    }
    return (data ?? []).filter((item) => item.loanId === loanParam);
  }, [data, loanParam]);

  const submissionDetailQuery = useQuery({
    queryKey: ["submissionDetail", selectedSubmissionId],
    queryFn: async () => {
      const result = await ipcInvoke("submissions:detail", {
        sessionId: sessionId ?? "",
        submissionId: selectedSubmissionId ?? ""
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && selectedSubmissionId)
  });

  const detailLoanId = submissionDetailQuery.data?.submission.loanId;
  const covenantsQuery = useQuery({
    queryKey: ["covenants", detailLoanId],
    queryFn: async () => {
      const result = await ipcInvoke("covenants:list", {
        sessionId: sessionId ?? "",
        loanId: detailLoanId ?? ""
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && detailLoanId)
  });

  const covenantNameMap = new Map(
    (covenantsQuery.data ?? []).map((covenant) => [covenant.id, covenant.name])
  );

  useEffect(() => {
    setAttachmentPreview(null);
    setReviewNotes("");
  }, [selectedSubmissionId]);

  const review = async (submissionId: string, status: "Approved" | "Rejected") => {
    if (!sessionId) {
      return;
    }
    try {
      await ipcInvoke("submissions:review", { sessionId, submissionId, status, notes: reviewNotes });
      setReviewNotes("");
      setSelectedSubmissionId(null);
      queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
      queryClient.invalidateQueries({ queryKey: ["submissionDetail", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast(`Submission ${status.toLowerCase()}.`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Review action failed.", "error");
    }
  };

  const markUnderReview = async (submissionId: string) => {
    if (!sessionId) {
      return;
    }
    try {
      await ipcInvoke("submissions:review", { sessionId, submissionId, status: "UnderReview" });
      queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to mark Under Review.", "error");
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
        title="Review Queue"
        subtitle="Approve or reject borrower submissions awaiting lender review."
        actions={<HelpLink topicId="review-queue" />}
      />
      <Card className="p-6">
        <Table>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Loan</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-slate-500">
                  Loading submissions...
                </td>
              </tr>
            )}
            {filteredByLoan.map((submission) => (
              <tr key={submission.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-ink">{submission.loanName}</td>
                <td className="px-4 py-3 text-slate-600">{submission.type}</td>
                <td className="px-4 py-3 text-slate-500">{submission.periodEnd ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={submission.status === "Submitted" ? "warning" : "info"}>
                    {submission.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedSubmissionId(submission.id);
                        if (submission.status === "Submitted") {
                          void markUnderReview(submission.id);
                        }
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredByLoan.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-slate-500">
                  No submissions awaiting review.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      {selectedSubmissionId && submissionDetailQuery.data && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Submission Detail</h3>
              <p className="text-sm text-slate-500">Review evidence, inputs, and covenant results.</p>
            </div>
            <Badge tone="info">{submissionDetailQuery.data.submission.status}</Badge>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-600">Submitted Items</h4>
                <div className="mt-2 space-y-2">
                  {submissionDetailQuery.data.items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <p className="font-semibold text-ink">{item.key}</p>
                      <p className="text-slate-500">
                        {item.valueText ?? item.valueNumber ?? item.valueJson ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-600">Covenant Results</h4>
                <div className="mt-2 space-y-2">
                  {submissionDetailQuery.data.covenantResults.map((result) => (
                    <div key={result.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <p className="font-semibold text-ink">
                        {covenantNameMap.get(result.covenantId) ?? result.covenantId}
                      </p>
                      <p className="text-slate-500">
                        {result.computedValue} vs {result.thresholdValue} ({result.passFail})
                      </p>
                    </div>
                  ))}
                  {submissionDetailQuery.data.covenantResults.length === 0 && (
                    <p className="text-sm text-slate-500">No covenant results for this period.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-600">Attachments</h4>
                <div className="mt-2 space-y-2">
                  {submissionDetailQuery.data.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <span>{attachment.filename}</span>
                      <Button variant="outline" onClick={() => previewAttachment(attachment.id)}>
                        Preview
                      </Button>
                    </div>
                  ))}
                  {submissionDetailQuery.data.attachments.length === 0 && (
                    <p className="text-sm text-slate-500">No attachments uploaded.</p>
                  )}
                </div>
              </div>

              {attachmentPreview && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-ink">{attachmentPreview.name}</p>
                  <iframe className="mt-2 h-48 w-full rounded" src={attachmentPreview.dataUrl} />
                </div>
              )}

              <div>
                <TextArea
                  label="Review notes"
                  rows={3}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => review(selectedSubmissionId, "Approved")}>
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => review(selectedSubmissionId, "Rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
