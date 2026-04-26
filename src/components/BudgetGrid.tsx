"use client";

import { BudgetStatus, formatMoney } from "@/lib/analytics";

export default function BudgetGrid({ data, baseCurrency }: { data: BudgetStatus[]; baseCurrency: string }) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-2">Presupuestos</h3>
        <p className="text-sm text-muted">No tienes presupuestos definidos en Wallet aún.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm uppercase tracking-wider text-muted mb-3">Presupuestos del mes</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {data.map(b => {
          const color =
            b.state === "over" ? "bg-danger" :
            b.state === "near" ? "bg-warn"   : "bg-accent";
          return (
            <div key={b.budgetId} className="border border-white/5 rounded-xl p-3 bg-white/[0.02]">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-white text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted">{b.categoryNames.join(", ") || "Todas las categorías"}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-white">{formatMoney(b.spent, baseCurrency)}</div>
                  <div className="text-[11px] text-muted">de {formatMoney(b.amount, baseCurrency)}</div>
                </div>
              </div>
              <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                {/* línea de "ritmo esperado" */}
                <div className="absolute top-0 h-full w-px bg-white/40"
                     style={{ left: `${Math.min(100, b.pace * 100)}%` }} />
                <div className={`h-full ${color}`} style={{ width: `${Math.min(100, b.pct * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted mt-1 font-mono">
                <span>{Math.round(b.pct * 100)}%</span>
                <span>ritmo esperado: {Math.round(b.pace * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
