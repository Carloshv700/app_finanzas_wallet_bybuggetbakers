"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/analytics";
import { TrendingUp, TrendingDown, Coins, Zap } from "lucide-react";

type Mode = "income" | "expense" | "net";
type Rate = "second" | "minute" | "hour";

interface Props {
  baseCurrency: string;
  incomeMonthlyAvg: number;       // promedio mensual ingresos (últimos 12 meses)
  expenseMonthlyAvg: number;      // promedio mensual gastos (últimos 12 meses)
  monthsInAvg: number;            // cuántos meses se promediaron (max 12)
  monthStartIso: string;
  monthEndIso: string;
  incomeRealMTD: number;
  expenseRealMTD: number;
}

// El contador siempre tickea cada segundo. El rate solo cambia cómo se muestra el "Ritmo".
const TICK_MS = 1_000;
const RATE_MULTIPLIER: Record<Rate, number> = { second: 1, minute: 60, hour: 3_600 };
const RATE_LABEL: Record<Rate, string> = { second: "seg", minute: "min", hour: "hora" };

export default function IdleCounter({
  baseCurrency,
  incomeMonthlyAvg,
  expenseMonthlyAvg,
  monthsInAvg,
  monthStartIso,
  monthEndIso,
  incomeRealMTD,
  expenseRealMTD,
}: Props) {
  const [mode, setMode] = useState<Mode>("income");
  const [rate, setRate] = useState<Rate>("second");
  // Acumulador puramente visual. Se resetea al recargar, refetch del server o cambiar modo/rate.
  const [visualBump, setVisualBump] = useState(0);
  const [floats, setFloats] = useState<{ id: number; v: number; x: number }[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const monthStart = useMemo(() => new Date(monthStartIso).getTime(), [monthStartIso]);
  const monthEnd = useMemo(() => new Date(monthEndIso).getTime(), [monthEndIso]);
  const totalMs = monthEnd - monthStart;

  // Ancla = valor real desde el server (single source of truth).
  const anchor =
    mode === "income"  ? incomeRealMTD :
    mode === "expense" ? expenseRealMTD :
    incomeRealMTD - expenseRealMTD;

  const baselineMonthly =
    mode === "income"  ? incomeMonthlyAvg :
    mode === "expense" ? expenseMonthlyAvg :
    incomeMonthlyAvg - expenseMonthlyAvg;

  // Cuánto "gana" por segundo (siempre por segundo, sin importar el rate elegido).
  const incrementPerSecond = totalMs > 0 ? (baselineMonthly * TICK_MS) / totalMs : 0;
  // Lo que se muestra en la etiqueta "Ritmo: X / {unidad}" — solo display.
  const displayRate = incrementPerSecond * RATE_MULTIPLIER[rate];

  // Reset del bump visual cuando: cambia el ancla (refetch/reload) o modo.
  // No reseteamos al cambiar rate porque el ticking visual no se ve afectado.
  useEffect(() => {
    setVisualBump(0);
    setFloats([]);
  }, [incomeRealMTD, expenseRealMTD, mode]);

  // Tick: cada segundo sumamos el incremento por segundo y emitimos un floater.
  useEffect(() => {
    if (!Number.isFinite(incrementPerSecond) || incrementPerSecond === 0) return;
    const id = setInterval(() => {
      setVisualBump(b => b + incrementPerSecond);
      const fid = Date.now() + Math.random();
      setFloats(prev => [
        ...prev.slice(-5),
        { id: fid, v: incrementPerSecond, x: 30 + Math.random() * 40 },
      ]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 1200);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [incrementPerSecond]);

  // Para la barra de progreso del mes (1 update/seg, no afecta el contador).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - monthStart));
  const ratio = totalMs > 0 ? elapsedMs / totalMs : 0;

  const value = anchor + visualBump;
  const isOutflow = mode === "expense" || (mode === "net" && incrementPerSecond < 0);
  const accent = isOutflow || (mode === "net" && value < 0) ? "text-danger" : "text-accent";
  const ringClass = mode === "expense"
    ? "ring-2 ring-danger/30"
    : "ring-2 ring-accent/30 animate-pulseGlow";

  return (
    <div className={`card relative overflow-hidden ${ringClass}`}>
      {/* halo */}
      <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
           style={{ background: mode === "expense"
             ? "radial-gradient(600px 200px at 50% 0%, rgba(239,68,68,0.2), transparent 70%)"
             : "radial-gradient(600px 200px at 50% 0%, rgba(40,203,124,0.2), transparent 70%)" }} />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
          <Zap size={14} />
          <span>Tiempo real · proyección sobre promedio últimos {monthsInAvg} {monthsInAvg === 1 ? "mes" : "meses"}</span>
        </div>
        <div className="flex gap-1 text-xs">
          {(["second","minute","hour"] as Rate[]).map(r => (
            <button key={r}
              onClick={() => setRate(r)}
              className={`px-2 py-1 rounded-md transition ${rate === r ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}>
              /{r === "second" ? "seg" : r === "minute" ? "min" : "hora"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {([
          { id: "income",  label: "Ingreso",  icon: TrendingUp },
          { id: "expense", label: "Gasto",    icon: TrendingDown },
          { id: "net",     label: "Balance",  icon: Coins },
        ] as { id: Mode; label: string; icon: typeof Coins }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition border ${
              mode === t.id
                ? "bg-white/10 border-white/15 text-white"
                : "border-white/5 text-muted hover:text-white"
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className={`kpi-num text-5xl md:text-6xl font-bold ${accent} drop-shadow-sm`}>
          {formatMoney(value, baseCurrency)}
        </div>

        {/* flotantes idle: aparecen en cada tick del rate */}
        <div className="absolute inset-0 pointer-events-none">
          {floats.map(f => (
            <div key={f.id}
              className={`absolute top-2 text-sm font-semibold ${isOutflow ? "text-danger" : "text-accent"} animate-floatUp`}
              style={{ left: `${f.x}%` }}>
              {isOutflow ? "-" : "+"}{formatMoney(Math.abs(f.v), baseCurrency)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          Ritmo: <span className="text-white font-mono">{formatMoney(displayRate, baseCurrency)}</span> / {RATE_LABEL[rate]}
        </span>
        <span className="text-muted">
          Promedio mensual: <span className="text-white font-mono">{formatMoney(baselineMonthly, baseCurrency)}</span>
        </span>
      </div>

      {/* Barra de progreso del mes */}
      <div className="mt-4">
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full ${mode === "expense" ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${Math.min(100, ratio * 100)}%`, transition: "width 200ms linear" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted font-mono">
          <span>{(ratio * 100).toFixed(2)}% del mes</span>
          <span>real MTD: {formatMoney(anchor, baseCurrency)}</span>
        </div>
      </div>
    </div>
  );
}
