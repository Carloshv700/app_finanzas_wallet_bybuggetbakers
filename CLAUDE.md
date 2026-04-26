# Wallet Finanzas Personales — Guía para Claude

## Qué es este proyecto

Webapp personal de finanzas que consume la **REST API de Wallet by BudgetBakers** y la mezcla con un **contador autoincremental tipo idle game**. Construida originalmente en una sesión de Cowork mode (modelo claude-opus-4-7).

El usuario es **no-developer** pero está dispuesto a leer código y abrir terminal. Responde siempre en **español** (preferencia del usuario).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Recharts** para gráficas, **lucide-react** para iconos
- Sin backend propio: la API de Wallet se llama desde route handlers (`/api/*`) para no exponer el JWT al navegador
- Caché simple via `next: { revalidate: 60 }` para respetar el rate limit (500 req/h)

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── summary/route.ts    # Endpoint principal — agrega KPIs, alertas, idle counter
│   │   └── records/route.ts    # Listado de transacciones
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard (client component)
│   └── globals.css
├── components/
│   ├── IdleCounter.tsx         # ⭐ Contador autoincremental gamificado (la pieza estrella)
│   ├── KpiCard.tsx
│   ├── TrendChart.tsx          # Recharts AreaChart
│   ├── CategoryBreakdown.tsx
│   ├── BudgetGrid.tsx
│   └── AlertsPanel.tsx
└── lib/
    ├── wallet.ts               # Cliente HTTP server-only (token nunca llega al cliente)
    ├── analytics.ts            # buildSummary(): KPIs, agregaciones, alertas, idle source-of-truth
    ├── mock.ts                 # Datos sintéticos realistas (3 meses, COP)
    └── types.ts
```

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # validación de typecheck + build de producción
```

## Configuración

`.env.local` controla todo:
- `WALLET_API_TOKEN` — JWT de la API (se obtiene en wallet.budgetbakers.com → Settings → REST API; requiere Premium)
- `USE_MOCK=true|false` — si está en `true` o el token está vacío, usa datos generados en `lib/mock.ts`
- `NEXT_PUBLIC_BASE_CURRENCY` — moneda para formateo (default `COP`)

**Por defecto arranca en modo mock** para que el usuario pueda ver la app sin tener Premium.

## API de Wallet by BudgetBakers — referencia rápida

- Base URL: `https://rest.budgetbakers.com/wallet`
- Auth: `Authorization: Bearer <jwt>` (Premium only, BETA)
- Docs: https://rest.budgetbakers.com/wallet/openapi/ui
- Endpoints usados:
  - `GET /v1/api/records` — transacciones (filtros con prefijos: `gte.`, `lte.`, `eq.`, `contains.`)
  - `GET /v1/api/accounts`
  - `GET /v1/api/categories`
  - `GET /v1/api/budgets`
- Campos clave de `Record`: `recordType` (`income` | `expense`), `baseAmount` (en moneda base — usar este, no `amount`), `recordDate` (ISO), `categoryId`, `accountId`
- Rate limit: 500 req/hora (headers `X-RateLimit-*`)
- Algunos endpoints devuelven `[]` directo, otros `{ data: [] }` — el cliente normaliza ambos

## Cómo funciona el contador idle (lo más importante)

`IdleCounter.tsx` corre un `setInterval` a 30 fps y calcula:

```ts
incomeSimulado = incomeLastMonth * (msTranscurridosDelMes / msTotalDelMes)
incomeMostrado = Math.max(incomeSimulado, incomeRealMTD)
```

**Reconciliación**: si el ingreso real acumulado este mes ya supera al simulado, ese manda. Así el contador nunca pega saltos hacia abajo cuando llega plata real, y al final del mes converge con la realidad.

Source of truth está en `analytics.ts` → `buildSummary()` → campo `idle`.

## Sistema de alertas (en `analytics.ts`)

Reglas activas:
- **danger**: presupuesto excedido (≥100% del monto)
- **warning**: cerca del límite (≥80%)
- **warning**: gasto acelerado (uso del presupuesto > ritmo del mes + 15pts)
- **warning**: gasto inusual hoy (>2× promedio diario del mes pasado)
- **info/warning**: cambio neto vs mes pasado >20% (después del día 7)

Para agregar una nueva alerta: editá `buildSummary()` en `lib/analytics.ts` y empujá al array `alerts`. La UI ya las pinta automáticamente.

## Convenciones del código

- `formatMoney(v, currency, short?)` para mostrar plata — usa `Intl.NumberFormat` y maneja COP sin decimales
- `toNum()` en `types.ts` para parsear valores que la API a veces envía como string
- Componentes con `"use client"` solo cuando hay state/efectos; el resto puede ser server component
- Tailwind con tema custom (colores `bg`, `panel`, `accent`, `warn`, `danger`, `muted`) en `tailwind.config.ts`
- Animaciones custom: `animate-floatUp` (números flotantes idle) y `animate-pulseGlow` (halo del counter)

## Cosas pendientes / posibles mejoras

- Agregar página/vista de transacciones detalladas (la ruta `/api/records` ya existe pero no se consume)
- Filtros por cuenta/categoría en el dashboard
- Drill-down al hacer click en una categoría del breakdown
- Exportar a PDF/Excel
- Dark/light mode toggle (hoy es dark only)
- Persistir la preferencia de modo (`income`/`expense`/`net`) y rate (`seg`/`min`/`hora`) del IdleCounter en localStorage
- Manejar mejor el caso "ninguna transacción aún" en el primer día del mes
- PWA / instalable

## Heads-up sobre OneDrive

La carpeta vive dentro de OneDrive. `npm install` puede fallar con `EBUSY` o "operation not permitted" porque OneDrive bloquea archivos durante la sincronización. Si pasa: pausar OneDrive temporalmente o mover el repo a `C:\dev\`.
