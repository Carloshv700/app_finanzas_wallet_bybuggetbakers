"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/analytics";
import { TrendingUp, TrendingDown, Coins, Zap } from "lucide-react";

type Mode = "income" | "expense" | "net";
type Rate = "second" | "minute" | "hour";

interface Props {
  baseCurrency: string;
  incomeLastMonth: number;       // ingreso total del mes pasado
  expenseLastMonth: number;      // gasto total del mes pasado
  monthStartIso: string;
  monthEndIso: string;
  incomeRealMTD: number;         // ingreso real acumulado este mes (lo conocido)
  expenseRealMTD: number;
}

/**
 * Idea: simulamos lo que llevarías acumulado a esta hora exacta del mes
 * extrapolando linealmente los totales del mes pasado.
 * El número crece en tiempo real (60fps tipo idle game) pero la cifra base es real.
 *
 * "Reconciliación con la realidad":
 *  - Si tu ingreso real MTD ya supera al simulado linealmente -> usamos el real (no le quitamos plata).
 *  - Visualmente mostramos un "anchor" cada vez que llega un ingreso/gasto real.
 */
export default function IdleCounter({
  baseCurrency,
  incomeLastMonth,
  expenseLastMonth,
  monthStartIso,
  monthEndIso,
  incomeRealMTD,
  expenseRealMTD,
}: Props) {
  const [mode, setMode] = useState<Mode>("income");
  const [rate, setRate] = useState<Rate>("second");
  const [tick, setTick] = useState(0);
  const monthStart = useMemo(() => new Date(monthStartIso).getTime(), [monthStartIso]);
  const monthEnd = useMemo(() => new Date(monthEndIso).getTime(), [monthEndIso]);
  const totalMs = monthEnd - monthStart;

  // Animación: 30 fps es suficiente para que se vea fluido sin quemar CPU.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 33);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const elapsedMs = Math.max(0, Math.min(totalMs, now - monthStart));
  const ratio = totalMs > 0 ? elapsedMs / totalMs : 0;

  const incomeSim = incomeLastMonth * ratio;
  const expenseSim = expenseLastMonth * ratio;

  // Reconciliación: si lo real va más alto, ese manda.
  const incomeShown = Math.max(incomeSim, incomeRealMTD);
  const expenseShown = Math.max(expenseSim, expenseRealMTD);
  const netShown = incomeShown - expenseShown;

  const value = mode === "income" ? incomeShown : mode === "expense" ? expenseShown : netShown;

  // Ratio mostrado en la chip
  const perSecond =
    mode === "income" ? incomeLastMonth / (totalMs / 1000) :
    mode === "expense" ? expenseLastMonth / (totalMs / 1000) :
    (incomeLastMonth - expenseLastMonth) / (totalMs / 1000);
  const ratePerUnit =
    rate === "second" ? perSecond :
    rate === "minute" ? perSecond * 60 :
    perSecond * 3600;

  // Flotantes "+$X" tipo idle game cada vez que el contador "incrementa visiblemente"
  const lastFloatRef = useRef(0);
  const [floats, setFloats] = useState<{ id: number; v: number; x: number }[]>([]);
  useEffect(() => {
    const interval = mode === "expense" ? 800 : 600;
    if (Date.now() - lastFloatRef.current < interval) return;
    lastFloatRef.current = Date.now();
    const inc = ratePerUnit / (rate === "second" ? 1 : rate === "minute" ? 60 : 3600);
    const visualBump =
      rate === "second" ? inc * 0.6 :
      rate === "minute" ? inc / 60 * 0.6 :
                          inc / 3600 * 0.6;
    if (visualBump > 0) {
      const id = Date.now();
      setFloats(prev => [
        ...prev.slice(-6),
        { id, v: visualBump, x: 30 + Math.random() * 40 },
      ]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1200);
    }
  }, [tick, mode, rate, ratePerUnit]);

  const accent = mode === "expense" ? "text-danger" : mode === "net" && netShown < 0 ? "text-danger" : "text-accent";
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
          <span>Tiempo real · estimado lineal del mes pasado</span>
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

        {/* flotantes idle */}
        <div className="absolute inset-0 pointer-events-none">
          {floats.map(f => (
            <div key={f.id}
              className={`absolute top-2 text-sm font-semibold ${mode === "expense" ? "text-danger" : "text-accent"} animate-floatUp`}
              style={{ left: `${f.x}%` }}>
              {mode === "expense" ? "-" : "+"}{formatMoney(Math.abs(f.v), baseCurrency)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          Ritmo: <span className="text-white font-mono">{formatMoney(ratePerUnit, baseCurrency)}</span> / {rate === "second" ? "seg" : rate === "minute" ? "min" : "hora"}
        </span>
        <span className="text-muted">
          Mes pasado: <span className="text-white font-mono">{formatMoney(mode === "income" ? incomeLastMonth : mode === "expense" ? expenseLastMonth : (incomeLastMonth - expenseLastMonth), baseCurrency)}</span>
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
          <span>real MTD: {formatMoney(mode === "income" ? incomeRealMTD : mode === "expense" ? expenseRealMTD : (incomeRealMTD - expenseRealMTD), baseCurrency)}</span>
        </div>
      </div>
    </div>
  );
}
