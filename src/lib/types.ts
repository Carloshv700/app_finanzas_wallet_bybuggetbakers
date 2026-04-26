// Tipos basados en la respuesta real de la REST API de Wallet by BudgetBakers.
// Los montos pueden venir como número crudo (mocks) o como objeto { value, currencyCode } (API real).
export type RecordType = "income" | "expense";
export type Money = number | string | { value: number | string; currencyCode?: string };

export interface WalletRecord {
  id: string;
  accountId: string;
  amount: Money;
  baseAmount: Money;
  recordDate: string;            // ISO
  recordType: RecordType;
  recordState?: string;          // "cleared", etc.
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
  initialBalance?: Money;
  initialBaseBalance?: Money;
  archived?: boolean;
  excludeFromStats?: boolean;
  recordStats?: {
    recordCount?: number;
    recordDate?: { min?: string; max?: string };
    createdAt?: { min?: string; max?: string };
    incomeBaseAmount?: number;
    expenseBaseAmount?: number;
  };
}

export interface WalletCategory {
  id: string;
  name: string;
  color?: string;
  iconName?: string;
  envelopeId?: number;
  enabled?: boolean;
  archived?: boolean;
}

export interface WalletBudget {
  id: string;
  name: string;
  amount: Money;
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
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return toNum((v as Record<string, unknown>).value);
  }
  return 0;
};
