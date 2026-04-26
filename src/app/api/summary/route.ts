import { NextResponse } from "next/server";
import { getAccounts, getBudgets, getCategories, getRecords } from "@/lib/wallet";
import { buildSummary } from "@/lib/analytics";

export const revalidate = 60; // refresca server-side cada 60s

export async function GET() {
  try {
    const baseCurrency = process.env.NEXT_PUBLIC_BASE_CURRENCY ?? "COP";
    const now = new Date();
    // Pedimos 3 meses hacia atrás para tener mes actual + mes pasado + colchón
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();

    const [records, accounts, categories, budgets] = await Promise.all([
      getRecords({ from }),
      getAccounts(),
      getCategories(),
      getBudgets(),
    ]);

    const summary = buildSummary(records, accounts, budgets, categories, baseCurrency, now);
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
