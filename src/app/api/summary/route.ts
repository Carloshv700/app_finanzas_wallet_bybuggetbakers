import { NextResponse } from "next/server";
import { getAccounts, getBudgets, getCategories, getRecords } from "@/lib/wallet";
import { buildSummary } from "@/lib/analytics";

export const revalidate = 60; // refresca server-side cada 60s

export async function GET() {
  try {
    const baseCurrency = process.env.NEXT_PUBLIC_BASE_CURRENCY ?? "COP";
    const now = new Date();

    // Fetch accounts/categories/budgets en paralelo (no dependen del rango de records).
    const [accounts, categories, budgets] = await Promise.all([
      getAccounts(),
      getCategories(),
      getBudgets(),
    ]);

    // El balance total = initialBalance + sum(records). Necesitamos TODOS los records desde la
    // fecha más antigua que tenga cualquier cuenta, no solo los últimos 12 meses.
    // Fallback a 12 meses atrás si no hay recordStats (ej. cuenta vacía).
    const fallbackFrom = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString();
    const earliestRecordDates = accounts
      .map(a => a.recordStats?.recordDate?.min)
      .filter((d): d is string => !!d)
      .sort();
    const from = earliestRecordDates[0] ?? fallbackFrom;

    const records = await getRecords({ from });

    const summary = buildSummary(records, accounts, budgets, categories, baseCurrency, now);
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
