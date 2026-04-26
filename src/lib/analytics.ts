import { toNum, WalletAccount, WalletBudget, WalletCategory, WalletRecord } from "./types";

export interface MonthSummary {
  monthKey: string;        // "2026-04"
  monthLabel: string;      // "Abril 2026"
  income: number;
  expense: number;
  net: number;
  count: number;
  daysInMonth: number;
}

export interface CategoryAgg {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  count: number;
  pct: number;             // % sobre el total de gastos del mes
}

export interface BudgetStatus {
  budgetId: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  pct: number;             // 0..>1
  pace: number;            // gasto esperado a esta altura del mes (ratio 0..1)
  state: "ok" | "near" | "over";
  categoryNames: string[];
}

export interface Alert {
  id: string;
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  icon?: string;
}

export interface DashboardSummary {
  baseCurrency: string;
  generatedAt: string;
  totalBalance: number;
  thisMonth: MonthSummary;
  lastMonth: MonthSummary;
  monthOverMonthPct: number;       // cambio neto vs mes anterior (%)
  trend: { date: string; income: number; expense: number; cumulativeNet: number }[];
  topCategories: CategoryAgg[];
  budgets: BudgetStatus[];
  alerts: Alert[];
  // Para el contador idle:
  idle: {
    incomeLastMonth: number;       // total ingresos mes pasado (base)
    expenseLastMonth: number;      // total gastos mes pasado (base)
    incomePerSecond: number;       // = incomeLastMonth / segundosDelMesActual
    expensePerSecond: number;
    netPerSecond: number;
    monthStartIso: string;         // inicio del mes actual (UTC)
    monthEndIso: string;           // fin del mes actual (UTC)
    nowIso: string;
    incomeRealMTD: number;         // ingreso real acumulado en lo que va del mes
    expenseRealMTD: number;
  };
}

// ---------------- Helpers ----------------
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const MES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmtMonth = (d: Date) => `${MES_ES[d.getMonth()]} ${d.getFullYear()}`;
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
const daysIn = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

function summarizeMonth(records: WalletRecord[], anchor: Date): MonthSummary {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const inMonth = records.filter(r => {
    const d = new Date(r.recordDate);
    return d >= start && d <= end;
  });
  let income = 0, expense = 0;
  for (const r of inMonth) {
    const v = toNum(r.baseAmount ?? r.amount);
    if (r.recordType === "income") income += Math.abs(v);
    else expense += Math.abs(v);
  }
  return {
    monthKey: monthKey(anchor),
    monthLabel: fmtMonth(anchor),
    income,
    expense,
    net: income - expense,
    count: inMonth.length,
    daysInMonth: daysIn(anchor),
  };
}

// ---------------- Agregadores ----------------

export function buildSummary(
  records: WalletRecord[],
  accounts: WalletAccount[],
  budgets: WalletBudget[],
  categories: WalletCategory[],
  baseCurrency: string,
  now = new Date()
): DashboardSummary {
  const thisAnchor = now;
  const lastAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = summarizeMonth(records, thisAnchor);
  const lastMonth = summarizeMonth(records, lastAnchor);

  // Saldo total = saldo inicial de cuentas + neto histórico
  const totalInitial = accounts.reduce((s, a) =>
    s + toNum(a.initialBaseBalance ?? a.initialBalance ?? 0), 0);
  const netAll = records.reduce((s, r) => {
    const v = Math.abs(toNum(r.baseAmount ?? r.amount));
    return s + (r.recordType === "income" ? v : -v);
  }, 0);
  const totalBalance = totalInitial + netAll;

  // Trend del mes actual: por día
  const start = startOfMonth(thisAnchor);
  const end = endOfMonth(thisAnchor);
  const days = daysIn(thisAnchor);
  const buckets: Record<string, { income: number; expense: number }> = {};
  for (let d = 1; d <= days; d++) {
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    buckets[key] = { income: 0, expense: 0 };
  }
  for (const r of records) {
    const d = new Date(r.recordDate);
    if (d < start || d > end) continue;
    const key = r.recordDate.slice(0, 10);
    const v = Math.abs(toNum(r.baseAmount ?? r.amount));
    if (!buckets[key]) buckets[key] = { income: 0, expense: 0 };
    if (r.recordType === "income") buckets[key].income += v;
    else buckets[key].expense += v;
  }
  let cum = 0;
  const trend = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      cum += v.income - v.expense;
      return { date, income: v.income, expense: v.expense, cumulativeNet: cum };
    });

  // Top categorías (gastos del mes actual)
  const catMap = new Map<string, CategoryAgg>();
  const expensesThisMonth = records.filter(r => {
    const d = new Date(r.recordDate);
    return r.recordType === "expense" && d >= start && d <= end;
  });
  const totalExpense = expensesThisMonth.reduce((s, r) => s + Math.abs(toNum(r.baseAmount ?? r.amount)), 0);
  for (const r of expensesThisMonth) {
    const cid = r.categoryId ?? r.category?.id ?? "uncat";
    const cat = r.category ?? categories.find(c => c.id === cid);
    const cur = catMap.get(cid) ?? {
      categoryId: cid,
      name: cat?.name ?? "Sin categoría",
      color: cat?.color ?? "#64748b",
      amount: 0,
      count: 0,
      pct: 0,
    };
    cur.amount += Math.abs(toNum(r.baseAmount ?? r.amount));
    cur.count += 1;
    catMap.set(cid, cur);
  }
  const topCategories = [...catMap.values()]
    .map(c => ({ ...c, pct: totalExpense > 0 ? c.amount / totalExpense : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Budgets
  const dayOfMonth = thisAnchor.getDate();
  const pace = dayOfMonth / days;
  const budgetStatuses: BudgetStatus[] = budgets.map(b => {
    const catIds = new Set(b.categoryIds ?? []);
    const spent = expensesThisMonth
      .filter(r => catIds.size === 0 || catIds.has(r.categoryId ?? ""))
      .reduce((s, r) => s + Math.abs(toNum(r.baseAmount ?? r.amount)), 0);
    const amount = toNum(b.amount);
    const pct = amount > 0 ? spent / amount : 0;
    const state: BudgetStatus["state"] = pct >= 1 ? "over" : pct >= 0.8 ? "near" : "ok";
    const categoryNames = (b.categoryIds ?? [])
      .map(id => categories.find(c => c.id === id)?.name ?? id);
    return { budgetId: b.id, name: b.name, amount, spent, remaining: amount - spent, pct, pace, state, categoryNames };
  });

  // Alertas
  const alerts: Alert[] = [];
  for (const b of budgetStatuses) {
    if (b.state === "over") {
      alerts.push({
        id: `budget-over-${b.budgetId}`,
        level: "danger",
        title: `Presupuesto excedido: ${b.name}`,
        message: `Llevas ${formatMoney(b.spent, baseCurrency)} de ${formatMoney(b.amount, baseCurrency)} (${Math.round(b.pct*100)}%).`,
        icon: "alert-octagon",
      });
    } else if (b.state === "near") {
      alerts.push({
        id: `budget-near-${b.budgetId}`,
        level: "warning",
        title: `Cerca del límite: ${b.name}`,
        message: `Has usado ${Math.round(b.pct*100)}% del presupuesto.`,
        icon: "alert-triangle",
      });
    } else if (b.pct > pace + 0.15) {
      alerts.push({
        id: `budget-pace-${b.budgetId}`,
        level: "warning",
        title: `Gasto acelerado en ${b.name}`,
        message: `Vas al ${Math.round(b.pct*100)}% pero solo ha pasado el ${Math.round(pace*100)}% del mes.`,
        icon: "trending-up",
      });
    }
  }
  // Pico inusual de gasto vs promedio diario del mes pasado
  const avgDailyExpenseLastMonth = lastMonth.expense / lastMonth.daysInMonth;
  const todayKey = now.toISOString().slice(0, 10);
  const todaySpent = (buckets[todayKey]?.expense ?? 0);
  if (avgDailyExpenseLastMonth > 0 && todaySpent > avgDailyExpenseLastMonth * 2) {
    alerts.push({
      id: "spike-today",
      level: "warning",
      title: "Gasto inusual hoy",
      message: `Hoy llevas ${formatMoney(todaySpent, baseCurrency)} — más del doble de tu promedio diario (${formatMoney(avgDailyExpenseLastMonth, baseCurrency)}).`,
      icon: "zap",
    });
  }
  // Ahorro vs mes pasado
  const momPct = lastMonth.net !== 0 ? (thisMonth.net - lastMonth.net) / Math.abs(lastMonth.net) : 0;
  if (lastMonth.net !== 0 && Math.abs(momPct) > 0.2 && thisAnchor.getDate() > 7) {
    alerts.push({
      id: "mom-net",
      level: momPct > 0 ? "info" : "warning",
      title: momPct > 0 ? "Vas mejor que el mes pasado" : "Vas peor que el mes pasado",
      message: `Tu balance neto cambió ${(momPct*100).toFixed(1)}% vs ${lastMonth.monthLabel}.`,
      icon: momPct > 0 ? "trending-up" : "trending-down",
    });
  }

  // Idle counter source-of-truth
  const monthSeconds = days * 24 * 60 * 60;
  const idle = {
    incomeLastMonth: lastMonth.income,
    expenseLastMonth: lastMonth.expense,
    incomePerSecond: lastMonth.income / monthSeconds,
    expensePerSecond: lastMonth.expense / monthSeconds,
    netPerSecond: (lastMonth.income - lastMonth.expense) / monthSeconds,
    monthStartIso: start.toISOString(),
    monthEndIso: end.toISOString(),
    nowIso: now.toISOString(),
    incomeRealMTD: thisMonth.income,
    expenseRealMTD: thisMonth.expense,
  };

  return {
    baseCurrency,
    generatedAt: now.toISOString(),
    totalBalance,
    thisMonth,
    lastMonth,
    monthOverMonthPct: momPct,
    trend,
    topCategories,
    budgets: budgetStatuses,
    alerts,
    idle,
  };
}

export function formatMoney(v: number, currency = "COP", short = false): string {
  if (short && Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (short && Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "COP" ? 0 : 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(0)}`;
  }
}
