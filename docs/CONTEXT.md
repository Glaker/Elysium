# Elysium — Contexto y alcance

> Documento de contexto para trabajar con Claude Code.
> Reconstruido a partir de los dos Excel de producción (`Producción.xlsx`, `Productos_CIAB.xlsx`)
> y de las notas de la reunión con Johanna.
> **Última actualización:** [poner fecha]

---

## 1. Qué es Elysium

Elysium es un emprendimiento que fabrica y vende cosmética natural (shampoos sólidos,
bálsamos, cremas, repelentes, tónicos, etc.). No es una fábrica: es una operación chica
donde una persona coordina todo y estudiantes de Ingeniería Química producen los lotes.

**Johanna** es quien coordina. Ella:
- compra la materia prima,
- define las fórmulas y los tamaños de producto,
- encarga lotes a los productores y les paga mano de obra,
- fija el costo de cada producto,
- guarda el stock de producto terminado y lo vende o lo entrega para reventa.

Hoy todo esto vive en dos planillas de Excel en SharePoint, con fórmulas cruzadas entre
hojas. El objetivo del proyecto es reemplazarlas por una web app.

### Vocabulario del negocio

Usar estos términos en el código y en la UI. Son los que usa Johanna.

| Término | Significado |
|---|---|
| **Insumo / Materia prima (MP)** | Lo que se compra: aceites, arcillas, tensioactivos, conservantes. También envases, etiquetas, cajas. |
| **Producto** | Lo que se vende: "Shampoo Café", "Bálsamo", "Descongestivo". |
| **Fórmula / Receta** | Composición porcentual de un producto. Ej: Shampoo Café = 30% SCI + 30% SCS + 10% betaína… |
| **Tamaño** | Gramos o ml de una unidad del producto. El mismo producto puede tener varios. |
| **Lote / Producción** | Una tanda concreta: producto + cantidad + quién la hizo + cuándo. |
| **MP intermedia** | Un insumo que Elysium fabrica en vez de comprar (ver §4). |
| **Regalías** | Cargo fijo por unidad producida ($1500) que se paga a un tercero. Es parte del costo. |
| **Costo s/ etiqueta** | Lo que sale producir una unidad, sin la etiqueta. |
| **Costo c/ etiqueta** | El anterior + el costo prorrateado de la etiqueta. Es el costo real y completo. Contra este se mide el margen. |
| **Precio recomendado** | Calculado por el sistema: costo c/ etiqueta + margen. Sugerencia, no se edita. |
| **Precio de venta** | El que fija Johanna, normalmente redondeando el recomendado. Es el que manda. Ver §7.1. |
| **Marca blanca** | El producto sale **sin** marca Elysium. Misma fórmula, distinta presentación. |
| **Cuenta** | A quién se le transfiere la plata de una venta (Silvia, Johanna, Martín, Luis). |
| **Deudor** | Alguien que se llevó productos y todavía no pagó. |

---

## 2. Los dos flujos de venta

Esta distinción es central y no debe colapsarse en una sola entidad.

**A. Venta directa.** Johanna vende a un cliente final, a pedido. Entra plata al precio de
venta. Baja stock.

**B. Entrega para reventa.** Le da productos a alguien (típicamente un estudiante), que
paga el **costo**. Lo que esa persona haga después — a cuánto lo revenda, a quién — no es
asunto del sistema. Baja stock, y genera una deuda si no pagó en el momento.

En el Excel actual las dos conviven en la misma hoja `Ventas`, distinguidas por columnas
distintas (`Pagó Cos` vs. `Pagó Balsamo` / `Pagó Rep`). Es una fuente de confusión y en la
app deberían ser explícitas.

---

## 3. Cómo se calcula el costo (el corazón del sistema)

Reconstruido de `Producción.xlsx`. Cada producto tiene su propia hoja con la misma
estructura. Ejemplo real: **Shampoo Café**, tamaño 75 g, lote de 200 unidades.

### 3.1 Insumos de la fórmula

| Insumo | % | Cant. uso (g) | Cant. lote | Precio/kg | Costo unit. |
|---|---|---|---|---|---|
| SCI | 30% | 22,5 | 4500 | $25.299 | $569,23 |
| SCS | 30% | 22,5 | 4500 | $22.899 | $515,23 |
| Betaína de coco | 10% | 7,5 | 1500 | $7.830 | $58,73 |
| Cafeína anhidra | 1% | 0,75 | 150 | $99.700 | $74,78 |
| Arcilla blanca | 10% | 7,5 | 1500 | $4.530 | $33,98 |
| Café molido | 10% | 7,5 | 1500 | $26.235 | $196,76 |
| Aceite almendras c/ cannabis | 5% | 3,75 | 750 | $72.212 | $270,80 |
| Alcohol cetílico | 5% | 3,75 | 750 | $14.830 | $55,61 |
| **Total insumos** | **101%** | **75,75** | **15150** | | **$1.775,10** |

Fórmulas:
- `cantidad_uso = porcentaje × tamaño`
- `cantidad_lote = cantidad_uso × unidades_del_lote`
- `precio` sale de la Lista de Precios con un `XLOOKUP` por nombre
- `costo_unitario = cantidad_uso × precio / 1000` (÷1000 porque el precio es por kg/l y la cantidad en g/ml)

> **Ojo:** los porcentajes suman 101%, no 100%. No es un error de tipeo: en varias hojas
> pasa. La app debería avisar cuando no suma 100 pero no impedirlo.

### 3.2 Costos adicionales por unidad

| Concepto | Valor | Cómo se calcula |
|---|---|---|
| Etiqueta | $100 | Precio unitario fijo |
| Envase | $50 | Precio unitario fijo |
| Hora de trabajo | $171,43 | $6.000/hora ÷ 35 unidades por hora |
| Costo de energía | — | Columna existe, siempre vacía |
| Regalías | $1.500 | Fijo por unidad |
| **Total final** | **$3.596,53** | |

El **valor hora** está hardcodeado como `=960000/160` ($6.000/h) en casi todas las hojas,
pero en otras (Caja combo, Muestras) es `=700000/160` ($4.375/h). Son sueldos mensuales
distintos dividido 160 horas. Esto debe ser un parámetro configurable, no una constante.

La **productividad** (35 unidades/hora en este caso) es específica de cada producto y hoy
está anotada como texto suelto al costado de la hoja ("35 unid x hora").

### 3.3 Lo que el Excel no contempla y sí debería

- **Merma de MP por lote.** Default **5%**, editable por lote. Es un valor aproximado que
  se repite pero puede cambiar. Hoy no está en ninguna fórmula del Excel.
- **Costo de energía.** La fila existe en todas las hojas, siempre vacía.
- **Personas por lote.** Hoy la hora de trabajo es un número agregado. Johanna quiere
  registrar cuántas personas trabajaron, cuánto tiempo cada una y cuánto pagarle a cada una.

### 3.4 Resultado de un lote

Un lote no siempre sale bien. Al cerrarlo, el productor elige un resultado:

| Resultado | Qué pasa |
|---|---|
| **OK** | Entran las unidades producidas al stock. Caso normal. |
| **Descarte** | Se pierde todo. Los insumos se consumieron, no entra producto. La pérdida queda registrada. |
| **Reproceso** | Se recupera, pero con una pérdida parcial. Se registra qué porcentaje o cantidad se perdió. |

En los tres casos los insumos ya se consumieron y el costo ya se incurrió. La diferencia
está en cuántas unidades entran al stock, y eso cambia el costo unitario real del lote.
Un lote reprocesado tiene costo unitario más alto que uno que salió limpio.

---

## 4. Materias primas intermedias

Algunos insumos no se compran: se fabrican. Aparecen en la Lista de Precios con proveedor
`PRODUCCIÓN CIAB` y su precio es una referencia a la hoja donde se calculan.

Ejemplos encontrados:

- **Resina** — se produce a partir de flores, alcohol etílico, horas de trabajo, jeringas y
  filtros. Se usa en Bálsamos, Descongestivo, Shampoo Café.
- **Oleato de jarilla** — aceite de almendras + jarilla. Se usa en Acondicionador.
- **Extracto alcoglicerinado de jarilla** — calculado en la hoja de Tónico Capilar.

Esto significa que **el grafo de composición tiene más de un nivel de profundidad**. Un
producto usa un insumo que a su vez se produce a partir de otros insumos. El modelo de
datos tiene que soportarlo, y el cálculo de costos tiene que ser recursivo.

> **DECIDIDO:** el bloque "Prod. Resina" está copiado y pegado en varias hojas de producto
> con valores incompatibles entre sí (el costo por ml da $17.480 en Bálsamos, $2.072.920 en
> Shampoo Café, $1.036.460 en Descongestivo — órdenes de magnitud de diferencia). Hay
> fórmulas rotas ahí. **No se migra ninguno de esos valores: el costo queda vacío y Johanna
> lo carga después.** Esto aplica como regla general: ante un valor del Excel que no es
> confiable, dejarlo nulo, nunca adivinarlo.
>
> Consecuencia de diseño: la app tiene que tolerar insumos y productos con costo nulo sin
> romperse. Un producto con un insumo sin precio debe poder existir, mostrar su costo como
> incompleto, y señalar qué le falta. Editar ese precio después tiene que ser trivial.

---

## 5. Lista de precios de insumos

Hoja `Lista de precios`, ~54 insumos. Campos:

`NOMBRE | PRECIO EN U$D | PRECIO EN PESOS | UNIDAD (KG/L/UNIDAD) | PROVEEDOR | LINK DEL PROVEEDOR | ÚLTIMA VERIFICACIÓN`

Detalles:
- Algunos insumos se cotizan en dólares: el precio en pesos es `=USD × tipo_de_cambio`. El
  tipo de cambio vive en una celda única (`$1.530`) alimentada por una conexión externa a
  Google Sheets. **Esa conexión probablemente esté rota** — el archivo abre con advertencia
  de seguridad.
- `ÚLTIMA VERIFICACIÓN` es la fecha del último chequeo de precio. Johanna quiere una alerta
  cuando pasen **más de 30 días** sin actualizar.
- El link al proveedor es un requisito explícito, no un extra.
- Los envases y etiquetas **no están** en esta lista: sus precios están hardcodeados en cada
  hoja de producto. Deberían unificarse.

---

## 6. Stock

### Cómo funciona hoy

`Historial de Movimientos` es un libro de asientos: `Fecha | Producto | Tipo | Cantidad |
Costo s/etiq | Costo c/etiq | Precio de venta | Comentario`.

Tipos de movimiento definidos: `Entrada`, `Salida (De momento no sirve)`,
`Ajuste (De momento no sirve)`, `Cambio de precio`.

El stock actual se calcula como: `SUM(entradas del producto) − SUM(columna del producto en Ventas)`.

### Problemas del enfoque actual

1. **Las salidas se registran como entradas negativas**, con un comentario que dice "Es
   salida", porque los tipos Salida y Ajuste "no sirven". El modelo de movimientos existe
   pero no se usa correctamente.
2. **El stock calculado no coincide con el conteo físico.** En `Stock (2)` hay una columna
   "Diferencia" que compara ambos. Al momento de la exportación: Shampoo Café −81 unidades
   de stock calculado contra 38 contadas (diferencia de 119), Sericina −4, Coco −21,
   Niacinamida −15. Hay stock negativo, que es imposible.
3. **El precio de venta vive dentro del historial de movimientos**, mezclado con los
   movimientos de cantidad. Un "Cambio de precio" es una fila con cantidad vacía.

### DECIDIDO: no se migra el stock

No reconstruimos el stock histórico. Johanna carga el stock inicial ella misma desde la app,
una vez que exista. Las diferencias del Excel (Café −81, Sericina −4, Coco −21, Niacinamida
−15) no se arrastran.

Consecuencia: la app necesita una **carga de stock inicial** cómoda desde el día uno —
una pantalla donde ella pueda sentarse con el conteo físico en la mano y cargar cantidades
por producto y ubicación. No es una migración técnica, es una función del producto.

### Qué debería hacer la app

El stock como **suma de movimientos inmutables**, no como un número que se pisa. Cada
movimiento con su tipo real (producción, venta, entrega, ajuste, merma, muestra). El
precio de venta como entidad con historial propio, separado del stock.

Johanna también lleva conteo físico por ubicación (`Cajón` / `Vitrina` / `Muestras`), y
quiere poder registrar un recuento y ver la diferencia contra el teórico. Eso es un
**ajuste de inventario**, y es una operación de primera clase.

---

## 7. Ventas y deudas

### Estructura actual (mala)

La hoja `Ventas` tiene **una columna por producto**: Hialuro, C. de ojos, Niacinam, Espuma,
Café, Coco, Bentonita, Bálsamo, Descong, Sericina, Q10, Tónico, Post sol, Acond, Brillo,
Repelente. 603 filas. Agregar un producto nuevo obliga a agregar una columna y actualizar
todas las fórmulas que la referencian.

Además: `Pagó Cos | Debe | Pagó Balsamo | Pagó Rep | Debe Rep | Cuenta | Forma de pago | Pago total`.

El "Debe" se calcula multiplicando cantidades por precios que están hardcodeados en una hoja
oculta (`Productos`), no por el precio vigente al momento de la venta.

### 7.1 Precios

Tres cosas distintas, y conviene no mezclarlas.

**1. Precio recomendado** — se calcula siempre, automáticamente:
`costo c/ etiqueta × (1 + margen)`. Se recalcula solo cuando cambia el precio de un insumo,
la fórmula, el tamaño o el margen. Johanna no lo edita: es lo que el sistema sugiere.

**2. Precio de venta** — el que Johanna pone. Típicamente el recomendado redondeado para
arriba, pero puede ser cualquier cosa. Es el que manda para vender. Vive en los datos del
producto, es por producto (no por tamaño ni por marca).

Los dos conviven y se muestran juntos. Ver los dos al lado le permite saber cuánto se está
desviando del cálculo, y detectar cuándo un aumento de insumos dejó su precio por debajo de
lo que debería.

**3. Precio de la línea de venta** — cuando se concreta una venta, la línea guarda una copia
del precio de venta vigente en ese momento. **Esa copia no se toca nunca más.** Sin esto,
actualizar el precio del SCI reescribiría el margen de todas las ventas de marzo.

Lo mismo aplica al costo: un lote guarda el costo de sus insumos al momento de producirse.
El precio de lista del producto es un dato vivo; el de una transacción cerrada es histórico.

### Qué necesita la app

- Venta = cabecera + líneas (producto, cantidad, precio unitario **congelado al momento de la venta**).
- Registrar quién compró, a qué cuenta pagó, forma de pago, y comprobante.
- **Lista de deudores** con detalle: quién debe, por qué productos, cuánto en total.
- Cuando una persona con deuda previa hace un pedido nuevo, avisarle lo que debe de antes.
- **Imputación de pagos tipo FIFO**: si alguien aporta plata y tenía varias deudas, se
  cancela desde la más vieja a la más nueva, restando del total. Johanna lo pidió textual.
- Poder cargar una venta **a nombre de otro**, y también **sin nombre del autor de la venta**.

---

## 8. Cuentas y flujo de dinero

La plata no entra a una sola caja. Hay varias cuentas destino (**Silvia, Johanna, Martín,
Luis**) y varias líneas de negocio (**Bálsamos, Repelentes, Cosmética resto, Aceites**).

La hoja `Tráfico de dinero` es una conciliación semanal: para cada semana y cada línea,
cuánto entró a cada cuenta, con un estado `Hecho`.

Requisitos derivados:
- Saber a qué cuenta paga cada venta, y poder enviar/adjuntar comprobante.
- Reporte de cuánto entró a cada cuenta, por período.
- Los alias de transferencia están anotados sueltos en el Excel (`autino.jo`, `bnluisperego`,
  `m.perego.mp`, `Elysium3`). Deberían ser un campo de la cuenta.

---

## 9. Gastos

Hoja `Registro de Gastos`, 300 filas:

`Fecha de compra | Tipo de insumo | Nombre del insumo | Cantidad | Unidad | Costo Unitario | Total gastado | Proveedor | Forma de pago | Comentario`

Tipos usados hoy: `Materia prima`, `Envases`, `Etiquetas`, `Regalías`, `Mano de obra`, y un
cajón de "otros" calculado por diferencia.

Johanna pidió agregar: **librería** y **publicidad**.

Necesita: resumen de gastos por tipo y resumen por rango de fechas.

---

## 10. Usuarios y permisos

Dos roles, según la nota textual "solo lo ve el admin (dos cuentas)":

**Admin** (Johanna + una más). Ve todo, incluyendo:
- costos de producción, mano de obra, márgenes
- tiempo que lleva cada producto
- deudores y flujo de dinero
- gestión de fórmulas y precios

**Usuario normal.** Dos perfiles que comparten el mismo rol: los productores (estudiantes
que hacen los lotes) y la gente que le pide productos de forma recurrente para revender.
Puede:
- solicitar materia prima
- anotar el resultado de un lote que produjo
- solicitar productos ya hechos para la venta
- **ver el precio de cada producto**
- **ver lo que debe, si no pagó todavía**

Los dos últimos puntos son el motivo principal por el que existe la cuenta: hoy Johanna
responde eso por WhatsApp una y otra vez. Sacarle esa carga es parte del valor del sistema.

Se registran con **link de invitación** que genera Johanna, no con alta abierta.

---

## 11. Funcionalidades pedidas

Marcadas por prioridad sugerida. **Discutir con Johanna antes de cerrar el MVP.**

### Núcleo (MVP)
- [ ] Catálogo de insumos con precio, unidad, proveedor, link, fecha de última verificación
- [ ] Fórmulas por producto (composición porcentual) y tamaños
- [ ] Registrar lote de producción → consume insumos, genera unidades, calcula costo
- [ ] Stock por movimientos (producción, venta, entrega, ajuste, merma, muestra)
- [ ] Ventas: directa y entrega para reventa
- [ ] Deudores con imputación FIFO de pagos
- [ ] Registro de gastos con tipos y resúmenes
- [ ] Dos roles con permisos diferenciados

### Segunda ola
- [ ] **Simulador de costos**: elegir fórmula y tamaño, ver el costo. Si un insumo no está
      cargado, pedir los datos ahí mismo **sin guardarlos**. (Textual de Johanna.)
- [ ] **Calculadora de ingredientes**: para producir X unidades, cuánto de cada insumo hace
      falta y si alcanza con el stock actual
- [ ] Solicitud de materia prima por parte de usuarios normales (**no reserva stock**: es
      un aviso, como el WhatsApp que reemplaza)
- [ ] Alerta a los 30 días sin actualizar precio de un insumo o producto
- [ ] MP intermedias con cálculo recursivo de costo
- [ ] Registro de personas por lote: quién, cuánto tiempo, cuánto cobra
- [ ] Cuentas destino + comprobantes de pago
- [ ] Marca blanca vs. marca Elysium

### Tercera ola
- [ ] Histórico de precios de insumos y productos, con gráficos
- [ ] Combos / cajas (ver §12)
- [ ] Conciliación de flujo de dinero por cuenta y período
- [ ] Recuento físico por ubicación con cálculo de diferencia

---

## 12. Cosas que existen en el Excel y hay que decidir si entran

- **Combos / cajas.** Hojas `Caja combo` y `Muestras`. Un combo agrupa varios productos
  terminados y suma etiqueta, caja, viruta de papel y regalías. Ej: "Café + Acondicionador
  + tónico". Es un producto compuesto de productos.
- **Línea Aceites.** ~~Preguntar si entra en alcance.~~ **Fuera de alcance por ahora.**
  Hoja aparte con lotes `L1`/`L2`, aportes de ~20 personas y reparto de ganancias entre
  "Gero" y "CIAB". Es un negocio distinto que comparte planilla. Se revisa más adelante si
  quedan muchas dudas resueltas.
- **Muestras.** Se llevan un conteo aparte. Salen del stock pero no son venta.
- **Productos discontinuados o en desarrollo.** ~18 hojas ocultas: Perfuminas, Mermelada,
  Aceite Esencial de Naranja, Espuma de afeitar, Sales de Baño. **No nos importa cuáles
  siguen vigentes**: no se migran, los carga Johanna después. Lo único que importa es que
  dar de alta un producto con su fórmula sea una operación cómoda en la app.

---

## 13. Stack técnico

- **Frontend:** React + Mantine
- **Backend / DB:** Supabase (Postgres + Auth + RLS)
- **Deploy:** Vercel

Decisiones que se derivan:
- Auth de Supabase con invitación por link para usuarios normales
- RLS para separar lo que ve cada rol — los costos y márgenes no deben salir del servidor
  para un usuario normal, no alcanza con esconderlos en el frontend
- Los cálculos de costo conviene tenerlos en la base (funciones o vistas), no duplicados
  en el cliente

---

## 14. Principios de modelado

1. **El stock es un derivado, no un dato.** Se calcula sumando movimientos. Nunca se pisa
   un número de stock.
2. **Las transacciones cerradas se congelan; los datos del producto no.** Una línea de venta
   guarda el precio al que se vendió. Un lote guarda el costo de sus insumos al producirse.
   El precio de lista del producto, en cambio, es un dato vivo que se recalcula. Cambiar la
   lista de precios hoy actualiza el precio recomendado, pero no toca el margen de un lote
   de marzo.
3. **Una fila por hecho, no una columna por producto.** Agregar un producto nuevo no debería
   requerir tocar el esquema.
4. **Los parámetros son datos.** Valor hora, porcentaje de merma, monto de regalías, tipo de
   cambio: configurables, con historial. No constantes en el código.
5. **Los productos compuestos son recursivos.** Un producto puede usar un insumo que Elysium
   fabrica. El cálculo de costo debe bajar por ese árbol.

---

## 15. Preguntas abiertas

### Resueltas (ver secciones correspondientes)

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | Costo correcto de la Resina | No se migra. Queda vacío, lo carga Johanna. Regla general para todo valor no confiable. §4 |
| 3 | Qué hacer con el stock que no cierra | No se reconstruye. Johanna carga el stock inicial desde la app. §6 |
| 4 | ¿El 5% de merma es fijo? | Es un aproximado. Default 5%, editable por lote. §3.3 |
| 5 | ¿Entra la línea Aceites? | Fuera de alcance por ahora. §12 |
| 6 | ¿Qué productos ocultos siguen vigentes? | No importa: no se migran, los carga ella. §12 |
| 7 | ¿Precios por producto o por variante? | Por producto. Marca blanca = sin marca Elysium, misma fórmula. §7.1 |
| 8 | ¿Cómo se fija el precio? | Calculado (costo × margen) o fijo a mano. Los dos modos. §7.1 |
| 9 | ¿Solicitar MP reserva stock? | No, es solo un aviso. §11 |
| 10 | ¿Qué pasa con un lote que sale mal? | Tres resultados: OK, descarte, reproceso con pérdida parcial. §3.4 |
| 11 | ¿Se migran datos históricos? | No es obligatorio. Se puede subir lo más consistente para ir probando el modelo. |
| 12 | ¿Qué es "costo c/ etiqueta"? | Costo de producción + etiqueta prorrateada. **No es el precio de venta.** Son tres números distintos. §7.1 |

### Todavía abiertas

**Valor hora.** Aparece como `=960000/160` ($6.000/h) en las hojas de producto y
`=700000/160` ($4.375/h) en Caja combo y Muestras. ¿Son dos tarifas distintas según la
tarea, o quedó desactualizado en algunas hojas?

**Porcentajes que no suman 100.** Varias fórmulas suman 101% (Shampoo Café) o valores
cercanos. ¿Es intencional o son errores de carga?

**Envases y etiquetas.** No están en la Lista de Precios: sus precios están hardcodeados en
cada hoja de producto ($100 etiqueta, $50 envase en Shampoo Café; $78 y $1.153,90 en
Bálsamos). ¿Se unifican en el catálogo de insumos?

## 16. Fuentes

- `Producción.xlsx` — 38 hojas (20 visibles). Fórmulas, costos, lista de precios de insumos.
- `Productos_CIAB.xlsx` — 17 hojas (8 visibles). Stock, ventas, gastos, cuentas, resultados.
- Notas de la reunión con Johanna (capturas de WhatsApp).
- Ronda de respuestas posterior sobre alcance y decisiones de modelado.

### Sobre la migración de datos

No es obligatorio migrar. Se puede subir un subconjunto de los datos más consistentes
(catálogo de insumos con precio y proveedor, fórmulas de los productos activos) para tener
con qué probar el modelo mientras se desarrolla. El stock, las ventas y las deudas los
carga Johanna desde la app.
