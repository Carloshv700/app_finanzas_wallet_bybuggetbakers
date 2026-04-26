import { WalletAccount, WalletBudget, WalletCategory, WalletRecord } from "./types";

// Generador determinístico de datos realistas (semilla simple) para desarrollar sin token Premium.
// Genera ~3 meses hacia atrás de transacciones con patrones plausibles para una persona en Colombia.

const seedRandom = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

export const MOCK_CATEGORIES: WalletCategory[] = [
  { id: "cat-salary",   name: "Salario",          color: "#22c55e", iconName: "wallet" },
  { id: "cat-freelance",name: "Freelance",        color: "#10b981", iconName: "briefcase" },
  { id: "cat-food",     name: "Alimentación",     color: "#f97316", iconName: "utensils" },
  { id: "cat-transport",name: "Transporte",       color: "#3b82f6", iconName: "car" },
  { id: "cat-rent",     name: "Arriendo",         color: "#8b5cf6", iconName: "home" },
  { id: "cat-utilities",name: "Servicios",        color: "#06b6d4", iconName: "zap" },
  { id: "cat-entertain",name: "Entretenimiento",  color: "#ec4899", iconName: "music" },
  { id: "cat-shopping", name: "Compras",          color: "#f59e0b", iconName: "shopping-bag" },
  { id: "cat-health",   name: "Salud",            color: "#ef4444", iconName: "heart" },
  { id: "cat-subscript",name: "Suscripciones",    color: "#a855f7", iconName: "repeat" },
];

export const MOCK_ACCOUNTS: WalletAccount[] = [
  { id: "acc-bancolombia", name: "Bancolombia",  color: "#fde047", initialBaseBalance: 1_500_000, accountType: "CurrentAccount" },
  { id: "acc-nequi",       name: "Nequi",        color: "#a855f7", initialBaseBalance:   500_000, accountType: "CurrentAccount" },
  { id: "acc-cash",        name: "Efectivo",     color: "#94a3b8", initialBaseBalance:   200_000, accountType: "Cash" },
];

export const MOCK_BUDGETS: WalletBudget[] = [
  { id: "bud-food",     name: "Comida del mes",         amount: 1_800_000, startDate: monthStart(), endDate: monthEnd(), categoryIds: ["cat-food"], type: "monthly", currencyCode: "COP" },
  { id: "bud-entertain",name: "Entretenimiento",        amount:   500_000, startDate: monthStart(), endDate: monthEnd(), categoryIds: ["cat-entertain"], type: "monthly", currencyCode: "COP" },
  { id: "bud-shopping", name: "Compras",                amount: 1_200_000, startDate: monthStart(), endDate: monthEnd(), categoryIds: ["cat-shopping"], type: "monthly", currencyCode: "COP" },
  { id: "bud-transport",name: "Transporte",             amount:   700_000, startDate: monthStart(), endDate: monthEnd(), categoryIds: ["cat-transport"], type: "monthly", currencyCode: "COP" },
];

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function monthEnd(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

interface Pattern {
  categoryId: string;
  type: "income" | "expense";
  amountMin: number;
  amountMax: number;
  perMonth: number;       // cuántas veces al mes
  payeeOptions: string[];
  accountIds?: string[];
  fixedDay?: number;      // si es recurrente fijo (ej salario día 25)
}

const PATTERNS: Pattern[] = [
  { categoryId: "cat-salary",   type: "income",  amountMin: 4_500_000, amountMax: 4_500_000, perMonth: 1, payeeOptions: ["Empresa SAS"], fixedDay: 25, accountIds: ["acc-bancolombia"] },
  { categoryId: "cat-freelance",type: "income",  amountMin:   400_000, amountMax: 1_200_000, perMonth: 2, payeeOptions: ["Cliente A","Cliente B","Proyecto Web"], accountIds: ["acc-bancolombia","acc-nequi"] },
  { categoryId: "cat-rent",     type: "expense", amountMin: 1_400_000, amountMax: 1_400_000, perMonth: 1, payeeOptions: ["Inmobiliaria"], fixedDay: 5, accountIds: ["acc-bancolombia"] },
  { categoryId: "cat-utilities",type: "expense", amountMin:   80_000, amountMax:   220_000, perMonth: 3, payeeOptions: ["EPM","Une","Aguas","Air-e"], accountIds: ["acc-bancolombia"] },
  { categoryId: "cat-food",     type: "expense", amountMin:    8_000, amountMax:   85_000, perMonth: 38, payeeOptions: ["Éxito","D1","Justo & Bueno","Rappi","Domicilios.com","Olímpica","Restaurante","Panadería"] },
  { categoryId: "cat-transport",type: "expense", amountMin:    5_000, amountMax:   45_000, perMonth: 22, payeeOptions: ["Uber","DiDi","Cabify","TransMilenio","Metro","Gasolina"] },
  { categoryId: "cat-entertain",type: "expense", amountMin:   15_000, amountMax:  120_000, perMonth: 6, payeeOptions: ["Cine","Bar","Concierto","Steam","PlayStation"] },
  { categoryId: "cat-shopping", type: "expense", amountMin:   20_000, amountMax:  350_000, perMonth: 4, payeeOptions: ["Amazon","Mercado Libre","Falabella","Zara","Adidas"] },
  { categoryId: "cat-health",   type: "expense", amountMin:   25_000, amountMax:  280_000, perMonth: 2, payeeOptions: ["Farmacia","Cruz Verde","Médico","Sura"] },
  { categoryId: "cat-subscript",type: "expense", amountMin:   16_900, amountMax:   45_900, perMonth: 5, payeeOptions: ["Netflix","Spotify","HBO Max","Disney+","ChatGPT Plus","iCloud"], fixedDay: 12 },
];

export function generateMockRecords(monthsBack = 3): WalletRecord[] {
  const records: WalletRecord[] = [];
  const now = new Date();
  const rnd = seedRandom(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

  for (let m = monthsBack; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const isCurrentMonth = m === 0;
    const lastDay = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    for (const p of PATTERNS) {
      const cat = MOCK_CATEGORIES.find(c => c.id === p.categoryId)!;
      // Si tiene fixedDay -> ocurre solo en ese día (1 vez/mes), si no se distribuye.
      const occurrences = p.fixedDay
        ? (p.fixedDay <= lastDay ? 1 : 0)
        : Math.round(p.perMonth * (lastDay / daysInMonth) * (0.85 + rnd() * 0.3));

      for (let i = 0; i < occurrences; i++) {
        const day = p.fixedDay ?? (1 + Math.floor(rnd() * lastDay));
        const hour = 8 + Math.floor(rnd() * 14);
        const minute = Math.floor(rnd() * 60);
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, hour, minute);
        if (date > now) continue;

        const amount = Math.round(p.amountMin + rnd() * (p.amountMax - p.amountMin));
        const accountId = pick(p.accountIds ?? MOCK_ACCOUNTS.map(a => a.id));
        const payee = pick(p.payeeOptions);

        records.push({
          id: `rec-${monthDate.getMonth()}-${p.categoryId}-${i}`,
          accountId,
          amount,
          baseAmount: amount,
          recordDate: date.toISOString(),
          recordType: p.type,
          category: cat,
          categoryId: cat.id,
          payee: p.type === "expense" ? payee : undefined,
          payer: p.type === "income" ? payee : undefined,
          paymentType: p.type === "expense" ? pick(["debit_card","credit_card","cash","transfer"]) : "transfer",
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
        });
      }
    }
  }

  records.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
  return records;
}
