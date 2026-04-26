"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: number;          // -1..+1 ish
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-accent" :
    tone === "negative" ? "text-danger"  : "text-white";

  return (
    <div className="card">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted mb-2">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-2xl md:text-3xl font-bold kpi-num ${toneClass}`}>{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        {delta !== undefined && (
          <span className={`flex items-center gap-1 ${delta >= 0 ? "text-accent" : "text-danger"}`}>
            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
