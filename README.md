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
public/                   Assets estáticos servidos tal cual
src/
  app/                    Composición de la app: providers, router, theme
    App.tsx               MantineProvider + RouterProvider
    router.tsx            Definición de rutas (createBrowserRouter)
    theme.ts              Theme de Mantine
  components/             UI compartida entre features
    ui/                   El sistema de diseño: Tabla, Numero, Formulario, …
    layout/AppLayout.tsx  Shell del usuario normal (mobile-first)
    layout/AdminLayout.tsx Shell del admin: barra lateral con las ocho áreas
  features/               Módulos de dominio
    insumos/              Insumos, precios, proveedores y MP intermedias
  lib/                    Clientes, helpers y utilidades transversales
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

`supabase/seed.sql` tiene datos de prueba (el Shampoo Café real de `CONTEXT.md` §3.1 más
artefactos sintéticos para los casos de borde) y **solo se aplica en local**, con
`npx supabase db reset`. La base remota se deja vacía para que se carguen los datos reales.

### El primer admin

En una base nueva **no hay forma de crear el primer admin desde la app**: crear un perfil
y crear una invitación requieren ya ser admin, y `es_admin()` lee una tabla vacía. Es
intencional (§10 pide alta por invitación, no registro abierto), pero implica un paso
manual de instalación, una única vez. El procedimiento completo, con la trampa de las
columnas de token de GoTrue, está en `docs/MODELO.md`, sección "Arranque: el primer admin".

Después de eso, el admin invita al resto desde la app.

## Deploy en Vercel

El proyecto ya trae `vercel.json` con el framework preset de Vite, el build
command, el output a `dist/` y el rewrite de SPA para que las rutas de React
Router funcionen en refresh y deep links.

Para deployar: importá el repo en Vercel (detecta la config sola) o corré
`vercel` con la CLI. Si la app usa variables `VITE_*`, cargalas en
Settings → Environment Variables del proyecto en Vercel.

## Todavía no está conectado

- Sin backend / Supabase: se conecta más adelante.
- Sin capa de datos ni modelo de dominio.
- Sin tests.
