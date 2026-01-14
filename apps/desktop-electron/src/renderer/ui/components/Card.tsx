import React from "react";
import clsx from "clsx";

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Card({ className, children }: CardProps) {
  return (
    <div className={clsx("rounded-xl bg-white shadow-soft", className)}>{children}</div>
  );
}
