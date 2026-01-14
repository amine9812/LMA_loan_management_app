import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CurrentLoanProvider } from "./contexts/LoanContext";
import { ToastProvider } from "./contexts/ToastContext";
import AppShell from "./layouts/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import ObligationBuilder from "./pages/ObligationBuilder";
import CovenantBuilder from "./pages/CovenantBuilder";
import SubmissionWizard from "./pages/SubmissionWizard";
import ReviewQueue from "./pages/ReviewQueue";
import WaiverCenter from "./pages/WaiverCenter";
import Settings from "./pages/Settings";
import ExportCenter from "./pages/ExportCenter";
import HelpCenter from "./pages/HelpCenter";
import PrototypeLanding from "./prototype/PrototypeLanding";
import PrototypeLoan from "./prototype/PrototypeLoan";
import PrototypeObligations from "./prototype/PrototypeObligations";
import PrototypeCovenants from "./prototype/PrototypeCovenants";
import PrototypeWorkbench from "./prototype/PrototypeWorkbench";
import PrototypeTermSheet from "./prototype/PrototypeTermSheet";
import PrototypeDrafts from "./prototype/PrototypeDrafts";
import PrototypeConsistency from "./prototype/PrototypeConsistency";
import PrototypeSubmission from "./prototype/PrototypeSubmission";
import PrototypeReview from "./prototype/PrototypeReview";
import PrototypeWaiver from "./prototype/PrototypeWaiver";
import PrototypeExport from "./prototype/PrototypeExport";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { sessionId, loading } = useAuth();
  if (loading) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }
  if (!sessionId) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <CurrentLoanProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/loans" element={<Loans />} />
                      <Route path="/loans/:loanId" element={<LoanDetail />} />
                      <Route path="/loans/:loanId/obligations/new" element={<ObligationBuilder />} />
                      <Route path="/loans/:loanId/covenants/new" element={<CovenantBuilder />} />
                      <Route path="/submissions" element={<SubmissionWizard />} />
                      <Route path="/review" element={<ReviewQueue />} />
                      <Route path="/waivers" element={<WaiverCenter />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/exports" element={<ExportCenter />} />
                      <Route path="/help" element={<HelpCenter />} />
                      <Route path="/prototype" element={<PrototypeLanding />} />
                      <Route path="/prototype/loan" element={<PrototypeLoan />} />
                      <Route path="/prototype/obligations" element={<PrototypeObligations />} />
                      <Route path="/prototype/covenants" element={<PrototypeCovenants />} />
                      <Route path="/prototype/workbench" element={<PrototypeWorkbench />} />
                      <Route path="/prototype/term-sheet" element={<PrototypeTermSheet />} />
                      <Route path="/prototype/drafts" element={<PrototypeDrafts />} />
                      <Route path="/prototype/consistency" element={<PrototypeConsistency />} />
                      <Route path="/prototype/submission" element={<PrototypeSubmission />} />
                      <Route path="/prototype/review" element={<PrototypeReview />} />
                      <Route path="/prototype/waiver" element={<PrototypeWaiver />} />
                      <Route path="/prototype/export" element={<PrototypeExport />} />
                    </Routes>
                  </AppShell>
                </RequireAuth>
              }
            />
          </Routes>
        </ToastProvider>
      </CurrentLoanProvider>
    </AuthProvider>
  );
}
