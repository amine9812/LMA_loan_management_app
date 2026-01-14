import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Select from "../components/Select";
import Input from "../components/Input";
import TextArea from "../components/TextArea";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Table from "../components/Table";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";

export default function WaiverCenter() {
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLoanId, setCurrentLoanId } = useCurrentLoan();
  const [loanId, setLoanId] = useState<string>("");
  const [selectedWaiverId, setSelectedWaiverId] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    decisionNote: "",
    conditions: "",
    expiryDate: ""
  });
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; dataUrl: string } | null>(null);
  const [form, setForm] = useState({
    relatedType: "Covenant",
    relatedId: "",
    reason: "",
    periodStart: "",
    periodEnd: "",
    proposedRemedyDate: "",
    conditions: "",
    expiryDate: ""
  });
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

  const waiversQuery = useQuery({
    queryKey: ["waivers", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("waivers:list", { sessionId: sessionId ?? "", loanId });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const waiverAttachmentsQuery = useQuery({
    queryKey: ["waiverAttachments", selectedWaiverId],
    queryFn: async () => {
      const result = await ipcInvoke("waivers:attachments:list", {
        sessionId: sessionId ?? "",
        waiverId: selectedWaiverId ?? ""
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && selectedWaiverId)
  });

  const requestWaiver = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    try {
      await ipcInvoke("waivers:request", {
        sessionId,
        input: {
          loanId,
          relatedType: form.relatedType as "Covenant" | "Obligation",
          relatedId: form.relatedId,
          reason: form.reason,
          periodStart: form.periodStart || null,
          periodEnd: form.periodEnd || null,
          proposedRemedyDate: form.proposedRemedyDate || null,
          conditions: form.conditions || null,
          expiryDate: form.expiryDate || null
        }
      });
      setForm({
        relatedType: "Covenant",
        relatedId: "",
        reason: "",
        periodStart: "",
        periodEnd: "",
        proposedRemedyDate: "",
        conditions: "",
        expiryDate: ""
      });
      queryClient.invalidateQueries({ queryKey: ["waivers", loanId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast("Waiver requested.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to request waiver.", "error");
    }
  };

  const decide = async (waiverId: string, status: "Approved" | "Rejected") => {
    if (!sessionId) {
      return;
    }
    try {
      await ipcInvoke("waivers:decide", {
        sessionId,
        input: {
          waiverId,
          status,
          decisionNote: decisionForm.decisionNote || undefined,
          conditions: decisionForm.conditions || undefined,
          expiryDate: decisionForm.expiryDate || undefined
        }
      });
      setDecisionForm({ decisionNote: "", conditions: "", expiryDate: "" });
      queryClient.invalidateQueries({ queryKey: ["waivers", loanId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast(`Waiver ${status.toLowerCase()}.`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to update waiver.", "error");
    }
  };

  const addAttachment = async () => {
    if (!sessionId || !selectedWaiverId) {
      return;
    }
    try {
      await ipcInvoke("waivers:attachments:add", { sessionId, waiverId: selectedWaiverId });
      queryClient.invalidateQueries({ queryKey: ["waiverAttachments", selectedWaiverId] });
      pushToast("Waiver attachment added.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to add attachment.", "error");
    }
  };

  const previewAttachment = async (attachmentId: string) => {
    if (!sessionId) {
      return;
    }
    const result = await ipcInvoke("waivers:attachments:dataUrl", { sessionId, attachmentId });
    const data = unwrapResult(result);
    setAttachmentPreview({ name: data.filename, dataUrl: data.dataUrl });
  };

  const activeFilter = searchParams.get("filter");
  const filterLabelMap: Record<string, string> = {
    pending: "Pending Waivers"
  };
  const filteredWaivers = (waiversQuery.data ?? []).filter((waiver) => {
    if (!activeFilter) {
      return true;
    }
    if (activeFilter === "pending") {
      return waiver.status === "Requested";
    }
    return true;
  });
  const selectedWaiver = (waiversQuery.data ?? []).find((waiver) => waiver.id === selectedWaiverId) ?? null;

  useEffect(() => {
    setAttachmentPreview(null);
  }, [selectedWaiverId]);

  useEffect(() => {
    setSelectedWaiverId(null);
  }, [loanId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waiver Requests"
        subtitle="Manage covenant and obligation waivers from borrowers."
        actions={<HelpLink topicId="waivers" />}
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

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Loan" value={loanId} onChange={(e) => setLoanId(e.target.value)}>
            <option value="">Select loan</option>
            {loansQuery.data?.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.name}
              </option>
            ))}
          </Select>
          <Select
            label="Related type"
            value={form.relatedType}
            onChange={(e) => setForm({ ...form, relatedType: e.target.value })}
          >
            <option value="Covenant">Covenant</option>
            <option value="Obligation">Obligation</option>
          </Select>
          <Input
            label="Related ID"
            value={form.relatedId}
            onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
          />
          <TextArea
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3}
          />
          <Input
            label="Period start"
            type="date"
            value={form.periodStart}
            onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
          />
          <Input
            label="Period end"
            type="date"
            value={form.periodEnd}
            onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
          />
          <Input
            label="Proposed remedy date"
            type="date"
            value={form.proposedRemedyDate}
            onChange={(e) => setForm({ ...form, proposedRemedyDate: e.target.value })}
          />
          <Input
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
          <TextArea
            label="Conditions"
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            rows={2}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={requestWaiver}>
            Request Waiver
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Active Waivers</h3>
        <div className="mt-4">
          <Table>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWaivers.map((waiver) => (
                <tr key={waiver.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-ink">{waiver.relatedType}</td>
                  <td className="px-4 py-3 text-slate-500">{waiver.reason}</td>
                  <td className="px-4 py-3">
                    <Badge tone={waiver.status === "Requested" ? "warning" : waiver.status === "Approved" ? "success" : "danger"}>
                      {waiver.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setSelectedWaiverId(waiver.id)}>
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {selectedWaiverId && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Waiver Detail</h3>
              <p className="text-sm text-slate-500">Review scope, attach evidence, and decide.</p>
            </div>
            <Button variant="outline" onClick={addAttachment}>
              Add Attachment
            </Button>
          </div>

          {selectedWaiver && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-ink">{selectedWaiver.relatedType}</p>
              <p className="text-slate-500">{selectedWaiver.reason}</p>
              <p className="text-xs text-slate-500">
                Period: {selectedWaiver.periodStart ?? "-"} to {selectedWaiver.periodEnd ?? "-"}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {waiverAttachmentsQuery.data?.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <span>{attachment.filename}</span>
                <Button variant="outline" onClick={() => previewAttachment(attachment.id)}>
                  Preview
                </Button>
              </div>
            ))}
            {waiverAttachmentsQuery.data?.length === 0 && (
              <p className="text-sm text-slate-500">No attachments uploaded yet.</p>
            )}
          </div>

          {attachmentPreview && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-ink">{attachmentPreview.name}</p>
              <iframe className="mt-2 h-48 w-full rounded" src={attachmentPreview.dataUrl} />
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <TextArea
              label="Decision note"
              value={decisionForm.decisionNote}
              onChange={(e) => setDecisionForm({ ...decisionForm, decisionNote: e.target.value })}
              rows={3}
            />
            <TextArea
              label="Conditions"
              value={decisionForm.conditions}
              onChange={(e) => setDecisionForm({ ...decisionForm, conditions: e.target.value })}
              rows={3}
            />
            <Input
              label="Expiry date"
              type="date"
              value={decisionForm.expiryDate}
              onChange={(e) => setDecisionForm({ ...decisionForm, expiryDate: e.target.value })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => decide(selectedWaiverId, "Approved")}>
              Approve
            </Button>
            <Button variant="outline" onClick={() => decide(selectedWaiverId, "Rejected")}>
              Reject
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
