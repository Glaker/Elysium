# Modelo de datos Elysium

Qué representa cada tabla, por qué está así, qué se guarda y qué se calcula.
Complementa `CONTEXT.md`, que es la fuente de verdad sobre el negocio.

---

## 0. Los dos ejes

**Dato vivo vs. hecho congelado.** Hay dos costos y no son el mismo número. El
**costo teórico** se calcula al vuelo con la lista de precios de hoy: alimenta el
precio recomendado y se mueve cuando sube el SCI. El **costo real de un lote** se
congela al cerrarlo y no se toca nunca más. Igual con los precios: el precio de
venta del producto es vivo, el importe de una línea de venta es histórico.

**Lo que se guarda vs. lo que se calcula.** Se guardan hechos: compré, produje,
vendí, cobré. Se calculan agregados: stock, costo, deuda, margen, precio
recomendado. Ningún agregado tiene columna. Por eso no existe `stock`, ni
`saldo`, ni `costo_actual` como campo en ninguna tabla.

---

## 1. Convención de unidades

Atraviesa todo el esquema y es la fuente de error más probable si se ignora.

- El **precio** de un insumo se carga en su unidad de compra: `kg`, `l`, `unidad`.
- **Todas las cantidades** — fórmulas, composición, movimientos, gastos, rinde —
  se expresan en la **unidad chica**: `g` para insumos por kg, `ml` para insumos
  por l, `unidad` para unitarios.
- `costo_insumo()` devuelve el costo **por unidad chica**, así el `÷1000` de
  §3.1 de CONTEXT ocurre una sola vez, dentro de `factor_unidad()`.

---

## 2. Tablas

### Identidad

| Tabla          | Qué es                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `perfiles`     | Una fila por cuenta. `id` = `auth.users.id`. El RLS lee el rol de acá. |
| `personas`     | Con quién hace negocio Elysium. `perfil_id` opcional.                  |
| `invitaciones` | Alta por link (§10), no registro abierto.                              |

El token de una invitación lo genera `crear_invitacion()` en la base y no el
navegador: es la única credencial del alta, y dejarla del lado del cliente haría
que la calidad del secreto dependa de qué navegador la pidió. Son dos uuid v4
pegados —244 bits del mismo generador que ya firma todas las claves primarias—
para no depender de `pgcrypto`. Una invitación **no tiene columna de estado**:
"usada" y "vencida" se deducen de `usada_en` y `expira_en`, porque una fila que
diga "pendiente" cuando ya venció es peor que no tener la columna.

`personas` está separada de `perfiles` a propósito: un deudor puede no tener
cuenta nunca, y una venta se puede cargar a nombre de alguien que no se registró.
Si fueran una sola tabla habría que crear cuentas fantasma para poder registrar
una deuda. Todo lo comercial apunta a `personas`; solo el RLS mira `perfiles`.

`personas.es_revendedor` y `personas.es_productor` son **acumulables**: el mismo
estudiante puede fabricar lotes y además llevarse producto para revender, que es
exactamente el caso que describe §10. Un enum de valor único obligaba a duplicar
esa persona, y entonces su deuda quedaba partida en dos fichas.

Se eligieron dos booleanos y no un array de enum ni una tabla de roles: son dos
hechos ortogonales, estables y conocidos de antemano — no una lista que Johanna
administre. Una tabla normalizaría algo que no varía y metería un join en el
camino caliente (la resolución de precio corre por cada fila del catálogo, en cada
carga de la app); un array obligaría a GIN y a operadores de contención para
preguntas que con un booleano son `where es_revendedor`. "cliente" desapareció
como valor porque no es un rol: es el estado por defecto de cualquiera.

**Precedencia de precio:** si `es_revendedor`, el catálogo muestra el costo; si no,
el precio de venta. Ser productor no influye. Cuando alguien es las dos cosas gana
revendedor, porque el vínculo de reventa es el que define las condiciones
comerciales (§2). Y esto importa poco, porque **el precio del catálogo es
indicativo**: el importe que obliga se congela en la línea de venta según
`ventas.tipo`, que Johanna elige por transacción. La ambigüedad de una persona con
dos roles se resuelve en el hecho, no en la ficha.

### Parámetros

`parametros` + `parametro_valores`. Valor hora, merma, regalías, margen, tipo de
cambio, energía. Con `vigente_desde`: el valor de hoy es la fila más reciente, el
del 12/03 es la vigente ese día. Es §14.4 y lo que saca el `=960000/160` de
adentro de las fórmulas.

`margen_pct` está **sin valor a propósito**: CONTEXT define la fórmula del precio
recomendado pero nunca dice cuánto es el margen. `precio_recomendado()` devuelve
incompleto hasta que se cargue.

### Insumos

| Tabla            | Qué es                                                       |
| ---------------- | ------------------------------------------------------------ |
| `proveedores`    | Nombre, link (requisito explícito de §5), contacto.          |
| `insumos`        | Catálogo unificado: MP, envases, etiquetas, packaging.       |
| `insumo_precios` | Historial de precios. Cada fila es también una verificación. |

`insumos.origen` (`comprado` / `producido`) reemplaza el truco del proveedor
`PRODUCCIÓN CIAB` de §4. Un insumo `producido` es una MP intermedia y tiene
composición propia y `rinde_cantidad`.

`insumos.tipo` no es cosmético: marcar la etiqueta permite calcular _costo
s/etiqueta_ y _costo c/etiqueta_ como dos totales del mismo cálculo, filtrando
por esa marca, en vez de mantener dos fórmulas paralelas.

**Un insumo sin precio no tiene fila de precio.** No tiene precio cero. Es la
diferencia entre "no sé cuánto sale" y "sale nada", y es la base de toda la
tolerancia a datos incompletos que pide §4. La alerta de 30 días de §5 sale sola:
es `max(verificado_en)`.

Los precios en dólares se guardan **en dólares**; la conversión ocurre en el
cálculo con el `tipo_cambio_usd` vigente a la fecha pedida. Guardar el peso
derivado sería un dato vivo disfrazado de hecho.

### Productos

| Tabla            | Qué es                                               |
| ---------------- | ---------------------------------------------------- |
| `lineas_negocio` | Bálsamos, Repelentes, Cosmética resto, Aceites (§8). |
| `productos`      | Nombre, línea, margen propio opcional.               |
| `tamanos`        | **La unidad real del sistema.**                      |
| `tamano_precios` | Precio de venta con historial, por variante.         |

**Un tamaño es lo que se stockea, se vende y tiene precio.** Todo movimiento y
toda línea de venta apuntan a `tamano_id`, nunca a `producto_id`. El producto es
el agrupador de catálogo; el tamaño es el SKU. Esto resuelve la contradicción
entre §7.1 ("precio por producto") y §3 (el costo se calcula por tamaño): el
costo de un shampoo de 75 g no es el de uno de 150 g, así que el precio tampoco
puede serlo.

El **precio recomendado no se guarda**: §7.1 dice que se calcula siempre y que
Johanna no lo edita. Es una función.

### Composición y el grafo recursivo

| Tabla                | Qué es                                          |
| -------------------- | ----------------------------------------------- |
| `formula_lineas`     | Receta de un tamaño: `tamano → insumo`.         |
| `insumo_composicion` | Receta de una MP intermedia: `insumo → insumo`. |

`formula_lineas.modo` distingue `porcentaje` (SCI al 30% de 75 g) de
`cantidad_fija` (1 etiqueta, 1 envase). Un envase no es un porcentaje del
contenido.

Los porcentajes **no** tienen restricción de sumar 100: §3.1 documenta el Shampoo
Café al 101% y aclara que no es error de tipeo. `v_formula_control` marca las que
no cierran; la base las acepta.

Son dos tablas y no una con padre polimórfico porque los dos niveles tienen
semántica distinta — uno es porcentual sobre un tamaño, el otro es cantidad
absoluta sobre un rinde — y separarlos permite claves foráneas reales en ambas en
vez de una columna `tipo_padre` sin integridad referencial.

**La recursión vive del lado de los insumos.** Un tamaño es siempre la entrada al
árbol, nunca un nodo intermedio: un producto terminado no es ingrediente de otro
producto. De ahí para abajo, `insumo_composicion` se recorre hasta llegar a
insumos comprados, con la profundidad que haga falta.

### Producción

| Tabla           | Qué es                                           |
| --------------- | ------------------------------------------------ |
| `lotes`         | Destino dual: un tamaño **o** una MP intermedia. |
| `lote_insumos`  | Qué consumió, con costo congelado al cierre.     |
| `lote_personas` | Quién trabajó, cuánto y cuánto cobró (§3.3).     |

`lotes` tiene `tamano_id` e `insumo_producido_id`, ambos anulables, con
restricción de exclusividad: la tanda de resina también es una producción, y
duplicar toda la maquinaria de lotes en dos tablas paralelas no aportaba nada.

`unidades_planificadas` significa distinto según el destino: para un tamaño son
unidades; para una MP intermedia es **cantidad a producir en unidad chica** (ml de
resina), no cantidad de tandas.

**Las fórmulas no se versionan.** `lote_insumos` registra lo que efectivamente se
consumió, con cantidad y costo congelados. Eso es más fuerte que una versión de
receta, porque registra lo que pasó y no lo que la receta decía que debía pasar.

**El resultado decide cuántas unidades entran, no cuánto costó.** En los tres
casos los insumos se consumieron. `ok` entra todo; `descarte` no entra nada y la
pérdida queda registrada con su costo; `reproceso` entra lo recuperado. El costo
unitario real es `costo total ÷ unidades obtenidas`, y por eso un reprocesado sale
más caro. Ese cociente es calculado (`v_lote_costo`), no almacenado.

#### DECISIÓN MÍA: las regalías se cobran por unidad que ENTRA AL STOCK

`v_lote_costo` calcula `regalias_aplicado × unidades_obtenidas`. Un descarte, que
obtiene 0 unidades, no paga regalías.

Se ve en los números del lote de prueba: el descarte cuesta $437.056,71 (MP con
merma + envases + etiquetas + mano de obra) y **no** incluye los $300.000 de
$1.500 × 200. El reproceso lo confirma: $437.056,71 + $1.500 × 150 = $662.056,71,
que dividido 150 da los $4.413,71 de costo unitario.

**Nadie respondió esta pregunta.** §1 define las regalías como "cargo fijo por
unidad producida", y "producida" es ambiguo entre _fabricada_ y _que entró al
stock vendible_. Elegí la segunda porque las regalías se pagan a un tercero sobre
producto que se comercializa, y cobrar por lo que se tiró sería inusual.

**Consecuencia si me equivoqué:** si el acuerdo es por unidad fabricada, el costo
de un lote descartado está subestimado en $300.000 — el 41% del costo del lote —
y los descartes parecen mucho más baratos de lo que son. Cambiarlo es una línea en
`v_lote_costo`: `unidades_obtenidas` pasa a `unidades_planificadas`. Está en las
preguntas abiertas de `CONTEXT.md` §15 para que Johanna lo confirme.

### Stock

| Tabla                           | Qué es                                           |
| ------------------------------- | ------------------------------------------------ |
| `ubicaciones`                   | Cajón, Vitrina, Muestras.                        |
| `movimientos_producto`          | Libro de asientos de producto terminado.         |
| `movimientos_insumo`            | Libro de asientos de insumos.                    |
| `recuentos` + `recuento_lineas` | Recuento físico como operación de primera clase. |

**Son inmutables de verdad.** `REVOKE UPDATE, DELETE` + un trigger que aborta.
El revoke solo no alcanza porque el dueño de la tabla puede re-otorgarse
permisos; el trigger cierra esa puerta para cualquier rol, incluido el `postgres`
de la CLI. Un error se corrige con un movimiento de signo contrario, que deja
rastro. Esto es lo que evita el problema de §6, donde las salidas se cargan como
entradas negativas con un comentario que dice "Es salida".

**El stock es una vista** (`v_stock_producto`, `v_stock_insumo`): `SUM(cantidad)`.
No hay columna de stock en ningún lado, así que no hay nada que pisar.

`recuento_lineas.cantidad_teorica` se congela al confirmar, para que la
diferencia siga siendo auditable después. Confirmar emite movimientos de `ajuste`
por la diferencia. La **carga de stock inicial** de §6 es el mismo recuento con
`es_stock_inicial = true`: cambia el tipo de movimiento, no el mecanismo.

El stock negativo se permite y se marca, no se bloquea: el Excel llegó a −81, y
prohibirlo haría imposible registrar un movimiento cargado fuera de orden
cronológico.

### Comercial

| Tabla                              | Qué es                                                        |
| ---------------------------------- | ------------------------------------------------------------- |
| `cuentas`                          | Silvia, Johanna, Martín, Luis + alias de transferencia.       |
| `ventas`                           | `tipo`: `directa` / `entrega_reventa`.                        |
| `venta_lineas`                     | Cantidad + **importe unitario congelado** + `origen_importe`. |
| `pagos`                            | Cobranza.                                                     |
| `pago_imputaciones`                | Resultado del FIFO, **guardado como filas**.                  |
| `gastos`                           | §9 + librería y publicidad.                                   |
| `solicitudes` + `solicitud_lineas` | Pedidos. No son ventas.                                       |

Los dos flujos de §2 conviven en una tabla con discriminador explícito, no
colapsados en columnas distintas como en el Excel.

`venta_lineas.importe_unitario` se congela al confirmar: en venta directa copia el
precio vigente, en entrega para reventa copia el costo c/etiqueta resuelto en ese
momento. **A partir de ahí es un importe, no un costo.** Por eso el revendedor
puede ver el importe de su propia deuda sin que se le abran los costos: sigue sin
poder leer precios de insumo, composición, costos de lote ni el costo de nada que
no se le haya entregado.

**No hay tabla de deudas.** Una deuda no es un hecho que alguien registra: es lo
que queda de restarle a una venta lo que se le imputó. Guardarla sería el mismo
error que §14.1 prohíbe para el stock. Son `v_deuda_venta` y `v_deuda_persona`.

**La imputación FIFO se ejecuta y se guarda.** `imputar_pago_fifo()` recorre las
deudas de la persona de la más vieja a la más nueva. El resultado queda como
filas para que sea auditable a qué venta se aplicó cada peso y se pueda corregir
a mano. Un pago que excede la deuda deja **sobrante sin imputar**
(`v_pago_sobrante`); no inventa una venta.

Un gasto con insumo y cantidad **genera la entrada de stock**: comprar y dar de
alta son el mismo hecho, se registra una vez. Pero **no pisa el precio de lista**:
una compra puntual puede ser a precio atípico, y actualizar la lista en silencio
rompería el costo de todo.

Una **solicitud no es una venta**: no reserva stock, es un aviso que reemplaza el
WhatsApp (§11). Johanna la atiende desde la bandeja de pedidos, y si es un pedido
de producto, `aprobar_solicitud_como_venta()` la convierte en una venta **en
borrador** —nunca en una confirmada— y marca el pedido como resuelto. Las tres
escrituras van en una función y no en el cliente porque o pasan las tres o no
pasa ninguna: una venta sin líneas y un pedido que dice "aprobado" sin nada atrás
es peor que el error.

Borrador y no confirmada por lo mismo que el pedido no reserva: entre que alguien
pide y Johanna atiende pudo pasar cualquier cosa con el stock, y confirmar congela
importes y descuenta mercadería. Esa decisión se toma mirando la venta.

El tipo de venta que se propone sale de `personas.es_revendedor` —quien revende
paga el costo (§2)— pero es solo un default: lo elige quien aprueba, porque el
flujo es por transacción y no por ficha.

---

## 3. El costo recursivo de las MP intermedias

`costo_insumo(insumo, fecha, path)` es recursiva:

- **Insumo comprado** (caso base): el precio vigente a esa fecha, convertido a
  pesos si está en USD, dividido por `factor_unidad()`. Sin fila de precio, el
  resultado es **desconocido**, no cero.
- **Insumo producido**: baja por `insumo_composicion`, resuelve cada componente
  con la misma función, suma, y divide por `rinde_cantidad`.

`costo_tamano(tamano, fecha, merma, variante)` recorre `formula_lineas`, resuelve
cada insumo, y arma la cuenta de §3.1 + §3.2: cantidad de uso por costo, merma
sobre MP, mano de obra (`valor_hora ÷ productividad`), regalías, energía.

Tres propiedades que no son opcionales:

**Los desconocidos se propagan, no se anulan.** Si a un solo insumo le falta el
precio, el costo del producto es `NULL` — y la función devuelve además
`completo: false` y `faltantes: [...]`. Eso es lo que hace posible mostrar el
costo como incompleto **y decir qué le falta**. Un `COALESCE(precio, 0)` sería un
bug silencioso que le miente a Johanna sobre su margen; no aparece en ningún lado
del cálculo.

**Hay detección de ciclos.** La recursión arrastra el camino recorrido y corta al
repetir un nodo, devolviendo `CICLO en la composición: <nombre>` como faltante en
vez de colgar el servidor.

**Teórico y real son funciones distintas.** El teórico usa precios vivos; el real
de un lote se lee de las filas congeladas.

### La merma: dos números distintos

|                         | Qué merma usa                                   |
| ----------------------- | ----------------------------------------------- |
| Costo teórico (pricing) | Merma **esperada**: el parámetro `merma_pct`    |
| Costo real de un lote   | Merma **efectiva**: declarada al cerrar el lote |

`costo_tamano()` toma la esperada por default. El total de §3.2 del Excel
($3.596,53) **no** incluye merma, pero §3.3 se titula "Lo que el Excel no
contempla y sí debería" y pone la merma como primer ítem: validar contra ese
total sería tomar como patrón una referencia que el propio documento marca como
incompleta, y dejaría el precio recomendado calculado sobre un costo que ignora
un 5% de pérdida conocida. El test de paridad con el Excel pasa `p_merma_pct => 0`
explícitamente, y es el único caso donde debería pasarse.

La merma se aplica **solo a materia prima**, en las dos funciones. Un envase no se
evapora, y tener dos definiciones de merma según qué función calcule es peor que
cualquiera de las dos.

---

## 4. Marca blanca

§15 resp. 7 dice "misma fórmula, distinta presentación". Pero si el producto sale
sin etiqueta Elysium y la etiqueta es una línea de fórmula con costo propio, el
cálculo tiene que enterarse o las dos versiones salen al mismo precio.

Se resuelve con `formula_lineas.aplica_a`: `ambas` / `solo_elysium` /
`solo_marca_blanca`. `costo_tamano()` y `precio_recomendado()` reciben la variante
y filtran. `tamano_precios` y `venta_lineas` también la llevan.

Descartadas: producto o tamaño aparte (duplica la receta entera y obliga a editar
dos fórmulas cada vez que cambia un porcentaje — contradice "misma fórmula"); y
un flag solo en la línea de venta (no llega al cálculo, que es el problema).
Marcar la línea deja una sola receta y pone la diferencia donde está en la
realidad: en qué insumos lleva cada versión. Además soporta una etiqueta neutra
distinta, no solo la ausencia de etiqueta.

---

## 5. RLS

La regla es una: **lo que un usuario normal no puede ver, no sale del servidor.**
No hay campos escondidos en el frontend.

`es_admin()` es `SECURITY DEFINER` a propósito: corre como owner y así no dispara
el RLS de `perfiles` sobre sí mismo.

**Solo admin:** `insumo_precios`, `formula_lineas`, `insumo_composicion`,
`proveedores`, `parametros`, `parametro_valores`, `lotes`, `lote_insumos`,
`lote_personas`, `movimientos_producto`, `movimientos_insumo`, `recuentos`,
`recuento_lineas`, `gastos`, `cuentas`.

**Todos los autenticados:** catálogo de `insumos` (nombres, no precios — §11 les
deja solicitar materia prima), `productos`, `tamanos`, `tamano_precios`,
`lineas_negocio`, `ubicaciones`.

**Cada uno lo suyo:** `ventas`, `venta_lineas`, `pagos`, `pago_imputaciones`,
`solicitudes`, `solicitud_lineas` y `personas`, filtrados por
`personas.perfil_id = auth.uid()`.

Con una excepción: **pedir materia prima exige `es_productor`.** Pedir producto
es comprar y no expone nada, así que queda abierto a cualquiera con cuenta; pedir
materia prima viene con la receta adentro, y la receta es el activo del negocio.
`es_productora()` —`SECURITY DEFINER` por lo mismo que `es_admin()`— es lo que
mira la policy de `solicitudes`, y también la calculadora.

Dos trampas técnicas que condicionan el SQL:

1. **Todas las vistas se crean con `security_invoker = true`.** Una vista normal
   en Postgres corre con los permisos de quien la creó, y sería un agujero por
   donde el costo se escapa entero.
2. **El precio recomendado queda del lado admin** aunque parezca un precio: como
   es `costo × (1 + margen)`, publicarlo es publicar el costo con una división de
   por medio.

### Las tres funciones `SECURITY DEFINER` para el usuario normal

Existen porque el RLS es **por fila** y estas necesidades son **por columna**:

- `catalogo_para_usuario()` — devuelve **un** importe por tamaño, resuelto del
  lado del servidor según si la persona es revendedor (paga costo) o no (paga
  precio de venta). Nunca sale el desglose.
- `calcular_insumos(tamano, unidades, variante, merma)` — la calculadora de §11,
  **solo para productoras y admin**. Devuelve nombres y cantidades, **nunca
  precios ni costos**. `cantidad_necesaria`
  **incluye la merma esperada**, porque la calculadora existe para saber cuánto
  pedir: con la cantidad de fórmula pura y un 5% de pérdida, no alcanza para
  terminar el lote. Devuelve también `cantidad_formula` y `merma` por separado
  para poder mostrar el desglose. La merma va solo sobre materia prima: se piden
  200 etiquetas para 200 unidades, no 210.
- `registrar_resultado_lote(...)` — un productor cierra su propio lote. Es
  función y no policy porque darle `SELECT` sobre `lotes` le abriría las columnas
  de costo congelado de esa misma fila.

**DECISIÓN CERRADA (antes abierta): la receta es de quien produce.** La primera
versión de `calcular_insumos` estaba otorgada a todo usuario autenticado, con la
nota de que exponía las cantidades de la fórmula —de las que se deduce el
porcentaje— y de que si se decidía cerrarla, se restringía el grant. Se cerró: la
función levanta excepción para quien no sea productora ni admin, y falla con
mensaje en vez de devolver cero filas, porque una lista vacía se lee como "este
producto no tiene fórmula", que es otra respuesta. Esconder la pantalla sin
cerrar la función habría sido seguridad de pantalla y no de datos: la API es
pública.

---

## 6. Arranque: el primer admin

Hay un **deadlock de instalación** que es consecuencia directa del diseño de RLS, y
conviene tenerlo presente antes de desplegar en un proyecto nuevo:

```
perfiles     INSERT -> requiere es_admin()
es_admin()          -> lee perfiles, que en una base nueva está vacía -> false
invitaciones INSERT -> requiere es_admin()
```

Alguien que se registre con Supabase Auth en una base recién migrada queda con sesión
válida y sin perfil (la app le muestra "Cuenta sin activar"). No puede darse el rol de
admin, y tampoco puede recibir una invitación, porque crear invitaciones también exige
ser admin. **No hay camino desde adentro de la app.**

Es deliberado —§10 pide alta por invitación, no registro abierto— pero significa que el
primer admin se crea **fuera de banda**, una sola vez, con una conexión que saltea el RLS:

```sql
-- npx supabase db query --linked -f primer_admin.sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', '<email>',
  extensions.crypt('<password>', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', '', '', '', ''      -- ver la nota de abajo
);

insert into auth.identities (id, user_id, identity_data, provider, provider_id,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', u.id::text, now(), now(), now()
from auth.users u where u.email = '<email>';

insert into perfiles (id, nombre, rol)
select id, '<nombre>', 'admin' from auth.users where email = '<email>';

insert into personas (nombre, perfil_id)
select '<nombre>', id from auth.users where email = '<email>';
```

> **Las ocho columnas de token van en `''`, nunca en `NULL`.** GoTrue las lee en strings
> no nulos de Go, y un `NULL` le rompe el scan: el login devuelve
> `500 unexpected_failure: Database error querying schema`, un error que no menciona la
> causa por ningún lado. Las columnas son `confirmation_token`, `recovery_token`,
> `email_change`, `email_change_token_new`, `email_change_token_current`, `phone_change`,
> `phone_change_token` y `reauthentication_token`. Verificado contra el proyecto real:
> con `NULL` el login falla, con `''` funciona.

A partir de ahí el flujo normal de §10 funciona solo: el admin crea invitaciones y el
resto entra por link. `seed.sql` usa el mismo patrón para sus dos usuarios de prueba.

---

## 7. Decisiones abiertas

- **Valor hora** (§15). Hay un parámetro global con historial, que cubre las hojas
  de producto. Si resultan ser dos tarifas según la tarea y no un desactualizado,
  hay que agregarle una dimensión. No afecta al resto del esquema.
- **Costo de MP intermedia en un lote.** Hoy se congela el costo **teórico a la
  fecha del lote**, no el costo real de la tanda concreta de resina que se usó.
  Si esa tanda salió más cara, el lote que la consume no lo refleja.
  `lote_insumos.lote_origen_id` ya existe y queda nulo: el día que haga falta
  trazabilidad real se apunta al lote que produjo esa MP y se lee su costo
  unitario real, sin migrar esquema.
- **Energía.** La fila existe siempre vacía en el Excel. Hay parámetro, en 0.
- **Margen.** Sin valor hasta que Johanna lo defina.
- **`calcular_insumos` expone las cantidades de la fórmula** a un usuario normal,
  y de ahí se deducen los porcentajes. Es deliberado — el productor fabrica el
  lote y necesita saber cuánto pesar — pero §10 lista las fórmulas como
  información de admin. Si se decide cerrarlo, se restringe el `GRANT`.
- **Regalías por unidad obtenida vs. producida.** Ver la decisión en la sección de
  Producción. Es la que más plata mueve de las que quedan abiertas.
- **Combos** (§12). Tercera ola. El grafo de composición los admite después.
- **Aceites.** Fuera de alcance (§12); la línea de negocio queda cargada porque
  §8 la nombra en la conciliación.
