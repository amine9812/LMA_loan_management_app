import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Select from "../components/Select";
import Button from "../components/Button";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";

export default function ExportCenter() {
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { currentLoanId, setCurrentLoanId } = useCurrentLoan();
  const [loanId, setLoanId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [includeAuditEvents, setIncludeAuditEvents] = useState(false);
  const [includeDocumentsMetadataOnly, setIncludeDocumentsMetadataOnly] = useState(true);
  const [importPreview, setImportPreview] = useState<{
    summary: {
      loanName: string;
      parties: number;
      documents: number;
      clauses: number;
      obligations: number;
      covenants: number;
    };
    payload: unknown;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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

  const exportHistoryQuery = useQuery({
    queryKey: ["exportHistory", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("exports:history", {
        sessionId: sessionId ?? "",
        loanId: loanId || undefined
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const exportCsv = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    try {
      const result = await ipcInvoke("exports:csv", { sessionId, loanId });
      const data = unwrapResult(result);
      setMessage(`CSV exported to ${data.path}`);
      setLastExportPath(data.path);
      queryClient.invalidateQueries({ queryKey: ["exportHistory", loanId] });
      pushToast("CSV export complete.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "CSV export failed.", "error");
    }
  };

  const exportPdf = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    try {
      const result = await ipcInvoke("exports:pdf", { sessionId, loanId });
      const data = unwrapResult(result);
      setMessage(`PDF exported to ${data.path}`);
      setLastExportPath(data.path);
      queryClient.invalidateQueries({ queryKey: ["exportHistory", loanId] });
      pushToast("PDF export complete.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "PDF export failed.", "error");
    }
  };

  const exportSchema = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    try {
      const result = await ipcInvoke("interop:export", {
        sessionId,
        input: {
          loanId,
          includeAuditEvents,
          includeDocumentsMetadataOnly
        }
      });
      const data = unwrapResult(result);
      setMessage(`Loan Obligation Schema exported to ${data.path}`);
      setLastExportPath(data.path);
      queryClient.invalidateQueries({ queryKey: ["exportHistory", loanId] });
      pushToast("Schema export complete.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Schema export failed.", "error");
    }
  };

  const previewImport = async () => {
    if (!sessionId) {
      return;
    }
    setImportError(null);
    try {
      const result = await ipcInvoke("interop:previewImport", { sessionId });
      const data = unwrapResult(result);
      setImportPreview(data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import preview failed");
      pushToast("Import preview failed.", "error");
    }
  };

  const confirmImport = async () => {
    if (!sessionId || !importPreview) {
      return;
    }
    try {
      const result = await ipcInvoke("interop:import", {
        sessionId,
        schema: importPreview.payload as object
      });
      const data = unwrapResult(result);
      setMessage(`Imported loan copy created (${data.loanId}).`);
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      pushToast("Loan schema imported.", "success");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
      pushToast("Import failed.", "error");
    }
  };

  const openExportFolder = async (path: string) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("exports:openFolder", { sessionId, path });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exports"
        subtitle="Generate CSV and PDF compliance packs for audit and reporting."
        actions={<HelpLink topicId="exports" />}
      />

      <Card className="p-6">
        <Select label="Loan" value={loanId} onChange={(e) => setLoanId(e.target.value)}>
          <option value="">Select loan</option>
          {loansQuery.data?.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.name}
            </option>
          ))}
        </Select>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            Export PDF
          </Button>
        </div>
        {message && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-emerald-600">
            <span>{message}</span>
            {lastExportPath && (
              <Button variant="outline" onClick={() => openExportFolder(lastExportPath)}>
                Open Folder
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Interoperability</h3>
        <p className="text-sm text-slate-500">
          Export or import the Loan Obligation Schema (JSON) for standardized data exchange.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeAuditEvents}
              onChange={(e) => setIncludeAuditEvents(e.target.checked)}
            />
            Include audit events
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeDocumentsMetadataOnly}
              onChange={(e) => setIncludeDocumentsMetadataOnly(e.target.checked)}
            />
            Documents metadata only
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportSchema} disabled={!loanId}>
            Export Loan Obligation Schema (JSON)
          </Button>
          <Button variant="outline" onClick={previewImport}>
            Import Loan Obligation Schema (JSON)
          </Button>
        </div>
        {importPreview && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink">Import Preview</p>
            <p className="mt-2 text-sm text-slate-600">Loan: {importPreview.summary.loanName}</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
              <span>Parties: {importPreview.summary.parties}</span>
              <span>Documents: {importPreview.summary.documents}</span>
              <span>Clauses: {importPreview.summary.clauses}</span>
              <span>Obligations: {importPreview.summary.obligations}</span>
              <span>Covenants: {importPreview.summary.covenants}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={confirmImport}>
                Create New Copy
              </Button>
              <Button variant="outline" onClick={() => setImportPreview(null)}>
                Cancel
              </Button>
            </div>
            {importError && <p className="mt-2 text-sm text-rose-600">{importError}</p>}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Export History</h3>
        <p className="text-sm text-slate-500">Track generated compliance packs and schema exports.</p>
        <div className="mt-4 space-y-2 text-sm">
          {exportHistoryQuery.data?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div>
                <p className="font-semibold text-ink">{item.exportType} · {item.filePath}</p>
                <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <Button variant="outline" onClick={() => openExportFolder(item.filePath)}>
                Open Folder
              </Button>
            </div>
          ))}
          {exportHistoryQuery.data?.length === 0 && (
            <p className="text-sm text-slate-500">No exports generated yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
