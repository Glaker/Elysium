# Sistema de diseño — front de administración

> Qué componente usar para qué, y por qué. La implementación vive en
> `src/app/theme.ts` y `src/components/ui/`.
> El área de **insumos y precios** (`src/features/insumos/`) es la implementación
> de referencia: si algo de acá no queda claro, mirá cómo se usa ahí.
> **Última actualización:** 2026-09-05

---

## 0. Contexto de uso

Johanna, en escritorio, sesiones largas, cargando y revisando datos.

Es lo opuesto al front del usuario normal (`src/pages/`, `AppLayout`), que es
mobile-first y de lectura rápida. Acá: **densidad sobre aire, tablas sobre cards,
teclado sobre tap.** No es mobile-first; que no se rompa en tablet alcanza.

Las dos apps comparten el theme y el color de acento, y nada más.

---

## 1. Color

Todo sale del theme. **Ninguna pantalla escribe un color literal**, ni un
`#hex` ni `color="yellow"`.

| Nombre en el theme | Qué es                   | Dónde va                                                                    |
| ------------------ | ------------------------ | --------------------------------------------------------------------------- |
| `cian` (primario)  | El único color de acción | Botones primarios, enlaces, foco.                                           |
| `violeta`          | Identidad                | Badge de "Administración", ítem activo de la barra lateral. Nunca un botón. |
| `noche`            | Fondos                   | Barra lateral (`noche.8`), fila seleccionada, hover (`noche.7`).            |
| `advertencia`      | Ámbar                    | Costo incompleto, precio vencido a 30 días, fórmula que no suma 100.        |
| `error`            | Rojo                     | Stock negativo, ciclo en la composición.                                    |
| `exito`            | Verde                    | Confirmación puntual de una acción. **Nunca un estado permanente.**         |
| `gray` / `dark`    | Grises                   | Todo lo demás.                                                              |

Reglas que no se negocian:

- **Cian es acción, violeta es identidad.** El violeta sobre fondo oscuro
  contrasta peor y está más cerca de los estados semánticos; por eso el que se
  clickea es el cian.
- **Sin degradados en la UI.** Quedan para el logo y el login.
- **Fuera de esos tres estados, nada lleva color.** Un badge que clasifica
  (tipo de insumo, "Producido", "Inactivo") va en gris. Si todo tiene color,
  el color no dice nada.
- El verde marca que _acabás de hacer algo_, no que algo _está bien_. Un precio
  al día no es verde: es negro con la fecha en gris.

---

## 2. Tipografía

La del sistema para texto. Y una regla de la que depende que una tabla se pueda
leer:

> **Números tabulares (`font-variant-numeric: tabular-nums`) en toda cifra, sin
> excepción.**

Está cubierta en tres capas y no hace falta pensarla:

1. `Table` la trae del theme (`tabularNums: true`).
2. `index.css` la aplica a inputs numéricos y de fecha, y a la clase `.tabular`.
3. `<Numero>` la aplica al texto que renderiza.

Si escribís una cifra fuera de esos tres caminos, ponele `className="tabular"`.

---

## 3. Los cuatro números

Costo s/etiqueta, costo c/etiqueta, precio recomendado y precio de venta se
parecen y significan cosas distintas.

> **Nunca aparecen los cuatro sueltos en una fila.**

| Número                   | Cómo se muestra                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Precio de venta          | Número principal: tamaño mayor, peso alto.                                         |
| Precio recomendado       | Al lado, más chico, en gris, como referencia.                                      |
| Costo s/ y c/etiqueta    | Panel de detalle o popover. **Nunca al mismo nivel visual que los precios.**       |
| Desvío venta/recomendado | Indicador chico al lado del recomendado. Es información, no alarma: no va en rojo. |

Todavía no hay componente para esto porque el área de precios de producto no
está construida. Cuando se construya, sale un `<ParPrecio>` de acá, y esta tabla
es su especificación.

---

## 4. Datos incompletos

Atraviesa toda la app y tiene **una sola representación**:
`<DatoIncompleto>` — una raya gris, un ícono ámbar, y un tooltip que dice qué
falta.

```tsx
<DatoIncompleto titulo="Costo incompleto" faltantes={['SCI (sin precio)']} />
// → —⚠  con tooltip "Costo incompleto: SCI (sin precio)"
```

**Un valor desconocido nunca se muestra como cero ni como raya suelta.** Esto no
es cosmético: el backend entero está construido para propagar desconocidos en vez
de anularlos (`MODELO.md` §3 — no hay un solo `COALESCE(precio, 0)` en el
cálculo). La UI tiene que respetarlo o le miente a Johanna sobre su margen.

En la práctica no lo llamás casi nunca a mano: `<Numero valor={null}>` ya cae
en `DatoIncompleto`.

```tsx
<Numero
  valor={costo.costo} // null => sale DatoIncompleto
  formato={(n) => importe(n, 'ARS')}
  sufijo="/ kg"
  titulo="Costo incompleto"
  faltantes={costo.faltantes} // el detalle del tooltip
  tono={esCiclo(costo.faltantes) ? 'error' : 'advertencia'}
/>
```

**Incompleto vs. roto.** Falta un precio → ámbar, se arregla cargándolo. Hay un
ciclo en la composición → rojo, está mal modelado. `esCiclo()` distingue los dos
a partir de lo que devuelve `costo_insumo`.

---

## 5. Tablas

`<Tabla>` es el componente central del admin. Trae de fábrica lo que ninguna
tabla debería reimplementar: búsqueda por texto (`/` enfoca el buscador),
ordenamiento por columna, encabezado fijo al scrollear, estado vacío con la
acción para cargar el primero, y skeleton mientras carga.

```tsx
const columnas: Columna<Insumo>[] = [
  { clave: 'nombre', titulo: 'Insumo', orden: (i) => i.nombre, render: (i) => … },
  { clave: 'precio', titulo: 'Precio vigente', numerica: true, ancho: 190,
    orden: precioComparable, render: (i) => <PrecioVigente insumo={i} /> },
];

<Tabla
  filas={filas}
  idDe={(i) => i.id}
  columnas={columnas}
  cargando={cargando}
  textoBusqueda={(i) => `${i.nombre} ${i.proveedor ?? ''}`}
  onFila={(i) => navigate(`/admin/insumos/${i.id}`)}
  filtros={<Select … />}
  vacio={{ titulo: …, descripcion: …, accion: <Button>Cargar el primero</Button> }}
  acciones={(i) => <Menu>…</Menu>}
/>
```

- `numerica: true` alinea a la derecha. **Toda columna de cifras la lleva**;
  el texto va a la izquierda.
- Sin `orden`, la columna no se puede ordenar. Lo desconocido va siempre al
  final, ordene como ordene la columna.
- Sin `textoBusqueda`, no hay buscador.
- **Filtros solo donde hagan falta de verdad.** El de insumos ("todos / sin
  precio / vencidos / al día") existe porque es el trabajo que Johanna va a
  hacer ahí; no repliques un filtro por columna porque sí.
- **Acciones de fila:** un ícono al final si son una o dos, un `Menu` si son
  más. Nunca botones anchos que compitan con los datos.
- **Skeleton, no spinner.** El skeleton conserva la forma de la tabla y no hace
  saltar el layout cuando llegan los datos.

---

## 6. Formularios

`<Formulario>` — **una columna**, etiquetas arriba del campo, guardar fijo abajo
siempre visible, y aviso antes de salir con cambios sin guardar (por navegación
y por cerrar la pestaña).

`<Formulario.Seccion>` agrupa con título; se usa cuando el formulario pasa de
ocho campos.

`useFormulario` maneja el estado y hace cumplir la regla que más se nota:

> **La validación corre al salir del campo, no al tipear.**

Validar mientras se escribe es hostil en un formulario largo: el error aparece
cuando escribiste la primera letra y todavía no terminaste de pensar. El
validador corre siempre (para saber si el formulario está válido), pero el error
de un campo se hace visible cuando ese campo ya se tocó, o cuando se intentó
guardar.

```tsx
const f = useFormulario<Valores>(VACIO, (v) => ({
  nombre: v.nombre.trim() ? undefined : 'El insumo necesita un nombre.',
}));

<TextInput label="Nombre" withAsterisk {...f.texto('nombre')} />   // texto
<Select value={f.valores.tipo} onChange={…} {...f.campo('tipo')} /> // el resto
```

`f.sucio` alimenta el guardar (deshabilitado si no hay cambios) y el aviso al
salir. Al guardar, `f.reiniciar(valores)` vuelve a marcar limpio.

**Campos numéricos:** `<CampoNumerico>`, con la unidad como sufijo **dentro**
del campo (`75 g`, `$ 25.299`), no como texto al lado.

---

## 7. Navegación

Barra lateral fija con las ocho áreas. Colapsa a íconos abajo de 1080px. **Las
siete no implementadas quedan visibles y deshabilitadas**: que se vea el mapa
completo del sistema es información, no ruido.

**Cada área es una ruta, y cada subsección también.** No hay tabs anidados en
ningún lado: proveedores es `/admin/insumos/proveedores`, no una pestaña dentro
de insumos. La ficha de un insumo es `/admin/insumos/:id`, y su edición es otra
ruta más.

`<Pagina>` es el encabezado común: título, descripción, link de vuelta y
acciones a la derecha.

---

## 8. Modales

Un modal es para un formulario **corto** (hasta unos cinco campos): cargar un
precio, dar de alta un proveedor. Un formulario largo va a su propia ruta.

Los modales del sistema se **montan al abrirse** (`{abierto && <Modal…>}`) en
vez de recibir `opened`. Así el estado inicial sale de las props y no hay un
efecto sincronizando el formulario con lo que cambió afuera.

---

## 9. Monedas y unidades

Dos reglas que salieron de construir insumos y valen para todas las áreas:

- **Se muestra en la moneda en la que está cargado, se ordena en pesos.** Un
  precio en dólares se guarda en dólares (`MODELO.md` §Insumos), así que se
  muestra `US$ 48,50`. Pero una columna que mezcla monedas no se puede ordenar
  por el número escrito: `US$ 48,50` caería debajo de `$ 8.500`. Por eso el
  ordenamiento usa el equivalente en pesos al tipo de cambio vigente, y ese
  equivalente va en el tooltip: si el orden se calcula con un número que no
  está a la vista, el orden parece roto.
- **La unidad va pegada al número, en gris y más chica.** `$ 25.299,00 / kg`,
  `300 g`. Nunca en el encabezado de la columna solamente: las filas pueden
  tener unidades distintas.

---

## 10. Qué evitar

- Cards para listas de datos. Eso es el front del usuario, no este.
- Modales para formularios largos.
- Gráficos decorativos.
- Íconos sin etiqueta en acciones destructivas.
- Colores literales en las pantallas.
- Un `0` donde no se sabe el valor.

---

## 11. Inventario de componentes

| Componente           | Archivo                             | Para qué                                                  |
| -------------------- | ----------------------------------- | --------------------------------------------------------- |
| `Tabla`, `Columna`   | `components/ui/Tabla.tsx`           | Toda lista de datos del admin.                            |
| `Numero`             | `components/ui/Numero.tsx`          | Toda cifra. Tabular, y desconocido → `DatoIncompleto`.    |
| `CeldaNumero`        | `components/ui/Numero.tsx`          | Celda de cifra fuera de `Tabla` (alineada a la derecha).  |
| `DatoIncompleto`     | `components/ui/DatoIncompleto.tsx`  | La única representación de un valor desconocido.          |
| `BadgeEstado`        | `components/ui/BadgeEstado.tsx`     | Estado o clasificación, con los cuatro tonos del sistema. |
| `Formulario`         | `components/ui/Formulario.tsx`      | Layout de formulario + barra de guardar + aviso al salir. |
| `Formulario.Seccion` | `components/ui/Formulario.tsx`      | Agrupar campos con título.                                |
| `CampoNumerico`      | `components/ui/CampoNumerico.tsx`   | Campo numérico con unidad adentro.                        |
| `Pagina`             | `components/ui/Pagina.tsx`          | Encabezado de pantalla.                                   |
| `AdminLayout`        | `components/layout/AdminLayout.tsx` | Shell del admin: barra lateral + header.                  |
| `useFormulario`      | `lib/useFormulario.ts`              | Estado de formulario con validación al salir del campo.   |
| `formato.ts`         | `lib/formato.ts`                    | `importe`, `plata`, `cantidad`, `fecha`, `diasDesde`.     |
