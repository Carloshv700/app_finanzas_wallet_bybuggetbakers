# Mis Finanzas — Wallet Idle

Webapp personal de finanzas que consume la **REST API de Wallet by BudgetBakers** y la mezcla con un contador autoincremental tipo *idle game* para que sientas tu plata creciendo en tiempo real.

## ¿Qué hace?

- **Dashboard** con saldo total, ingresos vs gastos, balance neto y comparativo vs mes anterior.
- **Contador idle gamificado** ⚡: arranca en tu ingreso/gasto real del mes y sube cada segundo proporcional al promedio de tus últimos 12 meses. Cambias entre `$/seg`, `$/min`, `$/hora` (solo cambia la etiqueta — el ticking visual es siempre por segundo).
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
   - `incomeMonthlyAvg` y `expenseMonthlyAvg` = promedio mensual sobre los últimos 12 meses (excluyendo transferencias entre tus propias cuentas).
   - `incomeRealMTD` = lo realmente acumulado este mes hasta ahora (el ancla).
2. El componente `<IdleCounter />` arranca el número en `incomeRealMTD` y cada segundo le suma `(monthlyAvg × 1seg) / segundosTotalesDelMes`. Es 100% visual — no toca ningún dato persistente.
3. Al recargar la página, cambiar de modo (Ingreso/Gasto/Balance), o cuando el server refresca data (cada 5 min), el contador vuelve al ancla real.
4. Los botones `/seg`, `/min`, `/hora` solo cambian cómo se muestra el ritmo en la etiqueta — el ticking visual del número grande es siempre por segundo.

## Deploy a Vercel

```bash
# Build local para verificar
npm run build

# Deploy
npx vercel
# Configura las env vars en Vercel: WALLET_API_TOKEN, USE_MOCK=false, NEXT_PUBLIC_BASE_CURRENCY
```

## Limitaciones conocidas

- La API es **BETA** y requiere Premium — BudgetBakers puede cambiar endpoints/respuestas sin aviso.
- La API tiene dos límites duros en `/records`: máximo **370 días** por query, y si no especificás un `lt` te limita a 3 meses desde el `gte`. El cliente automáticamente chunkea fetches largos en pedazos de 90 días en paralelo.
- **Transferencias entre tus cuentas** se identifican por `category.envelopeId === 20001` y se excluyen de KPIs/trend/categorías para no duplicar (Wallet las guarda como par income+expense). Sí cuentan en el saldo total porque vienen en pares y se cancelan.
- Saldo total se calcula como `Σ initialBaseBalance + Σ records.baseAmount`. Para que coincida con Wallet, fetcheamos records desde la fecha más antigua de cualquier cuenta (no solo los últimos 12 meses). Tarjetas de crédito viejas pueden tener años de historia.
- El idle counter usa el promedio de los últimos 12 meses como tasa esperada. Si tenés <12 meses de data, divide por los meses con datos para no subestimar.
