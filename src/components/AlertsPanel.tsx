"use client";

import { Alert } from "@/lib/analytics";
import { AlertOctagon, AlertTriangle, Info, TrendingDown, TrendingUp, Zap } from "lucide-react";

const ICONS: Record<string, any> = {
  "alert-octagon": AlertOctagon,
  "alert-triangle": AlertTriangle,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "zap": Zap,
};

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider text-muted">Alertas</h3>
        <span className="text-xs text-muted">{alerts.length} activa{alerts.length === 1 ? "" : "s"}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted flex items-center gap-2"><Info size={14} /> Todo en orden 🌿</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto scroll-fade pr-1">
          {alerts.map(a => {
            const Icon = ICONS[a.icon ?? ""] ?? Info;
            const tone =
              a.level === "danger"  ? "border-danger/30 bg-danger/10 text-danger" :
              a.level === "warning" ? "border-warn/30 bg-warn/10 text-warn"       :
                                      "border-accent/30 bg-accent/10 text-accent";
            return (
              <li key={a.id} className={`border rounded-xl p-3 ${tone}`}>
                <div className="flex items-start gap-2">
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{a.title}</div>
                    <div className="text-xs text-white/80 mt-0.5">{a.message}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
