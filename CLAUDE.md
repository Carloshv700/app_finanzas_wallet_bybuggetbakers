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
- Endpoints usados: `/v1/api/records`, `/accounts`, `/categories`, `/budgets`
- Rate limit: 500 req/hora (headers `X-RateLimit-*`)

**Forma real de las respuestas** (descubierto en pruebas, no documentado obviamente):
- Cada endpoint envuelve los items bajo una key específica: `{ accounts: [...] }`, `{ categories: [...] }`, `{ budgets: [...] }`, `{ records: [...] }` — más `limit`, `offset`, `nextOffset`. El helper `unwrap()` en `wallet.ts` extrae el array correcto por endpoint.
- **Los montos son objetos**, no números: `amount: { value: -52056, currencyCode: "COP" }`. Lo mismo `baseAmount`, `initialBalance`, `initialBaseBalance`. El helper `toNum()` en `types.ts` extrae `.value` automáticamente.
- Records de gasto tienen `value` **negativo** (ej. `-52056`). El código siempre usa `Math.abs()` antes de sumar.

**Límites duros del endpoint `/records`:**
- Sin `lt` explícito → la API auto-acota a 3 meses desde `gte`. Si pides 12 meses solo te llegan los primeros 3.
- Rango explícito `gte.<a>,lt.<b>` → máximo **370 días**. Más que eso devuelve `400 Invalid recordDate range`.
- Solución: `wallet.ts` chunkea automáticamente en pedazos de 90 días con `Promise.all`, dedupea por `id`. Si necesitás cambiar el rango total, el chunking lo maneja transparentemente.

**Identificar transferencias entre cuentas del usuario:**
- Marcador estable: `category.envelopeId === 20001` (no depende del idioma del usuario ni del nombre custom).
- Wallet guarda transferencias como un **par de records** (income en cuenta receptora + expense en cuenta emisora) — si los contás como ingreso/gasto se duplica todo. `analytics.ts` filtra estos en KPIs, trend, top categorías y presupuestos.
- Para `totalBalance` NO se filtran (vienen en pares y se cancelan solas).

**Balance actual por cuenta:**
- La API **no expone** un campo `currentBalance`. Solo `initialBalance` + necesitás todos los records históricos.
- `route.ts` usa `accounts[].recordStats.recordDate.min` como punto de partida del fetch, garantizando que se traigan todos los records que afectan el saldo (cuentas viejas como tarjetas de crédito pueden tener años de historia).

## Cómo funciona el contador idle (lo más importante)

**Modelo conceptual:**
- **Ancla** = `incomeRealMTD` (o expense, o net) que viene del server. Fuente de verdad real, no se modifica.
- **Bump visual** = acumulador local que crece cada segundo. 100% cosmético, no toca ningún dato persistente.
- **Valor mostrado** = `ancla + bump`.

**Tick:**
- Siempre cada 1 segundo, sin importar el rate elegido.
- Cada tick suma `incrementPerSecond = (baselineMonthly × 1000ms) / msDelMes` al bump y emite un floater "+$X".
- `baselineMonthly` viene del promedio de los últimos 12 meses (campo `incomeMonthlyAvg` / `expenseMonthlyAvg` en `idle`), excluyendo transferencias y dividido por meses con datos (max 12).

**Selector seg/min/hora** (chips superior derecha):
- Solo cambia el texto de la etiqueta "Ritmo: $X / unidad". El ticking visual sigue siendo cada segundo.
- El display rate = `incrementPerSecond × multiplier` (1 / 60 / 3600).

**Reset del bump al ancla** cuando:
- Cambia el ancla (refetch del server cada 5 min, o reload de página).
- Cambia el modo (Ingreso / Gasto / Balance).
- (NO se resetea al cambiar seg/min/hora porque no afecta el ticking.)

Source of truth está en `analytics.ts` → `buildSummary()` → campo `idle`. La ventana del promedio (`AVG_WINDOW_MONTHS = 12`) es constante en código.

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
