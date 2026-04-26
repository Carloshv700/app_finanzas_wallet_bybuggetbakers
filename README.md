# Mis Finanzas — Wallet Idle

Webapp personal de finanzas que consume la **REST API de Wallet by BudgetBakers** y la mezcla con un contador autoincremental tipo *idle game* para que sientas tu plata creciendo en tiempo real.

## ¿Qué hace?

- **Dashboard** con saldo total, ingresos vs gastos, balance neto y comparativo vs mes anterior.
- **Contador idle gamificado** ⚡: muestra tu ingreso/gasto del mes en tiempo real, extrapolando linealmente lo del mes pasado y reconciliándose con la data real cuando llegan transacciones nuevas. Cambias entre `$/seg`, `$/min`, `$/hora`.
- **Alertas inteligentes**:
  - Categoría supera el presupuesto (≥80% = warning, ≥100% = danger).
  - Gasto inusual hoy (>2× el promedio diario del mes pasado).
  - Ritmo de gasto adelantado vs el ritmo del mes.
  - Comparativo vs mes anterior.
- **Top categorías** del mes con barras y % del gasto total.
- **Presupuestos** con barra de progreso y línea de "ritmo esperado".
- **Tendencia diaria** (ingresos, gastos, neto acumulado) con Recharts.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Recharts** para gráficas, **Lucide** para iconos
- API de Wallet llamada **server-side** desde `/api/*` para no exponer el token en el navegador
- Caché in-memory (revalidate cada 60s) para no quemar el rate limit (500 req/h)

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables (ya viene con USE_MOCK=true para arrancar sin token)
cp .env.example .env.local

# 3. Correr en local
npm run dev
# abre http://localhost:3000
```

## Conseguir el token de Wallet

> ⚠️ La API REST de Wallet by BudgetBakers está disponible **solo para usuarios Premium** (en BETA). [Doc oficial](https://support.budgetbakers.com/hc/en-us/articles/10761479741586-Rest-API-MCP)

1. Entra a https://wallet.budgetbakers.com con tu cuenta Premium
2. Avatar (esquina superior derecha) → **Settings**
3. Busca la sección **REST API** y genera tu token JWT
4. Pégalo en `.env.local`:
   ```env
   WALLET_API_TOKEN=tu_jwt_aqui
   USE_MOCK=false
   ```
5. Reinicia el dev server

## Modo mock (sin token)

Si todavía no tienes Premium o quieres jugar con la app primero, deja `USE_MOCK=true` en `.env.local`. La app generará 3 meses de transacciones realistas (salario, freelance, comida, transporte, suscripciones, etc.) para que veas todo funcionando.

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `WALLET_API_TOKEN` | JWT de la REST API | (vacío) |
| `NEXT_PUBLIC_BASE_CURRENCY` | Moneda para formateo (COP, USD, EUR…) | `COP` |
| `USE_MOCK` | Usar datos generados en vez de la API real | `true` |

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── summary/route.ts    # KPIs agregados (entry point principal)
│   │   └── records/route.ts    # listado de transacciones
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard
│   └── globals.css
├── components/
│   ├── IdleCounter.tsx         # ⭐ contador autoincremental
│   ├── KpiCard.tsx
│   ├── TrendChart.tsx
│   ├── CategoryBreakdown.tsx
│   ├── BudgetGrid.tsx
│   └── AlertsPanel.tsx
└── lib/
    ├── wallet.ts               # cliente HTTP a Wallet API (server-only)
    ├── analytics.ts            # cálculo de KPIs, alertas, idle counter
    ├── mock.ts                 # datos sintéticos
    └── types.ts
```

## Cómo funciona el contador idle

1. Al cargar el dashboard, el endpoint `/api/summary` calcula:
   - `incomeLastMonth` y `expenseLastMonth` (totales reales del mes anterior)
   - `incomePerSecond = incomeLastMonth / segundos del mes actual`
   - `incomeRealMTD` (lo realmente acumulado este mes hasta hoy)
2. El componente `<IdleCounter />` corre un `setInterval` a 30 fps y calcula:
   ```ts
   incomeSimulado = incomeLastMonth * (msTranscurridosDelMes / msTotalDelMes)
   incomeMostrado = max(incomeSimulado, incomeRealMTD)
   ```
3. Cuando llega un ingreso real que ya superaba la simulación, el contador se "reconcilia" sin saltos hacia abajo (siempre crece).
4. Al final del mes, lo simulado y lo real convergen.

## Deploy a Vercel

```bash
# Build local para verificar
npm run build

# Deploy
npx vercel
# Configura las env vars en Vercel: WALLET_API_TOKEN, USE_MOCK=false, NEXT_PUBLIC_BASE_CURRENCY
```

## Limitaciones conocidas

- La API es **BETA** y requiere Premium — Anthropic puede cambiar endpoints/respuestas sin aviso.
- El cliente normaliza tanto `Array<...>` como `{ data: Array<...> }` por si la API devuelve formatos distintos.
- Saldo total se calcula como `Σ initialBaseBalance + Σ records.baseAmount`. Si tienes muchas cuentas archivadas con saldos viejos puede no coincidir 1:1 con la app oficial.
- El idle counter asume que tu ingreso del mes pasado es un buen estimador — si tuviste un mes atípico el ritmo se verá raro hasta que llegue plata real.
