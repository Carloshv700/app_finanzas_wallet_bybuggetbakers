// Cliente server-side para la API de Wallet by BudgetBakers.
// El token nunca se expone al navegador: todas las llamadas pasan por route handlers en /api/*.

import { WalletAccount, WalletBudget, WalletCategory, WalletRecord } from "./types";
import {
  generateMockRecords,
  MOCK_ACCOUNTS,
  MOCK_BUDGETS,
  MOCK_CATEGORIES,
} from "./mock";

const BASE_URL = "https://rest.budgetbakers.com/wallet";

const useMock = () => process.env.USE_MOCK === "true" || !process.env.WALLET_API_TOKEN;

async function get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = process.env.WALLET_API_TOKEN;
  if (!token) throw new Error("WALLET_API_TOKEN no está configurado");

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    // Cache server-side por 60s para no quemarse el rate limit (500/h)
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wallet API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// Endpoints
export async function getRecords(opts: { limit?: number; from?: string; to?: string } = {}): Promise<WalletRecord[]> {
  if (useMock()) {
    let recs = generateMockRecords(3);
    if (opts.from) recs = recs.filter(r => r.recordDate >= opts.from!);
    if (opts.to)   recs = recs.filter(r => r.recordDate <= opts.to!);
    if (opts.limit) recs = recs.slice(0, opts.limit);
    return recs;
  }
  // La API soporta filtros range con prefijo gte./lte.
  const recordDate =
    opts.from && opts.to ? `gte.${opts.from},lte.${opts.to}` :
    opts.from            ? `gte.${opts.from}` :
    opts.to              ? `lte.${opts.to}`   : undefined;

  // Paginación: el endpoint devuelve hasta 200. Para finanzas personales suele alcanzar.
  const all: WalletRecord[] = [];
  let offset = 0;
  const pageSize = 200;
  while (true) {
    const page = await get<WalletRecord[] | { data: WalletRecord[] }>("/v1/api/records", {
      limit: pageSize,
      offset,
      recordDate,
      sortBy: "-recordDate",
    });
    const items = Array.isArray(page) ? page : page.data ?? [];
    all.push(...items);
    if (items.length < pageSize) break;
    offset += pageSize;
    if (offset > 5000 || (opts.limit && all.length >= opts.limit)) break; // tope de seguridad
  }
  return opts.limit ? all.slice(0, opts.limit) : all;
}

export async function getAccounts(): Promise<WalletAccount[]> {
  if (useMock()) return MOCK_ACCOUNTS;
  const res = await get<WalletAccount[] | { data: WalletAccount[] }>("/v1/api/accounts");
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function getCategories(): Promise<WalletCategory[]> {
  if (useMock()) return MOCK_CATEGORIES;
  const res = await get<WalletCategory[] | { data: WalletCategory[] }>("/v1/api/categories");
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function getBudgets(): Promise<WalletBudget[]> {
  if (useMock()) return MOCK_BUDGETS;
  const res = await get<WalletBudget[] | { data: WalletBudget[] }>("/v1/api/budgets");
  return Array.isArray(res) ? res : res.data ?? [];
}
