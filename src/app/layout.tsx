import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mis Finanzas — Wallet Idle",
  description: "Dashboard personal de finanzas con contador autoincremental sobre Wallet by BudgetBakers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
