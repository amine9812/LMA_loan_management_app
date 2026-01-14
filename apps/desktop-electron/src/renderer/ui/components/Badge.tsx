import React from "react";
import clsx from "clsx";

type BadgeProps = {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
};

export default function Badge({ tone = "neutral", children }: BadgeProps) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700"
  };

  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
