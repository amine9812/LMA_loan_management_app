import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { SessionInfo, User } from "@shared";
import { ipcInvoke, unwrapResult } from "../api/client";

export type AuthState = {
  sessionId: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "covenantpulse.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    const parsed = JSON.parse(stored) as SessionInfo;
    setSessionId(parsed.sessionId);
    setUser(parsed.user);
    ipcInvoke("auth:me", { sessionId: parsed.sessionId })
      .then((result) => {
        const data = unwrapResult(result);
        if (!data) {
          setSessionId(null);
          setUser(null);
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        setSessionId(null);
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await ipcInvoke("auth:login", { email, password });
    const data = unwrapResult(result);
    setSessionId(data.sessionId);
    setUser(data.user);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: data.sessionId, user: data.user })
    );
  };

  const logout = async () => {
    if (sessionId) {
      await ipcInvoke("auth:logout", { sessionId });
    }
    setSessionId(null);
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ sessionId, user, loading, login, logout }),
    [sessionId, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthProvider missing");
  }
  return ctx;
}
