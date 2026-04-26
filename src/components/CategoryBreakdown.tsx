"use client";

import { CategoryAgg, formatMoney } from "@/lib/analytics";

export default function CategoryBreakdown({ data, baseCurrency }: { data: CategoryAgg[]; baseCurrency: string }) {
  const top = data.slice(0, 8);
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider text-muted">Top categorías (gastos)</h3>
        <span className="text-xs text-muted">{data.length} categorías este mes</span>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay gastos registrados este mes.</p>
      ) : (
        <ul className="space-y-3">
          {top.map(c => (
            <li key={c.categoryId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-white">{c.name}</span>
                  <span className="text-muted text-xs">· {c.count} mov.</span>
                </div>
                <div className="font-mono text-white">{formatMoney(c.amount, baseCurrency)}</div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${Math.min(100, c.pct * 100)}%`, background: c.color }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
