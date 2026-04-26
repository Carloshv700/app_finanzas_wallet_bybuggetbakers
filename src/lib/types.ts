// Tipos basados en el OpenAPI spec de Wallet by BudgetBakers
export type RecordType = "income" | "expense";

export interface WalletRecord {
  id: string;
  accountId: string;
  amount: number | string;       // amount original
  baseAmount: number | string;   // convertido a moneda base
  recordDate: string;            // ISO
  recordType: RecordType;
  note?: string;
  payee?: string;
  payer?: string;
  paymentType?: string;
  category?: WalletCategory;
  categoryId?: string;
  labels?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface WalletAccount {
  id: string;
  name: string;
  accountType?: string;
  color?: string;
  initialBalance?: number | string;
  initialBaseBalance?: number | string;
  archived?: boolean;
  excludeFromStats?: boolean;
  recordStats?: {
    incomeBaseAmount?: number;
    expenseBaseAmount?: number;
  };
}

export interface WalletCategory {
  id: string;
  name: string;
  color?: string;
  iconName?: string;
  enabled?: boolean;
  archived?: boolean;
}

export interface WalletBudget {
  id: string;
  name: string;
  amount: number | string;
  currencyCode?: string;
  startDate: string;
  endDate: string;
  type?: string;
  categoryIds?: string[];
  accountIds?: string[];
}

// Helpers
export const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
};
