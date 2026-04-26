"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/analytics";

interface Point { date: string; income: number; expense: number; cumulativeNet: number; }

export default function TrendChart({ data, baseCurrency }: { data: Point[]; baseCurrency: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider text-muted">Tendencia del mes</h3>
        <span className="text-xs text-muted">Ingresos vs Gastos por día · neto acumulado</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28cb7c" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#28cb7c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(8, 10)}
              stroke="#475569"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => formatMoney(v, baseCurrency, true)}
              stroke="#475569"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: "#0f1626", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
              labelFormatter={(d) => d}
              formatter={(v: number, n: string) => [formatMoney(v, baseCurrency), n === "income" ? "Ingreso" : n === "expense" ? "Gasto" : "Neto acum."]}
            />
            <Area type="monotone" dataKey="income"  stroke="#28cb7c" fill="url(#g-in)"  strokeWidth={2} />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#g-out)" strokeWidth={2} />
            <Area type="monotone" dataKey="cumulativeNet" stroke="#a78bfa" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
