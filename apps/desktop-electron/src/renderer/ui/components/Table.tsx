import React from "react";
import clsx from "clsx";

type TableProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Table({ className, children }: TableProps) {
  return (
    <div className={clsx("overflow-hidden rounded-xl border border-slate-200", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}
