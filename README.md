# Elysium

Web app en Vite + React + TypeScript, con Mantine como librería de UI y React Router.
El modelo de datos vive en Supabase (`supabase/migrations/`, documentado en
`docs/MODELO.md`). El front tiene dos caras: la del usuario normal, mobile-first
(`src/pages/`), y la de administración, de escritorio y densa
(`src/features/`, `AdminLayout`), cuyo sistema de diseño está en `docs/DISENIO.md`.

## Requisitos

- Node.js 20.19+ o 22.12+ (probado con 24.x)
- npm 10+

## Instalación

```bash
npm install
```

## Levantar en local

```bash
npm run dev
```

Vite sirve la app en http://localhost:5173.

## Variables de entorno

Copiá `.env.example` a `.env` y completá lo que haga falta:

```bash
cp .env.example .env
```

Solo las variables con prefijo `VITE_` llegan al código del cliente. `.env` está
ignorado por git; `.env.example` es el que se versiona.

## Scripts

| Script                 | Qué hace                                         |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Servidor de desarrollo con HMR                   |
| `npm run build`        | Chequeo de tipos + build de producción a `dist/` |
| `npm run preview`      | Sirve el build de `dist/` para probarlo local    |
| `npm run lint`         | ESLint sobre todo el proyecto                    |
| `npm run lint:fix`     | ESLint con `--fix`                               |
| `npm run format`       | Prettier sobre todo el proyecto                  |
| `npm run format:check` | Prettier en modo chequeo (útil en CI)            |
| `npm run typecheck`    | Solo chequeo de tipos                            |

## Estructura

```
docs/
  CONTEXT.md              El negocio: qué es Elysium y qué tiene que hacer la app
  MODELO.md               El modelo de datos y por qué está así
  DISENIO.md              El sistema de diseño del front de administración
  DISENIO-USUARIO.md      El del front del usuario: "noche eléctrica", mobile-first
public/                   Assets estáticos servidos tal cual
src/
  app/                    Composición de la app: providers, router, theme
    App.tsx               MantineProvider + RouterProvider
    AuthProvider.tsx      Sesión de Supabase, perfil y rol
    router.tsx            Definición de rutas (createBrowserRouter)
    theme.ts              Theme de Mantine
  components/             UI compartida entre features
    ui/                   El sistema de diseño: Tabla, Numero, Formulario, …
    Logo.tsx              La marca, servida desde public/logo-256.png
    layout/AppLayout.tsx  Shell del usuario: columna en teléfono, barra lateral en pc
    layout/AdminLayout.tsx Shell del admin: barra lateral agrupada + inicio
  features/               Módulos de dominio
    inicio/               Resumen del admin: lo que espera respuesta
    insumos/              Insumos, precios, proveedores y MP intermedias
    productos/            Productos, tamaños, fórmulas y precios de venta
    lotes/                Producción: planificación, cierre y costo real
    stock/                Movimientos, recuentos y ubicaciones
    ventas/               Ventas, líneas, confirmación y cuentas
    deudores/             Padrón de personas, deuda por persona y cobranza
    gastos/               Registro de gastos con resumen por tipo y período
    simulador/            Simulador de costos y calculadora de ingredientes
    solicitudes/          Pedidos que entran desde la cuenta del usuario
  lib/                    Clientes, helpers y utilidades transversales
    supabase.ts           El cliente; database.types.ts son los tipos generados
  pages/                  Componentes de pantalla asociados a una ruta
  main.tsx                Punto de entrada
  index.css               Estilos globales
```

Las pantallas ruteadas viven en `src/pages/`. Cuando una pantalla crezca hasta
tener lógica y componentes propios, esos se van a `src/features/<dominio>/` y la
página queda como el punto de entrada delgado de la ruta.

Hay un alias `@/` que apunta a `src/` (configurado en `vite.config.ts` y
`tsconfig.app.json`), así que los imports son `@/components/...` y no `../../`.

## Base de datos

Las migraciones están en `supabase/migrations/` y se aplican con:

```bash
npx supabase db push --linked
```

Para consultar o aplicar SQL sin la password de la base, `scripts/sql.sh` va por
la Management API con el token de `.env` (`SUPABASE_ACCESS_TOKEN_GG2`):

```bash
./scripts/sql.sh "select count(*) from insumos;"
./scripts/sql.sh -f supabase/migrations/20260911140000_lote_planificar_variante.sql
```

Ojo con una diferencia: `db push` registra lo aplicado en
`supabase_migrations.schema_migrations` y el script no. Si aplicás una migración
por ahí, insertá su `version` a mano o el CLI va a querer volver a aplicarla.

`supabase/seed.sql` tiene datos de prueba (el Shampoo Café real de `CONTEXT.md` §3.1 más
artefactos sintéticos para los casos de borde) y **solo se aplica en local**, con
`npx supabase db reset`. La base remota se deja vacía para que se carguen los datos reales.

### El primer admin

El alta es abierta: cualquiera se crea la cuenta desde la app y entra como `usuario`.
Lo que **no** se puede hacer desde adentro en una base nueva es ascender al primero,
porque cambiar un rol requiere ya ser admin y `es_admin()` lee una tabla vacía. Es un
único paso manual de instalación:

```sql
update perfiles set rol = 'admin'
where id = (select id from auth.users where email = '<tu email>');
```

El procedimiento completo —incluida la variante de crear la cuenta entera a mano, con la
trampa de las columnas de token de GoTrue— está en `docs/MODELO.md`, sección "Arranque:
el primer admin". Después de eso, los roles se reparten desde el padrón, en Personas.

## Deploy en Vercel

El proyecto ya trae `vercel.json` con el framework preset de Vite, el build
command, el output a `dist/` y el rewrite de SPA para que las rutas de React
Router funcionen en refresh y deep links.

Para deployar: importá el repo en Vercel (detecta la config sola) o corré
`vercel` con la CLI. Si la app usa variables `VITE_*`, cargalas en
Settings → Environment Variables del proyecto en Vercel.

## Estado

El admin abre en un **Inicio** —pedidos sin responder, ventas en borrador, deuda
del padrón y cómo viene el mes, cada cifra linkeada a la pantalla donde se
toca— y tiene sus nueve áreas construidas:

- **Insumos** — catálogo, precios con historial, proveedores y MP intermedias.
- **Productos** — productos, tamaños, fórmulas con las dos variantes de marca y
  precios de venta.
- **Lotes** — planificación del consumo desde la fórmula, cierre con congelado
  de costos y parámetros, y el costo unitario real de lo que efectivamente salió.
- **Stock** — stock de productos por ubicación y de insumos, el libro de
  movimientos, traslados y recuentos físicos con ajuste por diferencia.
- **Ventas** — los dos flujos (directa y entrega para reventa), borrador con
  líneas, confirmación que congela importes y descuenta stock, cuentas, y la
  bandeja de **pedidos**: lo que la gente pide desde su cuenta, con la opción de
  convertirlo en una venta en borrador de un click.
- **Deudores** — quién debe cuánto y los pagos con imputación FIFO corregible a
  mano.
- **Personas** — el padrón de clientes, revendedoras y productoras, y el reparto
  de **roles**: el alta es abierta (cualquiera se crea la cuenta y entra como
  usuario) y acá es donde un admin decide quién es qué.
- **Gastos** — registro con resumen por tipo y por período. Si el gasto es la
  compra de un insumo, entra al stock en el mismo acto sin pisar el precio de
  lista.
- **Simulador** — costo de un tamaño con precios hipotéticos que no se guardan,
  y la calculadora de ingredientes contra el stock actual.

El front del usuario normal tiene su propio sistema visual —“noche eléctrica”,
documentado en `docs/DISENIO-USUARIO.md`— y muestra el catálogo con el precio que
le corresponde a cada persona, lo que debe, y el pedido de materia prima. Los dos
pedidos que puede hacer
—producto y materia prima— aterrizan en la bandeja del admin, con la marca de
cuántos esperan respuesta en la barra lateral.

Todavía no hay tests.
