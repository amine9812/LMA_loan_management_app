import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type CurrentLoanState = {
  currentLoanId: string | null;
  setCurrentLoanId: (loanId: string | null) => void;
};

const STORAGE_KEY = "covenantpulse.currentLoan";
const CurrentLoanContext = createContext<CurrentLoanState | undefined>(undefined);

export function CurrentLoanProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useAuth();
  const [currentLoanId, setCurrentLoanIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCurrentLoanIdState(stored);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setCurrentLoanIdState(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessionId]);

  const setCurrentLoanId = (loanId: string | null) => {
    setCurrentLoanIdState(loanId);
    if (loanId) {
      window.localStorage.setItem(STORAGE_KEY, loanId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo(() => ({ currentLoanId, setCurrentLoanId }), [currentLoanId]);

  return <CurrentLoanContext.Provider value={value}>{children}</CurrentLoanContext.Provider>;
}

export function useCurrentLoan(): CurrentLoanState {
  const context = useContext(CurrentLoanContext);
  if (!context) {
    throw new Error("CurrentLoanProvider missing");
  }
  return context;
}
