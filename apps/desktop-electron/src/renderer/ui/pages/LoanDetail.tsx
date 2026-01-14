import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import Table from "../components/Table";
import Badge from "../components/Badge";
import Input from "../components/Input";
import Select from "../components/Select";
import TextArea from "../components/TextArea";
import HelpLink from "../components/HelpLink";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";
import type {
  ConsistencyFinding,
  CovenantResult,
  DocumentVersion,
  ExtractedSuggestion,
  GreenAssessment,
  ObligationInstance,
  SemanticDiffItem,
  TermSheetVersion
} from "@shared";

const allTabs = [
  "Overview",
  "Obligations",
  "Covenants",
  "Submissions",
  "Review Queue",
  "Waivers",
  "Documents",
  "Green Lending Check",
  "Exports",
  "Timeline",
  "Workbench",
  "Term Sheet",
  "Drafts",
  "Consistency",
  "Audit Trail"
] as const;

type Tab = (typeof allTabs)[number];

const GREEN_USE_OF_PROCEEDS = [
  "Renewable Energy",
  "Green Buildings",
  "Clean Transport",
  "Energy Efficiency",
  "Pollution Prevention",
  "Sustainable Water",
  "Climate Adaptation",
  "Circular Economy"
];

const GREEN_EXCLUSIONS = [
  "Coal",
  "Oil expansion",
  "Gas expansion",
  "Deforestation",
  "Weapons",
  "Fossil fuel expansion"
];

export default function LoanDetail() {
  const { loanId } = useParams();
  const { sessionId, user } = useAuth();
  const { setCurrentLoanId } = useCurrentLoan();
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [docPreview, setDocPreview] = useState<{ name: string; dataUrl: string } | null>(null);
  const [clauseDocId, setClauseDocId] = useState<string>("");
  const [clauseForm, setClauseForm] = useState({
    clauseType: "Obligation",
    title: "",
    textSnippet: "",
    pageNumber: 1,
    tags: ""
  });
  const [workbenchDocId, setWorkbenchDocId] = useState<string>("");
  const [workbenchAdapter, setWorkbenchAdapter] = useState("local-heuristic");
  const [workbenchRunId, setWorkbenchRunId] = useState<string>("");
  const [editSuggestion, setEditSuggestion] = useState<{
    suggestionId: string;
    payload: string;
  } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [termSheetForm, setTermSheetForm] = useState({
    facilityType: "",
    commitmentAmount: 0,
    marginBps: 0,
    maturityDate: "",
    leverageThreshold: 0,
    interestCoverageThreshold: 0,
    reportingDaysAfterPeriodEnd: 0,
    ebitdaAdjustments: ""
  });
  const [selectedTermSheetId, setSelectedTermSheetId] = useState<string>("");
  const [draftTemplateKeys, setDraftTemplateKeys] = useState<string[]>([]);
  const [draftTermSheetId, setDraftTermSheetId] = useState<string>("");
  const [diffAId, setDiffAId] = useState<string>("");
  const [diffBId, setDiffBId] = useState<string>("");
  const [semanticDiff, setSemanticDiff] = useState<SemanticDiffItem[] | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [greenForm, setGreenForm] = useState({
    useOfProceeds: [] as string[],
    emissionsReductionPct: "",
    renewableSharePct: "",
    energyEfficiencyPct: "",
    cleanTransportPct: "",
    reportingCadence: "Quarterly",
    verification: "ThirdParty",
    traceability: "Moderate",
    exclusions: [] as string[],
    notes: ""
  });
  const [greenEvidenceForm, setGreenEvidenceForm] = useState({
    documentId: "",
    category: "Use of Proceeds",
    snippet: "",
    pageNumber: ""
  });
  const tabParam = searchParams.get("tab");

  const loanQuery = useQuery({
    queryKey: ["loan", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("loans:get", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const obligationsQuery = useQuery({
    queryKey: ["obligations", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("obligations:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const instancesQuery = useQuery({
    queryKey: ["obligationInstances", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("obligationInstances:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const covenantsQuery = useQuery({
    queryKey: ["covenants", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("covenants:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const resultsQuery = useQuery({
    queryKey: ["covenantResults", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("covenants:results", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("documents:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const documentVersionsQuery = useQuery({
    queryKey: ["documentVersions", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("documentVersions:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const termSheetsQuery = useQuery({
    queryKey: ["termSheets", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("termSheets:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const canReview = user?.role === "Admin" || user?.role === "LenderOps";
  const canEditTemplates = user?.role === "Admin" || user?.role === "LenderOps";
  const canEditWorkbench = user?.role === "Admin" || user?.role === "LenderOps";
  const canEditTermSheet = user?.role === "Admin" || user?.role === "LenderOps";

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const result = await ipcInvoke("templates:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && canEditTemplates)
  });

  const extractionRunsQuery = useQuery({
    queryKey: ["extractionRuns", workbenchDocId],
    queryFn: async () => {
      const result = await ipcInvoke("extraction:runs", { sessionId: sessionId ?? "", documentId: workbenchDocId });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && workbenchDocId)
  });

  const extractionSuggestionsQuery = useQuery({
    queryKey: ["extractionSuggestions", workbenchRunId],
    queryFn: async () => {
      const result = await ipcInvoke("extraction:suggestions", { sessionId: sessionId ?? "", runId: workbenchRunId });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && workbenchRunId)
  });

  const consistencyQuery = useQuery({
    queryKey: ["consistencyFindings", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("consistency:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("submissions:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const waiversQuery = useQuery({
    queryKey: ["waivers", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("waivers:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const exportHistoryQuery = useQuery({
    queryKey: ["exportHistory", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("exports:history", {
        sessionId: sessionId ?? "",
        loanId: loanId ?? ""
      });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const auditQuery = useQuery({
    queryKey: ["audit", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("audit:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const greenLatestQuery = useQuery({
    queryKey: ["greenLatest", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("green:latest", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const greenListQuery = useQuery({
    queryKey: ["greenAssessments", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("green:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const greenEvidenceQuery = useQuery({
    queryKey: ["greenEvidence", loanId],
    queryFn: async () => {
      const result = await ipcInvoke("green:evidence:list", { sessionId: sessionId ?? "", loanId: loanId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && loanId)
  });

  const covenantMap = useMemo(() => {
    const map = new Map<string, string>();
    (covenantsQuery.data ?? []).forEach((covenant) => {
      map.set(covenant.id, covenant.name);
    });
    return map;
  }, [covenantsQuery.data]);

  const obligationMap = useMemo(() => {
    const map = new Map<string, string>();
    (obligationsQuery.data ?? []).forEach((obligation) => {
      map.set(obligation.id, obligation.title);
    });
    return map;
  }, [obligationsQuery.data]);

  const latestResults = useMemo(() => {
    const results = resultsQuery.data ?? [];
    const map = new Map<string, CovenantResult>();
    results.forEach((result) => {
      if (!map.has(result.covenantId)) {
        map.set(result.covenantId, result);
      }
    });
    return Array.from(map.values());
  }, [resultsQuery.data]);

  const reviewQueueItems = useMemo(() => {
    return (submissionsQuery.data ?? []).filter((submission) =>
      ["Submitted", "UnderReview"].includes(submission.status)
    );
  }, [submissionsQuery.data]);

  const nextDue = useMemo(() => {
    const instances = instancesQuery.data ?? [];
    return instances.find((item) => item.status === "Pending" || item.status === "Overdue");
  }, [instancesQuery.data]);

  const suggestionGroups = useMemo(() => {
    const groups: Record<string, Array<{ suggestion: ExtractedSuggestion; payload: Record<string, any> }>> = {
      Clause: [],
      Obligation: [],
      Covenant: [],
      Definition: []
    };
    (extractionSuggestionsQuery.data ?? []).forEach((suggestion) => {
      try {
        const payload = JSON.parse(suggestion.payloadJson) as Record<string, any>;
        groups[suggestion.suggestionType]?.push({ suggestion, payload });
      } catch {
        return;
      }
    });
    return groups;
  }, [extractionSuggestionsQuery.data]);

  const selectedTermSheet = useMemo(() => {
    return termSheetsQuery.data?.find((sheet) => sheet.id === selectedTermSheetId) ?? null;
  }, [termSheetsQuery.data, selectedTermSheetId]);

  const visibleTabs = useMemo(
    () => allTabs.filter((tab) => (tab === "Review Queue" ? canReview : true)),
    [canReview]
  );

  const setTab = (tab: Tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  const termSheetDetails = useMemo(() => {
    if (!selectedTermSheet) {
      return null;
    }
    try {
      return JSON.parse(selectedTermSheet.dataJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [selectedTermSheet]);

  const latestGreen = greenLatestQuery.data;
  const greenVerdictLabel = latestGreen?.verdict === "NotGreen" ? "Not Green" : latestGreen?.verdict;
  const greenBreakdown = useMemo(() => {
    if (!latestGreen?.breakdownJson) {
      return null;
    }
    try {
      return JSON.parse(latestGreen.breakdownJson) as {
        components: Record<string, number>;
        missingData: string[];
        redFlags: string[];
      };
    } catch {
      return null;
    }
  }, [latestGreen]);

  const greenExplanationPoints = useMemo(() => {
    if (!greenBreakdown?.components) {
      return [];
    }
    const points: string[] = [];
    points.push(
      greenBreakdown.components.eligibility >= 20
        ? "Eligibility is strong based on aligned use-of-proceeds categories."
        : "Eligibility is limited; add clearer use-of-proceeds alignment."
    );
    points.push(
      greenBreakdown.components.kpiAmbition >= 15
        ? "KPI ambition supports the score with measurable improvement targets."
        : "KPI ambition is weak or missing; consider stronger targets."
    );
    points.push(
      greenBreakdown.components.verificationReporting >= 12
        ? "Verification and reporting cadence meet lender expectations."
        : "Verification/reporting is light; add third-party assurance or tighter cadence."
    );
    points.push(
      greenBreakdown.components.traceability >= 10
        ? "Use-of-proceeds traceability is documented."
        : "Traceability evidence is thin; add evidence tags."
    );
    if (greenBreakdown.redFlags?.length) {
      points.push(`Red flags flagged: ${greenBreakdown.redFlags.join(", ")}.`);
    }
    if (greenBreakdown.missingData?.length) {
      points.push(`Missing data: ${greenBreakdown.missingData.join(", ")}.`);
    }
    return points;
  }, [greenBreakdown]);

  const openDocument = async (documentId: string, filename: string) => {
    if (!sessionId) {
      return;
    }
    const result = await ipcInvoke("documents:dataUrl", { sessionId, documentId });
    const data = unwrapResult(result);
    setDocPreview({ name: filename, dataUrl: data.dataUrl });
  };

  const openDocumentVersion = async (documentVersionId: string, filename: string) => {
    if (!sessionId) {
      return;
    }
    const result = await ipcInvoke("documentVersions:dataUrl", { sessionId, documentVersionId });
    const data = unwrapResult(result);
    setDocPreview({ name: filename, dataUrl: data.dataUrl });
  };

  const runExtraction = async () => {
    if (!sessionId || !workbenchDocId) {
      return;
    }
    const result = await ipcInvoke("extraction:run", {
      sessionId,
      input: {
        documentId: workbenchDocId,
        adapterKey: workbenchAdapter
      }
    });
    const run = unwrapResult(result);
    setWorkbenchRunId(run.id);
    extractionRunsQuery.refetch();
    extractionSuggestionsQuery.refetch();
  };

  const confirmSuggestion = async (suggestionId: string, edits?: Record<string, unknown>) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("extraction:confirm", {
      sessionId,
      input: { suggestionId, edits }
    });
    extractionSuggestionsQuery.refetch();
    obligationsQuery.refetch();
    covenantsQuery.refetch();
    clausesQuery.refetch();
  };

  const rejectSuggestion = async (suggestionId: string) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("extraction:reject", { sessionId, suggestionId });
    extractionSuggestionsQuery.refetch();
  };

  const saveTermSheet = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    const result = await ipcInvoke("termSheets:create", {
      sessionId,
      input: {
        loanId,
        data: {
          facilityType: termSheetForm.facilityType,
          commitmentAmount: Number(termSheetForm.commitmentAmount),
          marginBps: Number(termSheetForm.marginBps),
          maturityDate: termSheetForm.maturityDate,
          leverageThreshold: Number(termSheetForm.leverageThreshold),
          interestCoverageThreshold: Number(termSheetForm.interestCoverageThreshold),
          reportingDaysAfterPeriodEnd: Number(termSheetForm.reportingDaysAfterPeriodEnd),
          ebitdaAdjustments: termSheetForm.ebitdaAdjustments
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        }
      }
    });
    const data = unwrapResult(result);
    setSelectedTermSheetId(data.id);
    setDraftTermSheetId(data.id);
    termSheetsQuery.refetch();
  };

  const generateDraft = async () => {
    if (!sessionId || !loanId || !draftTermSheetId || draftTemplateKeys.length === 0) {
      return;
    }
    await ipcInvoke("drafts:generate", {
      sessionId,
      input: { loanId, termSheetVersionId: draftTermSheetId, templateKeys: draftTemplateKeys }
    });
    documentVersionsQuery.refetch();
  };

  const runSemanticDiff = async () => {
    if (!sessionId || !loanId || !diffAId || !diffBId) {
      return;
    }
    const result = await ipcInvoke("diffs:semantic", {
      sessionId,
      input: { loanId, documentVersionAId: diffAId, documentVersionBId: diffBId }
    });
    const data = unwrapResult(result);
    setSemanticDiff(data);
  };

  const runConsistencyCheck = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    await ipcInvoke("consistency:run", { sessionId, input: { loanId } });
    consistencyQuery.refetch();
  };

  const resolveFinding = async (findingId: string) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("consistency:resolve", { sessionId, input: { findingId } });
    consistencyQuery.refetch();
  };

  const exportCsv = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    try {
      const result = await ipcInvoke("exports:csv", { sessionId, loanId });
      const data = unwrapResult(result);
      setExportMessage(`CSV exported to ${data.path}`);
      setLastExportPath(data.path);
      exportHistoryQuery.refetch();
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
      setExportMessage(`PDF exported to ${data.path}`);
      setLastExportPath(data.path);
      exportHistoryQuery.refetch();
      pushToast("PDF export complete.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "PDF export failed.", "error");
    }
  };

  const openExportFolder = async () => {
    if (!sessionId || !lastExportPath) {
      return;
    }
    await ipcInvoke("exports:openFolder", { sessionId, path: lastExportPath });
  };

  const toggleGreenArrayValue = (field: "useOfProceeds" | "exclusions", value: string) => {
    setGreenForm((prev) => {
      const values = new Set(prev[field]);
      if (values.has(value)) {
        values.delete(value);
      } else {
        values.add(value);
      }
      return { ...prev, [field]: Array.from(values) };
    });
  };

  const saveGreenAssessment = async () => {
    if (!sessionId || !loanId) {
      return;
    }
    const hasKpi =
      Boolean(greenForm.emissionsReductionPct) ||
      Boolean(greenForm.renewableSharePct) ||
      Boolean(greenForm.energyEfficiencyPct) ||
      Boolean(greenForm.cleanTransportPct);
    if (greenForm.useOfProceeds.length === 0 && !hasKpi) {
      pushToast("Select a use-of-proceeds category or enter KPI targets.", "error");
      return;
    }
    const toNumber = (value: string) => {
      if (!value.trim()) {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    try {
      await ipcInvoke("green:save", {
        sessionId,
        input: {
          loanId,
          inputs: {
            useOfProceeds: greenForm.useOfProceeds,
            kpis: {
              emissionsReductionPct: toNumber(greenForm.emissionsReductionPct),
              renewableSharePct: toNumber(greenForm.renewableSharePct),
              energyEfficiencyPct: toNumber(greenForm.energyEfficiencyPct),
              cleanTransportPct: toNumber(greenForm.cleanTransportPct)
            },
            reportingCadence: greenForm.reportingCadence,
            verification: greenForm.verification,
            traceability: greenForm.traceability,
            exclusions: greenForm.exclusions,
            notes: greenForm.notes || undefined
          }
        }
      });
      greenLatestQuery.refetch();
      greenListQuery.refetch();
      pushToast("Green assessment saved.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to save assessment.", "error");
    }
  };

  const addGreenEvidenceTag = async () => {
    if (!sessionId || !loanId || !greenEvidenceForm.documentId) {
      return;
    }
    await ipcInvoke("green:evidence:add", {
      sessionId,
      input: {
        loanId,
        documentId: greenEvidenceForm.documentId,
        category: greenEvidenceForm.category,
        snippet: greenEvidenceForm.snippet,
        pageNumber: greenEvidenceForm.pageNumber ? Number(greenEvidenceForm.pageNumber) : null
      }
    });
    setGreenEvidenceForm((prev) => ({ ...prev, snippet: "", pageNumber: "" }));
    greenEvidenceQuery.refetch();
  };

  const saveEditedSuggestion = async () => {
    if (!editSuggestion) {
      return;
    }
    try {
      const edits = JSON.parse(editSuggestion.payload) as Record<string, unknown>;
      await confirmSuggestion(editSuggestion.suggestionId, edits);
      setEditSuggestion(null);
      setEditError(null);
    } catch (error) {
      setEditError("Invalid JSON. Please correct and try again.");
    }
  };

  const updateDueDate = async (instanceId: string, currentDueDate: string) => {
    if (!sessionId) {
      return;
    }
    const next = window.prompt("Enter new due date (YYYY-MM-DD):", currentDueDate.slice(0, 10));
    if (!next) {
      return;
    }
    await ipcInvoke("obligationInstances:update", {
      sessionId,
      instanceId,
      dueDate: new Date(next).toISOString()
    });
    instancesQuery.refetch();
  };

  const loan = loanQuery.data;

  useEffect(() => {
    if (loanId) {
      setCurrentLoanId(loanId);
    }
  }, [loanId, setCurrentLoanId]);

  useEffect(() => {
    if (tabParam && allTabs.includes(tabParam as Tab)) {
      if (tabParam === "Review Queue" && !canReview) {
        setActiveTab("Overview");
        return;
      }
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam, canReview]);

  useEffect(() => {
    if (!canReview && activeTab === "Review Queue") {
      setActiveTab("Overview");
    }
  }, [activeTab, canReview]);
  useEffect(() => {
    if (!clauseDocId && documentsQuery.data && documentsQuery.data.length > 0) {
      setClauseDocId(documentsQuery.data[0].id);
    }
    if (!workbenchDocId && documentsQuery.data && documentsQuery.data.length > 0) {
      setWorkbenchDocId(documentsQuery.data[0].id);
    }
  }, [clauseDocId, workbenchDocId, documentsQuery.data]);

  useEffect(() => {
    if (!workbenchRunId && extractionRunsQuery.data && extractionRunsQuery.data.length > 0) {
      setWorkbenchRunId(extractionRunsQuery.data[0].id);
    }
  }, [workbenchRunId, extractionRunsQuery.data]);

  useEffect(() => {
    if (!selectedTermSheetId && termSheetsQuery.data && termSheetsQuery.data.length > 0) {
      setSelectedTermSheetId(termSheetsQuery.data[0].id);
    }
    if (!draftTermSheetId && termSheetsQuery.data && termSheetsQuery.data.length > 0) {
      setDraftTermSheetId(termSheetsQuery.data[0].id);
    }
  }, [selectedTermSheetId, draftTermSheetId, termSheetsQuery.data]);

  useEffect(() => {
    if (!greenEvidenceForm.documentId && documentsQuery.data && documentsQuery.data.length > 0) {
      setGreenEvidenceForm((prev) => ({ ...prev, documentId: documentsQuery.data[0].id }));
    }
  }, [greenEvidenceForm.documentId, documentsQuery.data]);

  useEffect(() => {
    if (!latestGreen?.inputsJson) {
      return;
    }
    try {
      const parsed = JSON.parse(latestGreen.inputsJson) as {
        useOfProceeds?: string[];
        kpis?: Record<string, number>;
        reportingCadence?: string;
        verification?: string;
        traceability?: string;
        exclusions?: string[];
        notes?: string;
      };
      setGreenForm((prev) => ({
        ...prev,
        useOfProceeds: parsed.useOfProceeds ?? [],
        emissionsReductionPct: parsed.kpis?.emissionsReductionPct?.toString() ?? "",
        renewableSharePct: parsed.kpis?.renewableSharePct?.toString() ?? "",
        energyEfficiencyPct: parsed.kpis?.energyEfficiencyPct?.toString() ?? "",
        cleanTransportPct: parsed.kpis?.cleanTransportPct?.toString() ?? "",
        reportingCadence: parsed.reportingCadence ?? prev.reportingCadence,
        verification: parsed.verification ?? prev.verification,
        traceability: parsed.traceability ?? prev.traceability,
        exclusions: parsed.exclusions ?? [],
        notes: parsed.notes ?? ""
      }));
    } catch {
      return;
    }
  }, [latestGreen]);

  const clausesQuery = useQuery({
    queryKey: ["clauses", clauseDocId],
    queryFn: async () => {
      const result = await ipcInvoke("clauses:list", { sessionId: sessionId ?? "", documentId: clauseDocId });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && clauseDocId)
  });

  const submitClause = async () => {
    if (!sessionId || !clauseDocId) {
      return;
    }
    const tags = clauseForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const result = await ipcInvoke("clauses:create", {
      sessionId,
      input: {
        documentId: clauseDocId,
        clauseType: clauseForm.clauseType as "Obligation" | "Covenant" | "Definition" | "Other",
        title: clauseForm.title,
        textSnippet: clauseForm.textSnippet,
        pageNumber: Number(clauseForm.pageNumber),
        tags
      }
    });
    unwrapResult(result);
    setClauseForm({ clauseType: "Obligation", title: "", textSnippet: "", pageNumber: 1, tags: "" });
    clausesQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={loan?.name ?? "Loan Detail"}
        subtitle={loan ? `${loan.borrowerName} - ${loan.currency}` : "Loading"}
        actions={
          <div className="flex gap-2">
            <HelpLink topicId="loans" />
            <Button variant="outline" onClick={() => setTab("Documents")}>Documents</Button>
            <Button variant="secondary" onClick={() => setTab("Obligations")}>Add Obligation</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? "bg-ink text-white" : "bg-white text-slate-600"
            }`}
            onClick={() => setTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">Next due</p>
            <p className="mt-2 text-xl font-semibold text-ink">
              {nextDue?.dueDate ?? "No pending items"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {nextDue ? obligationMap.get(nextDue.obligationId) ?? "Obligation instance" : ""}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">Active obligations</p>
            <p className="mt-2 text-xl font-semibold text-ink">{obligationsQuery.data?.length ?? 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">Active covenants</p>
            <p className="mt-2 text-xl font-semibold text-ink">{covenantsQuery.data?.length ?? 0}</p>
          </Card>
          <Card className="p-6 lg:col-span-3">
            <h3 className="text-lg font-semibold">Latest Covenant Results</h3>
            <div className="mt-4 space-y-3">
              {latestResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between rounded-lg bg-mist px-4 py-3">
                  <div>
                  <p className="text-sm font-semibold">
                    {covenantMap.get(result.covenantId) ?? result.covenantId}
                  </p>
                    <p className="text-xs text-slate-500">Period end {result.periodEnd}</p>
                  </div>
                  <Badge tone={result.passFail === "Pass" ? "success" : "danger"}>
                    {result.passFail} - {result.computedValue}
                  </Badge>
                </div>
              ))}
              {latestResults.length === 0 && (
                <p className="text-sm text-slate-500">No covenant results yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Obligations" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Obligations</h3>
              <p className="text-sm text-slate-500">Track reporting and compliance deliverables.</p>
            </div>
            <Link to={`/loans/${loanId}/obligations/new`}>
              <Button variant="secondary">Create Obligation</Button>
            </Link>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {obligationsQuery.data?.map((obligation) => (
                  <tr key={obligation.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{obligation.title}</td>
                    <td className="px-4 py-3 text-slate-600">{obligation.frequency}</td>
                    <td className="px-4 py-3 text-slate-600">{obligation.severity}</td>
                    <td className="px-4 py-3 text-slate-600">{obligation.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {obligationsQuery.data?.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No obligations yet. Add an obligation to start tracking deadlines.
              </p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "Covenants" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Covenants</h3>
              <p className="text-sm text-slate-500">Thresholds and ratio calculations.</p>
            </div>
            <Link to={`/loans/${loanId}/covenants/new`}>
              <Button variant="secondary">Create Covenant</Button>
            </Link>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {covenantsQuery.data?.map((covenant) => (
                  <tr key={covenant.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{covenant.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {covenant.thresholdOp} {covenant.thresholdValue}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{covenant.frequency}</td>
                    <td className="px-4 py-3 text-slate-600">{covenant.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {covenantsQuery.data?.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No covenants yet. Add a covenant to enable breach monitoring.
              </p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "Timeline" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Calendar & Timeline</h3>
          <p className="text-sm text-slate-500">Upcoming deliverables across the loan.</p>
          <div className="mt-4 space-y-2">
            {(instancesQuery.data ?? []).map((instance: ObligationInstance) => (
              <div key={instance.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {obligationMap.get(instance.obligationId) ?? instance.obligationId}
                  </p>
                  <p className="text-xs text-slate-500">Due {instance.dueDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={instance.status === "Overdue" ? "danger" : "neutral"}>
                    {instance.status}
                  </Badge>
                  <Button variant="outline" onClick={() => updateDueDate(instance.id, instance.dueDate)}>
                    Change date
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "Documents" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Documents</h3>
              <p className="text-sm text-slate-500">Loan agreements and covenant sources.</p>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!sessionId || !loanId) {
                  return;
                }
                await ipcInvoke("documents:import", { sessionId, loanId });
                documentsQuery.refetch();
              }}
            >
              Upload PDF
            </Button>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {documentsQuery.data?.map((doc) => (
                  <tr key={doc.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{doc.filename}</td>
                    <td className="px-4 py-3 text-slate-500">{doc.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" onClick={() => openDocument(doc.id, doc.filename)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-lg font-semibold">Add Clause Reference</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block text-xs uppercase tracking-wide">Document</span>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  value={clauseDocId}
                  onChange={(e) => setClauseDocId(e.target.value)}
                >
                  {documentsQuery.data?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block text-xs uppercase tracking-wide">Clause Type</span>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  value={clauseForm.clauseType}
                  onChange={(e) => setClauseForm({ ...clauseForm, clauseType: e.target.value })}
                >
                  <option value="Obligation">Obligation</option>
                  <option value="Covenant">Covenant</option>
                  <option value="Definition">Definition</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block text-xs uppercase tracking-wide">Title</span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  value={clauseForm.title}
                  onChange={(e) => setClauseForm({ ...clauseForm, title: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block text-xs uppercase tracking-wide">Page Number</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  value={clauseForm.pageNumber}
                  onChange={(e) => setClauseForm({ ...clauseForm, pageNumber: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm text-slate-600 md:col-span-2">
                <span className="mb-1 block text-xs uppercase tracking-wide">Text Snippet</span>
                <textarea
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  rows={3}
                  value={clauseForm.textSnippet}
                  onChange={(e) => setClauseForm({ ...clauseForm, textSnippet: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-600 md:col-span-2">
                <span className="mb-1 block text-xs uppercase tracking-wide">Tags (comma separated)</span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                  value={clauseForm.tags}
                  onChange={(e) => setClauseForm({ ...clauseForm, tags: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={submitClause}>
                Save Clause
              </Button>
            </div>
          </div>
          {clausesQuery.data && clausesQuery.data.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold">Clause References</h4>
              <div className="mt-4 space-y-2">
                {clausesQuery.data.map((clause) => (
                  <div key={clause.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{clause.title}</p>
                        <p className="text-xs text-slate-500">Page {clause.pageNumber}</p>
                      </div>
                      <Badge tone="info">{clause.clauseType}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{clause.textSnippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === "Green Lending Check" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Green Lending Check</h3>
              <p className="text-sm text-slate-500">Score the loan and document evidence for green eligibility.</p>
            </div>
            <Button variant="secondary" onClick={saveGreenAssessment}>
              Run Assessment
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-600">Use of Proceeds</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {GREEN_USE_OF_PROCEEDS.map((category) => (
                    <label key={category} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={greenForm.useOfProceeds.includes(category)}
                        onChange={() => toggleGreenArrayValue("useOfProceeds", category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600">KPI Targets (%)</p>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <Input
                    label="Emissions reduction"
                    type="number"
                    value={greenForm.emissionsReductionPct}
                    onChange={(e) => setGreenForm({ ...greenForm, emissionsReductionPct: e.target.value })}
                  />
                  <Input
                    label="Renewable share"
                    type="number"
                    value={greenForm.renewableSharePct}
                    onChange={(e) => setGreenForm({ ...greenForm, renewableSharePct: e.target.value })}
                  />
                  <Input
                    label="Energy efficiency"
                    type="number"
                    value={greenForm.energyEfficiencyPct}
                    onChange={(e) => setGreenForm({ ...greenForm, energyEfficiencyPct: e.target.value })}
                  />
                  <Input
                    label="Clean transport"
                    type="number"
                    value={greenForm.cleanTransportPct}
                    onChange={(e) => setGreenForm({ ...greenForm, cleanTransportPct: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Reporting cadence"
                  value={greenForm.reportingCadence}
                  onChange={(e) => setGreenForm({ ...greenForm, reportingCadence: e.target.value })}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Semiannual">Semiannual</option>
                  <option value="Annual">Annual</option>
                  <option value="Adhoc">Ad hoc</option>
                </Select>
                <Select
                  label="Verification"
                  value={greenForm.verification}
                  onChange={(e) => setGreenForm({ ...greenForm, verification: e.target.value })}
                >
                  <option value="ThirdParty">Third-party</option>
                  <option value="Internal">Internal</option>
                  <option value="None">None</option>
                </Select>
                <Select
                  label="Traceability"
                  value={greenForm.traceability}
                  onChange={(e) => setGreenForm({ ...greenForm, traceability: e.target.value })}
                >
                  <option value="Strong">Strong</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Weak">Weak</option>
                </Select>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600">Exclusions / Red Flags</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {GREEN_EXCLUSIONS.map((exclusion) => (
                    <label key={exclusion} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={greenForm.exclusions.includes(exclusion)}
                        onChange={() => toggleGreenArrayValue("exclusions", exclusion)}
                      />
                      <span>{exclusion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <TextArea
                label="Notes"
                rows={3}
                value={greenForm.notes}
                onChange={(e) => setGreenForm({ ...greenForm, notes: e.target.value })}
              />
            </div>

            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-600">Latest Assessment</p>
                {latestGreen ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-semibold text-ink">{latestGreen.score}</p>
                      <Badge
                        tone={
                          latestGreen.verdict === "Green"
                            ? "success"
                            : latestGreen.verdict === "Transitional"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {greenVerdictLabel ?? latestGreen.verdict}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Last updated {new Date(latestGreen.updatedAt).toLocaleString()}
                    </p>
                    {greenBreakdown?.components && (
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Eligibility: {greenBreakdown.components.eligibility}</p>
                        <p>KPI Ambition: {greenBreakdown.components.kpiAmbition}</p>
                        <p>Verification & Reporting: {greenBreakdown.components.verificationReporting}</p>
                        <p>Traceability: {greenBreakdown.components.traceability}</p>
                        <p>Exclusions: {greenBreakdown.components.exclusions}</p>
                      </div>
                    )}
                    {greenExplanationPoints.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold text-ink">Why this score</p>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {greenExplanationPoints.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {greenBreakdown?.missingData?.length ? (
                      <p className="text-xs text-amber-600">
                        Missing: {greenBreakdown.missingData.join(", ")}
                      </p>
                    ) : null}
                    {greenBreakdown?.redFlags?.length ? (
                      <p className="text-xs text-rose-600">
                        Red flags: {greenBreakdown.redFlags.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No assessment saved yet.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-600">Assessment History</p>
                <div className="mt-3 space-y-2 text-sm">
                  {greenListQuery.data?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span>Version {item.versionNo}</span>
                      <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {greenListQuery.data?.length === 0 && (
                    <p className="text-sm text-slate-500">No assessment history yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-lg font-semibold">Evidence Tags</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select
                label="Document"
                value={greenEvidenceForm.documentId}
                onChange={(e) => setGreenEvidenceForm({ ...greenEvidenceForm, documentId: e.target.value })}
              >
                {documentsQuery.data?.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename}
                  </option>
                ))}
              </Select>
              <Select
                label="Category"
                value={greenEvidenceForm.category}
                onChange={(e) => setGreenEvidenceForm({ ...greenEvidenceForm, category: e.target.value })}
              >
                <option value="Use of Proceeds">Use of Proceeds</option>
                <option value="KPI Target">KPI Target</option>
                <option value="Verification">Verification</option>
                <option value="Exclusion">Exclusion</option>
              </Select>
              <Input
                label="Page number"
                type="number"
                value={greenEvidenceForm.pageNumber}
                onChange={(e) => setGreenEvidenceForm({ ...greenEvidenceForm, pageNumber: e.target.value })}
              />
              <TextArea
                label="Snippet"
                rows={3}
                value={greenEvidenceForm.snippet}
                onChange={(e) => setGreenEvidenceForm({ ...greenEvidenceForm, snippet: e.target.value })}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={addGreenEvidenceTag}>
                Add Evidence Tag
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              {greenEvidenceQuery.data?.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{tag.category}</p>
                    <p className="text-xs text-slate-500">Page {tag.pageNumber ?? "-"}</p>
                    <p className="text-xs text-slate-500">{tag.snippet}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const doc = documentsQuery.data?.find((item) => item.id === tag.documentId);
                      if (doc) {
                        openDocument(doc.id, doc.filename);
                      }
                    }}
                  >
                    View
                  </Button>
                </div>
              ))}
              {greenEvidenceQuery.data?.length === 0 && (
                <p className="text-sm text-slate-500">No evidence tags added yet.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "Workbench" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Document-to-Data Workbench</h3>
              <p className="text-sm text-slate-500">Run offline extraction and curate suggestions.</p>
            </div>
            {workbenchDocId && (
              <Button
                variant="outline"
                onClick={() => {
                  const doc = documentsQuery.data?.find((item) => item.id === workbenchDocId);
                  if (doc) {
                    openDocument(doc.id, doc.filename);
                  }
                }}
              >
                Preview Document
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Document"
                  value={workbenchDocId}
                  onChange={(e) => setWorkbenchDocId(e.target.value)}
                >
                  <option value="">Select document</option>
                  {documentsQuery.data?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Extraction adapter"
                  value={workbenchAdapter}
                  onChange={(e) => setWorkbenchAdapter(e.target.value)}
                >
                  <option value="local-heuristic">Local Heuristic</option>
                  <option value="mock">Prototype Mock</option>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={runExtraction}
                  disabled={!canEditWorkbench || !workbenchDocId}
                >
                  Run Extraction
                </Button>
                {!canEditWorkbench && (
                  <span className="text-xs text-slate-500">View-only access</span>
                )}
              </div>
              <Select
                label="Extraction Runs"
                value={workbenchRunId}
                onChange={(e) => setWorkbenchRunId(e.target.value)}
              >
                <option value="">Select run</option>
                {extractionRunsQuery.data?.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.adapterKey} • {run.startedAt}
                  </option>
                ))}
              </Select>
              {!extractionRunsQuery.data?.length && (
                <p className="text-xs text-slate-500">No extraction runs yet.</p>
              )}
            </div>
            <div className="space-y-6">
              {(["Clause", "Obligation", "Covenant", "Definition"] as const).map((type) => {
                const items = suggestionGroups[type] ?? [];
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{type} Suggestions</h4>
                      <span className="text-xs text-slate-500">{items.length} items</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">No suggestions yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {items.map(({ suggestion, payload }) => {
                          const title =
                            payload.title || payload.name || payload.term || "Untitled suggestion";
                          const snippet =
                            payload.textSnippet ||
                            payload.sourceSnippet ||
                            payload.definitionText ||
                            payload.description ||
                            "No snippet captured.";
                          return (
                            <div
                              key={suggestion.id}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-ink">{title}</p>
                                  <p className="text-xs text-slate-500">
                                    Confidence {Math.round(suggestion.confidence * 100)}%
                                  </p>
                                  {payload.pageNumber && (
                                    <p className="text-xs text-slate-400">Page {payload.pageNumber}</p>
                                  )}
                                </div>
                                <Badge
                                  tone={
                                    suggestion.status === "Confirmed"
                                      ? "success"
                                      : suggestion.status === "Rejected"
                                        ? "danger"
                                        : "info"
                                  }
                                >
                                  {suggestion.status}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs text-slate-600">{snippet}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => confirmSuggestion(suggestion.id)}
                                  disabled={!canEditWorkbench}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setEditSuggestion({
                                      suggestionId: suggestion.id,
                                      payload: JSON.stringify(payload, null, 2)
                                    })
                                  }
                                  disabled={!canEditWorkbench}
                                >
                                  Edit & Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => rejectSuggestion(suggestion.id)}
                                  disabled={!canEditWorkbench}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "Term Sheet" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Versions</h3>
            <div className="mt-4 space-y-2">
              {termSheetsQuery.data?.map((sheet) => (
                <button
                  key={sheet.id}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    selectedTermSheetId === sheet.id
                      ? "border-ink bg-ink text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  onClick={() => setSelectedTermSheetId(sheet.id)}
                >
                  Version {sheet.versionNo}
                  <div className="text-xs opacity-70">{sheet.createdAt}</div>
                </button>
              ))}
              {!termSheetsQuery.data?.length && (
                <p className="text-xs text-slate-500">No term sheet versions yet.</p>
              )}
            </div>
          </Card>
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold">Selected Term Sheet</h3>
            {termSheetDetails ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Facility Type</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.facilityType ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Commitment</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.commitmentAmount ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Margin (bps)</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.marginBps ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Maturity</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.maturityDate ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Leverage Threshold</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.leverageThreshold ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Interest Coverage</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.interestCoverageThreshold ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Reporting Days</p>
                  <p className="text-sm font-semibold text-ink">{String(termSheetDetails.reportingDaysAfterPeriodEnd ?? "")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">EBITDA Adjustments</p>
                  <p className="text-sm font-semibold text-ink">
                    {Array.isArray(termSheetDetails.ebitdaAdjustments)
                      ? termSheetDetails.ebitdaAdjustments.join(", ")
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select a term sheet version to view details.</p>
            )}
            {selectedTermSheet && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-slate-400">Raw JSON</p>
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {selectedTermSheet.dataJson}
                </pre>
              </div>
            )}
          </Card>
          {canEditTermSheet && (
            <Card className="p-6 lg:col-span-3">
              <h3 className="text-lg font-semibold">Create New Term Sheet Version</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Input
                  label="Facility Type"
                  value={termSheetForm.facilityType}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, facilityType: e.target.value })}
                />
                <Input
                  label="Commitment Amount"
                  type="number"
                  value={termSheetForm.commitmentAmount}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, commitmentAmount: Number(e.target.value) })}
                />
                <Input
                  label="Margin (bps)"
                  type="number"
                  value={termSheetForm.marginBps}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, marginBps: Number(e.target.value) })}
                />
                <Input
                  label="Maturity Date"
                  placeholder="YYYY-MM-DD"
                  value={termSheetForm.maturityDate}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, maturityDate: e.target.value })}
                />
                <Input
                  label="Leverage Threshold"
                  type="number"
                  value={termSheetForm.leverageThreshold}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, leverageThreshold: Number(e.target.value) })}
                />
                <Input
                  label="Interest Coverage Threshold"
                  type="number"
                  value={termSheetForm.interestCoverageThreshold}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, interestCoverageThreshold: Number(e.target.value) })}
                />
                <Input
                  label="Reporting Days After Period End"
                  type="number"
                  value={termSheetForm.reportingDaysAfterPeriodEnd}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, reportingDaysAfterPeriodEnd: Number(e.target.value) })}
                />
                <Input
                  label="EBITDA Adjustments (comma separated)"
                  value={termSheetForm.ebitdaAdjustments}
                  onChange={(e) => setTermSheetForm({ ...termSheetForm, ebitdaAdjustments: e.target.value })}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={saveTermSheet}>
                  Save Version
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "Drafts" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Generate Draft Agreement</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select
                label="Term Sheet Version"
                value={draftTermSheetId}
                onChange={(e) => setDraftTermSheetId(e.target.value)}
              >
                <option value="">Select version</option>
                {termSheetsQuery.data?.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    Version {sheet.versionNo}
                  </option>
                ))}
              </Select>
            </div>
            {canEditTemplates ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Template Library</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {templatesQuery.data?.map((template) => (
                    <label key={template.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={draftTemplateKeys.includes(template.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDraftTemplateKeys([...draftTemplateKeys, template.key]);
                          } else {
                            setDraftTemplateKeys(draftTemplateKeys.filter((key) => key !== template.key));
                          }
                        }}
                      />
                      <span>{template.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Templates are managed by Admin or Lender Ops.</p>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={generateDraft} disabled={!canEditTemplates}>
                Generate Draft
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Draft Versions</h3>
            <div className="mt-4">
              <Table>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documentVersionsQuery.data?.map((version) => (
                    <tr key={version.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">v{version.versionNo}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{version.filename}</td>
                      <td className="px-4 py-3 text-slate-500">{version.source}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" onClick={() => openDocumentVersion(version.id, version.filename)}>
                          Preview
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!documentVersionsQuery.data?.length && (
                <p className="mt-3 text-xs text-slate-500">No draft versions yet.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Semantic Diff</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Select label="Version A" value={diffAId} onChange={(e) => setDiffAId(e.target.value)}>
                <option value="">Select</option>
                {documentVersionsQuery.data?.map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.versionNo} • {version.filename}
                  </option>
                ))}
              </Select>
              <Select label="Version B" value={diffBId} onChange={(e) => setDiffBId(e.target.value)}>
                <option value="">Select</option>
                {documentVersionsQuery.data?.map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.versionNo} • {version.filename}
                  </option>
                ))}
              </Select>
              <div className="flex items-end">
                <Button variant="secondary" onClick={runSemanticDiff}>
                  Compare
                </Button>
              </div>
            </div>
            {semanticDiff && (
              <div className="mt-4 space-y-2">
                {semanticDiff.length === 0 && (
                  <p className="text-xs text-slate-500">No semantic changes detected.</p>
                )}
                {semanticDiff.map((item, index) => (
                  <div key={`${item.message}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm text-slate-600">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "Consistency" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Consistency Checker</h3>
              <p className="text-sm text-slate-500">Run rule checks against current covenant data.</p>
            </div>
            <Button variant="secondary" onClick={runConsistencyCheck} disabled={!canEditTermSheet}>
              Run Check
            </Button>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {consistencyQuery.data?.map((finding: ConsistencyFinding) => (
                  <tr key={finding.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          finding.severity === "High"
                            ? "danger"
                            : finding.severity === "Med"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {finding.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{finding.message}</td>
                    <td className="px-4 py-3 text-slate-500">{finding.status}</td>
                    <td className="px-4 py-3">
                      {finding.status === "Open" && canEditTermSheet ? (
                        <Button variant="outline" onClick={() => resolveFinding(finding.id)}>
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!consistencyQuery.data?.length && (
              <p className="mt-4 text-xs text-slate-500">No consistency findings yet.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "Submissions" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Submissions</h3>
              <p className="text-sm text-slate-500">Borrower evidence and financial inputs.</p>
            </div>
            <Link to={loanId ? `/submissions?loanId=${loanId}` : "/submissions"}>
              <Button variant="secondary">New Submission</Button>
            </Link>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissionsQuery.data?.map((submission) => (
                  <tr key={submission.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{submission.type}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {submission.periodEnd ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{submission.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {activeTab === "Review Queue" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Review Queue</h3>
              <p className="text-sm text-slate-500">Submissions awaiting lender decision.</p>
            </div>
            <Link to={loanId ? `/review?loanId=${loanId}` : "/review"}>
              <Button variant="secondary">Open Review Queue</Button>
            </Link>
          </div>
          {!canReview && (
            <p className="mt-4 text-sm text-slate-500">
              Review actions are available to Lender Ops and Admin roles.
            </p>
          )}
          {canReview && (
            <div className="mt-4">
              <Table>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueueItems.map((submission) => (
                    <tr key={submission.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-ink">{submission.type}</td>
                      <td className="px-4 py-3 text-slate-500">{submission.periodEnd ?? "N/A"}</td>
                      <td className="px-4 py-3 text-slate-500">{submission.status}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {reviewQueueItems.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No submissions waiting for review.</p>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === "Waivers" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Waivers</h3>
              <p className="text-sm text-slate-500">Temporary exceptions to obligations or covenants.</p>
            </div>
            <Link to={loanId ? `/waivers?loanId=${loanId}` : "/waivers"}>
              <Button variant="secondary">Request / Manage Waivers</Button>
            </Link>
          </div>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {waiversQuery.data?.map((waiver) => (
                  <tr key={waiver.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{waiver.relatedType}</td>
                    <td className="px-4 py-3 text-slate-500">{waiver.reason}</td>
                    <td className="px-4 py-3 text-slate-500">{waiver.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {waiversQuery.data?.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No waivers logged. Request one if a breach needs temporary relief.
              </p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "Exports" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Exports</h3>
              <p className="text-sm text-slate-500">Generate compliance packs for this loan.</p>
            </div>
            <Link to={loanId ? `/exports?loanId=${loanId}` : "/exports"}>
              <Button variant="outline">Open Export Center</Button>
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportPdf}>
              Export PDF Pack
            </Button>
          </div>
          {exportMessage && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-emerald-600">
              <span>{exportMessage}</span>
              {lastExportPath && (
                <Button variant="outline" onClick={openExportFolder}>
                  Open Folder
                </Button>
              )}
            </div>
          )}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-600">Export History</h4>
            <div className="mt-2 space-y-2">
              {exportHistoryQuery.data?.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{item.type}</p>
                    <p className="text-xs text-slate-500">{item.createdAt}</p>
                  </div>
                  <span className="text-xs text-slate-500">{item.path}</span>
                </div>
              ))}
              {exportHistoryQuery.data?.length === 0 && (
                <p className="text-sm text-slate-500">No exports generated yet.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "Audit Trail" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Audit Trail</h3>
          <div className="mt-4">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.data?.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{event.action}</td>
                    <td className="px-4 py-3 text-slate-500">{event.entityType}</td>
                    <td className="px-4 py-3 text-slate-500">{event.actorUserId}</td>
                    <td className="px-4 py-3 text-slate-500">{event.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {editSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Suggestion Payload</h3>
              <Button variant="outline" onClick={() => setEditSuggestion(null)}>
                Close
              </Button>
            </div>
            <div className="mt-4">
              <TextArea
                label="Suggestion JSON"
                value={editSuggestion.payload}
                onChange={(e) =>
                  setEditSuggestion({ ...editSuggestion, payload: e.target.value })
                }
                rows={10}
              />
              {editError && <p className="mt-2 text-sm text-rose-600">{editError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditSuggestion(null)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={saveEditedSuggestion}>
                Confirm Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{docPreview.name}</h3>
              <Button variant="outline" onClick={() => setDocPreview(null)}>
                Close
              </Button>
            </div>
            <div className="mt-4 h-[70vh] overflow-hidden rounded-lg border border-slate-200">
              <iframe className="h-full w-full" src={docPreview.dataUrl} title={docPreview.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
