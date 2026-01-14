import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#eef2f7] to-[#e8edf5]">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-between gap-12 px-8">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">CovenantPulse</p>
          <h1 className="mt-6 text-4xl font-semibold text-ink font-display">
            Keep every covenant, every obligation, every time.
          </h1>
          <p className="mt-4 text-slate-600">
            CovenantPulse turns complex loan agreements into structured schedules, borrower submissions, and
            lender approvals with a full audit trail.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-soft">
              Offline-ready
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-soft">
              Desktop app
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-soft">
              Audit grade
            </span>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-ink font-display">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use a demo account to explore Lender Ops, Borrower, or Admin workflows.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <Button className="w-full" type="submit">
              Access CovenantPulse
            </Button>
          </form>
          <div className="mt-6 text-xs text-slate-500">
            Demo credentials: admin@example.com / Admin123!, lender@example.com / Lender123!, borrower@example.com / Borrower123!.
          </div>
        </div>
      </div>
    </div>
  );
}
