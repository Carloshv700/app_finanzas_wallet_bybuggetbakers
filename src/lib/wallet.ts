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

// La API real envuelve los arrays bajo una key específica por endpoint:
// /accounts -> { accounts: [...] }, /records -> { records: [...] }, etc.
function unwrap<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[];
  const obj = res as Record<string, unknown> | null;
  if (!obj) return [];
  if (Array.isArray(obj[key])) return obj[key] as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  return [];
}

// La API limita: (a) sin lt explícito devuelve solo 3 meses desde gte, (b) con rango explícito
// rechaza queries > 370 días. Para fetches largos (ej. 13 meses) chunkeamos en pedazos de 90 días.
const CHUNK_DAYS = 90;
const PAGE_SIZE = 200;

async function fetchRecordsInRange(fromIso: string, toIso: string): Promise<WalletRecord[]> {
  const all: WalletRecord[] = [];
  let offset = 0;
  while (true) {
    const page = await get<unknown>("/v1/api/records", {
      limit: PAGE_SIZE,
      offset,
      recordDate: `gte.${fromIso},lt.${toIso}`,
      sortBy: "-recordDate",
    });
    const items = unwrap<WalletRecord>(page, "records");
    all.push(...items);
    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 5000) break; // tope de seguridad por chunk
  }
  return all;
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

  const fromDate = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = opts.to ? new Date(opts.to) : new Date();
  const chunkMs = CHUNK_DAYS * 24 * 60 * 60 * 1000;

  // Trae cada chunk de 90 días en paralelo (rate limit es 500/h, sobra holgura).
  const chunks: Array<{ from: string; to: string }> = [];
  for (let t = fromDate.getTime(); t < toDate.getTime(); t += chunkMs) {
    chunks.push({
      from: new Date(t).toISOString(),
      to: new Date(Math.min(t + chunkMs, toDate.getTime())).toISOString(),
    });
  }
  const chunkResults = await Promise.all(chunks.map(c => fetchRecordsInRange(c.from, c.to)));

  // Dedupe por id (los chunks no se solapan, pero por si acaso).
  const dedup = new Map<string, WalletRecord>();
  for (const list of chunkResults) for (const r of list) dedup.set(r.id, r);
  const all = Array.from(dedup.values());

  return opts.limit ? all.slice(0, opts.limit) : all;
}

export async function getAccounts(): Promise<WalletAccount[]> {
  if (useMock()) return MOCK_ACCOUNTS;
  const res = await get<unknown>("/v1/api/accounts");
  return unwrap<WalletAccount>(res, "accounts");
}

export async function getCategories(): Promise<WalletCategory[]> {
  if (useMock()) return MOCK_CATEGORIES;
  const res = await get<unknown>("/v1/api/categories");
  return unwrap<WalletCategory>(res, "categories");
}

export async function getBudgets(): Promise<WalletBudget[]> {
  if (useMock()) return MOCK_BUDGETS;
  const res = await get<unknown>("/v1/api/budgets");
  return unwrap<WalletBudget>(res, "budgets");
}
