"use client";

import { useEffect, useState } from "react";
import { DashboardSummary, formatMoney } from "@/lib/analytics";
import IdleCounter from "@/components/IdleCounter";
import KpiCard from "@/components/KpiCard";
import TrendChart from "@/components/TrendChart";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import BudgetGrid from "@/components/BudgetGrid";
import AlertsPanel from "@/components/AlertsPanel";
import { ArrowDownRight, ArrowUpRight, Coins, RefreshCw, Wallet } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // refresca cada 5 min
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted">
        <div className="flex items-center gap-2"><RefreshCw className="animate-spin" size={16} /> Cargando tus finanzas…</div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center text-danger">
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold mb-2">No pude cargar la data</h2>
          <p className="text-sm">{error}</p>
          <p className="text-xs text-muted mt-3">Si todavía no tienes el token Premium de Wallet, deja <code>USE_MOCK=true</code> en <code>.env.local</code>.</p>
        </div>
      </main>
    );
  }
  if (!data) return null;

  const cur = data.baseCurrency;

  return (
    <main className="min-h-screen px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/20 grid place-items-center">
            <Wallet size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Mis Finanzas</h1>
            <p className="text-xs text-muted">{data.thisMonth.monthLabel} · datos vía Wallet by BudgetBakers</p>
          </div>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 flex items-center gap-2">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </header>

      {/* IDLE COUNTER (estrella) */}
      <section className="mb-6">
        <IdleCounter
          baseCurrency={cur}
          incomeLastMonth={data.idle.incomeLastMonth}
          expenseLastMonth={data.idle.expenseLastMonth}
          monthStartIso={data.idle.monthStartIso}
          monthEndIso={data.idle.monthEndIso}
          incomeRealMTD={data.idle.incomeRealMTD}
          expenseRealMTD={data.idle.expenseRealMTD}
        />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Saldo total"
          value={formatMoney(data.totalBalance, cur)}
          hint={`${data.thisMonth.count} mov. este mes`}
          icon={<Wallet size={14} className="text-muted" />}
        />
        <KpiCard
          label="Ingresos del mes"
          value={formatMoney(data.thisMonth.income, cur)}
          tone="positive"
          icon={<ArrowUpRight size={14} className="text-accent" />}
          hint={`mes pasado: ${formatMoney(data.lastMonth.income, cur, true)}`}
        />
        <KpiCard
          label="Gastos del mes"
          value={formatMoney(data.thisMonth.expense, cur)}
          tone="negative"
          icon={<ArrowDownRight size={14} className="text-danger" />}
          hint={`mes pasado: ${formatMoney(data.lastMonth.expense, cur, true)}`}
        />
        <KpiCard
          label="Balance neto"
          value={formatMoney(data.thisMonth.net, cur)}
          tone={data.thisMonth.net >= 0 ? "positive" : "negative"}
          delta={data.monthOverMonthPct}
          icon={<Coins size={14} className="text-muted" />}
        />
      </section>

      {/* Trend + Alertas */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <TrendChart data={data.trend} baseCurrency={cur} />
        </div>
        <AlertsPanel alerts={data.alerts} />
      </section>

      {/* Categorías + Presupuestos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <CategoryBreakdown data={data.topCategories} baseCurrency={cur} />
        <BudgetGrid data={data.budgets} baseCurrency={cur} />
      </section>

      <footer className="text-center text-xs text-muted pb-6">
        Última actualización: {new Date(data.generatedAt).toLocaleString("es-CO")} ·
        {" "}<a href="https://rest.budgetbakers.com/wallet/openapi/ui" target="_blank" className="underline hover:text-white">API docs</a>
      </footer>
    </main>
  );
}
