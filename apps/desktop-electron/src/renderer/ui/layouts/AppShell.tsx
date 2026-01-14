import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Button from "../components/Button";
import Select from "../components/Select";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentLoan } from "../contexts/LoanContext";
import { useToast } from "../contexts/ToastContext";
import { ipcInvoke, unwrapResult } from "../api/client";

type NavItem = {
  label: string;
  to: string | ((loanId: string | null) => string);
  requiresLoan?: boolean;
  tooltip?: string;
};

const GETTING_STARTED_KEY = "covenantpulse.gettingStartedSeen";
const WALKTHROUGH_KEY = "covenantpulse.walkthroughStep";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, sessionId, logout } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { currentLoanId, setCurrentLoanId } = useCurrentLoan();
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number | null>(null);

  const loansQuery = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const result = await ipcInvoke("loans:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(WALKTHROUGH_KEY);
    if (stored) {
      const parsed = Number(stored);
      setWalkthroughStep(Number.isFinite(parsed) ? parsed : null);
    }
  }, []);

  useEffect(() => {
    if (walkthroughStep === null) {
      window.localStorage.removeItem(WALKTHROUGH_KEY);
    } else {
      window.localStorage.setItem(WALKTHROUGH_KEY, String(walkthroughStep));
    }
  }, [walkthroughStep]);

  useEffect(() => {
    if (!window.localStorage.getItem(GETTING_STARTED_KEY)) {
      setShowGettingStarted(true);
    }
  }, []);

  useEffect(() => {
    if (!loansQuery.data || loansQuery.data.length === 0) {
      return;
    }
    if (!currentLoanId || !loansQuery.data.some((loan) => loan.id === currentLoanId)) {
      setCurrentLoanId(loansQuery.data[0].id);
    }
  }, [currentLoanId, loansQuery.data, setCurrentLoanId]);

  const loanTabLink = (tab: string) => {
    if (!currentLoanId) {
      return "/loans";
    }
    return `/loans/${currentLoanId}?tab=${encodeURIComponent(tab)}`;
  };

  const loanScopedRoute = (path: string) => {
    if (!currentLoanId) {
      return path;
    }
    return `${path}?loanId=${currentLoanId}`;
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", to: "/" },
      { label: "Loans", to: "/loans" },
      { label: "Submissions", to: "/submissions" },
      {
        label: "Review Queue",
        to: "/review",
        tooltip: "Items that require lender decision"
      },
      {
        label: "Waivers",
        to: "/waivers",
        tooltip: "Temporary permission for breach/late obligations"
      },
      {
        label: "Green Lending Check",
        to: () => loanTabLink("Green Lending Check"),
        requiresLoan: true
      },
      { label: "Exports", to: "/exports" },
      { label: "Settings", to: "/settings" },
      { label: "Help Center", to: "/help" },
      { label: "Prototype Mode", to: "/prototype" }
    ],
    [currentLoanId]
  );

  const guidedSteps = useMemo(
    () => [
      { label: "Create/Select Loan", to: "/loans" },
      { label: "Upload Loan Document", to: loanTabLink("Documents"), requiresLoan: true },
      { label: "Extract/Define Obligations", to: loanTabLink("Workbench"), requiresLoan: true },
      { label: "Define Covenants", to: loanTabLink("Covenants"), requiresLoan: true },
      { label: "Generate Schedule", to: loanTabLink("Timeline"), requiresLoan: true },
      { label: "Borrower Submission", to: loanScopedRoute("/submissions"), requiresLoan: true },
      { label: "Lender Review", to: loanScopedRoute("/review"), requiresLoan: true },
      { label: "Waiver (if needed)", to: loanScopedRoute("/waivers"), requiresLoan: true },
      { label: "Green Lending Check", to: loanTabLink("Green Lending Check"), requiresLoan: true },
      { label: "Export Compliance Pack", to: loanScopedRoute("/exports"), requiresLoan: true }
    ],
    [currentLoanId]
  );

  const loadDemoData = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const result = await ipcInvoke("demo:seed", { sessionId });
      const data = unwrapResult(result);
      if (data.status === "seeded") {
        pushToast("Demo data loaded.", "success");
      } else {
        pushToast("Demo data already loaded.", "info");
      }
      loansQuery.refetch();
      setShowGettingStarted(false);
      window.localStorage.setItem(GETTING_STARTED_KEY, "true");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Unable to load demo data.", "error");
    }
  };

  const startWalkthrough = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const result = await ipcInvoke("demo:seed", { sessionId });
      const data = unwrapResult(result);
      if (data.status === "seeded") {
        pushToast("Demo data loaded.", "success");
      } else {
      pushToast("Demo data already loaded.", "info");
      }
      loansQuery.refetch();
      setWalkthroughStep(0);
      setShowGettingStarted(false);
      window.localStorage.setItem(GETTING_STARTED_KEY, "true");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Unable to load demo data.", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#eef2f7] to-[#e8edf5] text-ink">
      {showGettingStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Getting Started</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Your first 5 minutes</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Pick a demo flow or create your first loan workspace. We will guide you to the right screens.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGettingStarted(false);
                  window.localStorage.setItem(GETTING_STARTED_KEY, "true");
                }}
              >
                Close
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-ink">Demo mode</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Load seeded data and follow a guided walkthrough.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={startWalkthrough}>
                    Demo Walkthrough
                  </Button>
                  <Button variant="outline" onClick={loadDemoData}>
                    Load Demo Data
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/prototype")}>
                    Prototype Mode
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-ink">Create your own</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Start a clean workspace and follow the guided workflow.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowGettingStarted(false);
                      window.localStorage.setItem(GETTING_STARTED_KEY, "true");
                      navigate("/loans");
                    }}
                  >
                    Create a Loan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowGettingStarted(false);
                      window.localStorage.setItem(GETTING_STARTED_KEY, "true");
                      navigate("/help");
                    }}
                  >
                    Open Help Center
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-white/40 bg-white/80 backdrop-blur-xl">
          <div className="p-6">
            <div className="rounded-2xl bg-ink px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">CovenantPulse</p>
              <p className="mt-2 text-lg font-semibold">Compliance Command</p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Select
              label="Current Loan"
              value={currentLoanId ?? ""}
              onChange={(event) => {
                const next = event.target.value || null;
                setCurrentLoanId(next);
                if (next) {
                  navigate(`/loans/${next}`);
                }
              }}
            >
              <option value="">Select loan</option>
              {loansQuery.data?.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.name}
                </option>
              ))}
            </Select>
            {!loansQuery.data?.length && (
              <p className="mt-2 text-xs text-slate-500">No loans yet. Create one to begin.</p>
            )}
          </div>
          <nav className="px-4 pb-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>
            <div className="mt-4 space-y-1">
              {navItems.map((item) => {
                const to = typeof item.to === "function" ? item.to(currentLoanId) : item.to;
                const disabled = Boolean(item.requiresLoan && !currentLoanId);
                return (
                  <NavLink
                    key={item.label}
                    to={to}
                    title={item.tooltip}
                    onClick={(event) => {
                      if (disabled) {
                        event.preventDefault();
                        pushToast("Select a loan first.", "info");
                      }
                    }}
                    className={({ isActive }) =>
                      [
                        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
                        disabled ? "pointer-events-none opacity-50" : "",
                        isActive
                          ? "bg-ink text-white"
                          : "text-slate-600 hover:bg-white hover:text-ink"
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <nav className="px-4 pb-6">
            <div className="flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <span>Guided Workflow</span>
              <Button variant="outline" onClick={startWalkthrough}>
                Demo Walkthrough
              </Button>
            </div>
            {walkthroughStep !== null && guidedSteps[walkthroughStep] && (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-ink">
                Step {walkthroughStep + 1} of {guidedSteps.length}:{" "}
                <span className="font-semibold">{guidedSteps[walkthroughStep].label}</span>
              </div>
            )}
            <div className="mt-4 space-y-1">
              {guidedSteps.map((step, index) => {
                const disabled = Boolean(step.requiresLoan && !currentLoanId);
                const highlight = walkthroughStep === index;
                return (
                  <NavLink
                    key={step.label}
                    to={step.to}
                    onClick={(event) => {
                      if (disabled) {
                        event.preventDefault();
                        pushToast("Select a loan first.", "info");
                        return;
                      }
                      if (walkthroughStep === index) {
                        setWalkthroughStep(
                          index + 1 < guidedSteps.length ? index + 1 : null
                        );
                      }
                    }}
                    className={() =>
                      [
                        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
                        disabled ? "pointer-events-none opacity-50" : "",
                        highlight
                          ? "bg-white text-ink ring-2 ring-accent/40"
                          : "text-slate-600 hover:bg-white hover:text-ink"
                      ].join(" ")
                    }
                  >
                    {step.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-white/40 bg-white/60 px-8 py-4 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Role</p>
              <p className="text-sm font-semibold text-ink">{user?.role ?? "Guest"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </header>
          <div className="px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
