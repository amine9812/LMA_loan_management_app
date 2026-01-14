import React from "react";
import clsx from "clsx";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export default function TextArea({ label, className, ...props }: TextAreaProps) {
  return (
    <label className="block text-sm text-slate-600">
      {label && <span className="mb-1 block text-xs uppercase tracking-wide">{label}</span>}
      <textarea
        className={clsx(
          "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          className
        )}
        {...props}
      />
    </label>
  );
}
