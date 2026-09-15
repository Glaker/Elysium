# Sistema de diseño — front del usuario

> El otro front. La implementación vive en `src/index.css` (bloque `.usuario`),
> `src/components/layout/AppLayout.tsx` y `src/pages/`.
> El admin tiene el suyo, distinto y separado: `docs/DISENIO.md`.
> **Última actualización:** 2026-09-14

---

## 0. Contexto de uso

Una estudiante que produce lotes, o alguien que revende, parada en cualquier
lado con el teléfono en la mano. Entra a responderse cuatro preguntas y se va:

1. **¿Cuánto debo?**
2. **¿A cuánto me sale cada cosa?**
3. **¿Cuánto insumo pido para fabricar X?**
4. **¿Qué pasó con lo que pedí?**

La cuarta es la que tiene pantalla propia: el **Inicio**, que es donde cae quien
entra. No repite la deuda —esa vive en la banda del shell, arriba de todas las
vistas— sino que dice el estado de los últimos pedidos y por dónde seguir. Si
alguna vez crece a un tablero, dejó de ser una app para responder preguntas.

Es lo opuesto al admin, que es escritorio, denso y de sesiones largas. Acá:
**una respuesta por pantalla, el pulgar como único dedo, y nada que haya que
aprender.** Mobile-first de verdad, pero no mobile-only: abajo de 992px es esa
columna de 520px, y arriba de ese ancho el shell pasa a barra lateral fija más
encabezado, como el admin. Un menú de dos ítems centrado en una columna angosta
en un monitor de 27" se ve como un teléfono agrandado; la barra usa el espacio
que ya está y deja la navegación siempre a la vista. Cambia el shell, no el
sistema: mismas secciones, mismo encabezado, misma banda de deuda arriba, y las
listas siguen siendo listas (en una columna de 700px).

---

## 1. Color — "noche eléctrica"

La identidad sale del logo, no de una paleta inventada: el matraz es violeta
`#863bff` con el contenido en cian. De ahí salen los dos roles.

| Token                   | Valor     | Qué es                                                         |
| ----------------------- | --------- | -------------------------------------------------------------- |
| `--ely-fondo`           | `#17141f` | Negro con tinte violeta. El fondo de todo.                     |
| `--ely-superficie`      | `#221d2d` | Campos de formulario.                                          |
| `--ely-superficie-alta` | `#282235` | La tarjeta de deuda, lo único elevado.                         |
| `--ely-borde`           | `#443a52` | Borde de campo y de tarjeta.                                   |
| `--ely-borde-tenue`     | `#2e2839` | El separador entre filas de una lista.                         |
| `--ely-texto`           | `#f4f2f9` | Texto principal.                                               |
| `--ely-texto-2`         | `#aea8bd` | Secundario: el tamaño de un producto, el nombre de quien mira. |
| `--ely-texto-3`         | `#8d8799` | Terciario: rótulos y notas al pie.                             |
| `--ely-violeta`         | `#863bff` | **Identidad y atmósfera. Nunca una acción.**                   |
| `cian.4` (del theme)    | `#3ac7f8` | **El único color de acción**, y el color del precio.           |
| `advertencia` (ámbar)   | —         | La deuda y "sin precio": lo que espera algo de la persona.     |
| `exito` (verde)         | —         | Solo el "Pedido" recién hecho. Nunca un estado permanente.     |

Las reglas, que son las mismas del admin aplicadas a otra piel:

- **Cian es acción y es precio.** El precio es cian porque es el número que se
  viene a buscar y porque es lo que se toca al lado.
- **El violeta no se clickea nunca.** Vive en el matraz y en el halo del fondo.
- **Ámbar es lo que te espera, no lo que está roto.** Una deuda no es un error.
- **Un solo halo por pantalla.** Es lo único que queda de un degradado: un foco
  de luz violeta detrás del encabezado, colgado del contenedor para que en
  desktop siga al contenido en vez de quedarse en la esquina. Dos halos ya es
  decoración.

---

## 2. Tipografía

Dos familias, cargadas en `index.html`:

| Familia                 | Dónde                                                           |
| ----------------------- | --------------------------------------------------------------- |
| **Bricolage Grotesque** | Cifras y la marca. Es la clase `.display`.                      |
| **Instrument Sans**     | Todo el texto. Es `--mantine-font-family` dentro de `.usuario`. |

`.display` ya trae `tabular-nums`: una columna de precios tiene que alinear. La
regla vale igual que en el admin — toda cifra es tabular, sin excepción.

`.rotulo` es el encabezado de sección: 11px, `600`, `0.12em` de tracking, en
mayúsculas, gris terciario. Reemplaza al `<label>` gritado.

**El scope es `.usuario`.** Todo esto cuelga de esa clase, que la pone el shell
del front del usuario, y por eso el admin no cambia ni un pixel. Pisar
`--mantine-font-family` ahí adentro alcanza para que los componentes de Mantine
(botones, inputs) tomen la tipografía nueva sin tocar el theme global.

---

## 3. Listas, no tarjetas

Un catálogo son **filas separadas por una línea de 1px**, no tarjetas grises.

El motivo es la pregunta que se viene a responder: "cuánto sale cada uno" se
contesta comparando una columna de precios alineados de un vistazo. Cinco
tarjetas se leen de a una, y el relleno gris pesa más que los datos.

La anatomía de una fila, de izquierda a derecha:

| Parte  | Tratamiento                                                        |
| ------ | ------------------------------------------------------------------ |
| Nombre | 15px, `600`. **Es lo único que cede**: `lineClamp`, `minWidth: 0`. |
| Tamaño | 12px, gris secundario, debajo del nombre.                          |
| Precio | `.display` 20px en cian. El elemento más fuerte de la fila.        |
| Acción | Botón fantasma: borde, sin relleno. `flexShrink: 0`.               |

**El botón de fila es fantasma a propósito.** Cinco botones cian seguidos
gritan todos a la vez y ninguno se escucha; el borde alcanza para que se lea
como algo que se toca. El botón lleno se reserva para la única acción
importante de una pantalla ("Solicitar esta materia prima").

Sin precio se muestra `—` y un "Sin precio" en ámbar, y la acción queda
apagada. **Nunca un cero donde no se sabe el valor** — es la misma regla que el
admin (`docs/DISENIO.md` §4), por el mismo motivo.

---

## 4. La deuda va arriba y abierta

Es uno de los dos motivos por los que la cuenta existe (`CONTEXT.md` §10), así
que está arriba de todo, en la única superficie elevada de la app, y **con el
detalle desplegado**: son dos o tres líneas, y esconderlas detrás de un toque
convertía la respuesta en otra pregunta.

Si no debe nada, **no ocupa lugar**. No hay un "estás al día" en verde: el
verde es para lo que acabás de hacer.

---

## 5. Controles

- **Hit target de 44px para abajo, nunca.** Es un teléfono.
- Los campos son cajas oscuras de 12px de radio, 48-50px de alto, con el rótulo
  arriba en `.rotulo`.
- Cantidades: **dos botones de − y +**, no un campo de texto. El número se
  ajusta de a tandas con el pulgar, y abrir el teclado numérico para pasar de
  200 a 250 es más trabajo del que vale.
- Navegación en teléfono: **dos subrayados**, no un `SegmentedControl`. Son dos
  vistas de lo mismo, no un control con un valor elegido, y la pastilla gris
  competía con el único botón que importa en cada fila. En pc son los ítems de
  la barra lateral, con el activo en cian —el color de lo que se toca— y nunca
  en violeta, que acá es solo identidad. **Materia prima solo aparece si la
  persona es productora** (o es admin): quien no fabrica lotes no ve la receta, y
  la puerta de verdad está en la base (`MODELO.md` §5).

---

## 5b. El arranque

Una sola pantalla de carga —la marca latiendo sobre el fondo— mientras se
resuelven sesión, perfil, persona y deuda. Antes eran tres saltos encadenados: un
spinner gris, después el shell vacío, después el contenido acomodándose.

Dos reglas la hacen funcionar:

- **Aparece recién a los 150ms.** Si los datos llegan antes, nunca se ve. Un
  splash que parpadea 80ms molesta más que el salto que vino a evitar.
- **La deuda se pide en el arranque**, no dentro de su banda: si llegara después
  aparecería arriba de todo y empujaría la pantalla entera hacia abajo, justo
  cuando la persona empezó a leerla.

Lo que sigue cargando adentro (el catálogo) usa esqueleto, y **el esqueleto mide
exactamente lo que va a medir el contenido**. Un esqueleto que no coincide con lo
que reemplaza es un salto anunciado.

---

## 6. La marca

La gota violeta–cian de `public/logo-256.png` (la misma que el favicon). De ahí
salen los dos colores de todo este sistema.

En React es `<Logo>` (`src/components/Logo.tsx`), que **sirve ese mismo archivo**
en vez de redibujarlo: el original tiene degradados que no tiene sentido
mantener duplicados, y así el logo de la app y el de la pestaña no se pueden
separar nunca. Cambiar el dibujo es cambiar esos archivos, y nada más.

---

## 7. Qué evitar

- Tarjetas para una lista de datos.
- Un segundo halo, o cualquier degradado que pinte una superficie.
- Violeta en algo que se toca.
- Verde para un estado permanente.
- Un `0` donde no se sabe el valor.
- Emoji. El logo y los íconos son dibujo, no glifo.
