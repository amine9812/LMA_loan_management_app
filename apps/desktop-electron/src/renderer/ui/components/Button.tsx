import React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
};

export default function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-ink text-white hover:bg-slate-900",
    secondary: "bg-accent text-white hover:bg-emerald-700",
    ghost: "bg-transparent text-ink hover:bg-white/60",
    outline: "border border-ink/20 text-ink hover:bg-white"
  };

  return (
    <button
      className={clsx(
        "rounded-md px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
