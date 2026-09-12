import {
  costoInsumo,
  type Costo,
  type TipoInsumo,
  type UnidadInsumo,
} from '@/features/insumos/api';
import type { Database } from '@/lib/database.types';
import { cantidad as fmtCantidad, hoyISO } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export type { Costo };

export type UnidadTamano = Database['public']['Enums']['unidad_tamano'];
export type ModoComposicion = Database['public']['Enums']['modo_composicion'];
export type Variante = Database['public']['Enums']['variante_producto'];
export type AplicaVariante = Database['public']['Enums']['aplica_variante'];

export const ETIQUETA_VARIANTE: Record<Variante, string> = {
  elysium: 'Marca Elysium',
  marca_blanca: 'Marca blanca',
};

/**
 * A qué variante pertenece una línea de fórmula. La etiqueta Elysium es
 * `solo_elysium`: es la línea que hace que las dos versiones no cuesten igual
 * (MODELO §4).
 */
export const ETIQUETA_APLICA: Record<AplicaVariante, string> = {
  ambas: 'Ambas',
  solo_elysium: 'Solo Elysium',
  solo_marca_blanca: 'Solo marca blanca',
};

/** Si una línea entra en el cálculo de esta variante. Espeja el filtro del SQL. */
export const aplicaA = (linea: AplicaVariante, v: Variante) =>
  linea === 'ambas' ||
  (linea === 'solo_elysium' && v === 'elysium') ||
  (linea === 'solo_marca_blanca' && v === 'marca_blanca');

export type LineaNegocio = { id: string; nombre: string; activo: boolean };

export type Tamano = {
  id: string;
  productoId: string;
  producto: string;
  nombre: string | null;
  magnitud: number;
  unidad: UnidadTamano;
  /** Unidades por hora (§3.2). Sin esto no hay costo de mano de obra. */
  productividad: number | null;
  activo: boolean;
  /** Cuántas líneas tiene la fórmula. Cero = todavía no hay receta. */
  lineasFormula: number;
  /** Suma de los porcentajes. No tiene que dar 100, pero si no da, se avisa. */
  sumaPorcentaje: number | null;
  /** Precio de venta vigente por variante. Nulo = nunca se cargó. */
  precio: Record<Variante, number | null>;
};

export type Producto = {
  id: string;
  nombre: string;
  lineaId: string | null;
  linea: string | null;
  /** Margen propio que pisa el parámetro global. Nulo = usa el global. */
  margenPct: number | null;
  descripcion: string | null;
  activo: boolean;
  tamanos: Tamano[];
};

/** Cómo se nombra un tamaño cuando no tiene nombre propio: `75 g`. */
export const medida = (t: { magnitud: number; unidad: UnidadTamano }) =>
  `${fmtCantidad(t.magnitud)} ${t.unidad}`;

export const etiquetaTamano = (t: Tamano) => t.nombre?.trim() || medida(t);

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

export async function listarLineas(): Promise<LineaNegocio[]> {
  const { data, error } = await supabase
    .from('lineas_negocio')
    .select('id, nombre, activo')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
}

export async function guardarLinea(
  datos: { nombre: string; activo: boolean },
  id?: string,
) {
  const { error } = id
    ? await supabase.from('lineas_negocio').update(datos).eq('id', id)
    : await supabase.from('lineas_negocio').insert(datos);
  if (error) throw new Error(error.message);
}

/** Cuántos productos usan cada línea. Para no desactivar a ciegas. */
export async function usoDeLineas(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('productos').select('linea_negocio_id');
  if (error) throw new Error(error.message);
  const uso = new Map<string, number>();
  for (const f of data) {
    if (f.linea_negocio_id)
      uso.set(f.linea_negocio_id, (uso.get(f.linea_negocio_id) ?? 0) + 1);
  }
  return uso;
}

/**
 * El catálogo entero: productos con sus tamaños, el precio de venta vigente de
 * cada variante y el estado de la fórmula.
 *
 * Lo que **no** trae es el costo: son una llamada a `costo_tamano` por tamaño y
 * por variante, y en una lista de catálogo no se miran. El costo se calcula en
 * la ficha del producto, donde son pocos y se miran todos.
 */
export async function listarProductos(): Promise<Producto[]> {
  const [prods, tams, precios, control, lineas] = await Promise.all([
    supabase
      .from('productos')
      .select(
        'id, nombre, linea_negocio_id, margen_pct, descripcion, activo, lineas_negocio (nombre)',
      )
      .order('nombre'),
    supabase
      .from('tamanos')
      .select(
        'id, producto_id, nombre, magnitud, unidad, productividad_unid_hora, activo',
      )
      .order('magnitud'),
    // El precio vigente es el más reciente que ya empezó a regir: uno cargado
    // con fecha futura existe, pero todavía no es el precio de hoy.
    supabase
      .from('tamano_precios')
      .select('tamano_id, precio, variante, vigente_desde')
      .lte('vigente_desde', hoyISO())
      .order('vigente_desde', { ascending: false })
      .order('creado_en', { ascending: false }),
    supabase.from('v_formula_control').select('tamano_id, suma_porcentaje'),
    supabase.from('formula_lineas').select('tamano_id'),
  ]);

  const filas = revisar(prods.data, prods.error);
  const tamanos = revisar(tams.data, tams.error);
  const vigentes = revisar(precios.data, precios.error);
  const sumas = revisar(control.data, control.error);
  const todasLasLineas = revisar(lineas.data, lineas.error);

  // Primero gana: la consulta viene ordenada por vigencia descendente.
  const porTamanoVariante = new Map<string, number>();
  for (const p of vigentes) {
    const clave = `${p.tamano_id}|${p.variante}`;
    if (!porTamanoVariante.has(clave)) porTamanoVariante.set(clave, p.precio);
  }

  const suma = new Map(sumas.map((s) => [s.tamano_id, s.suma_porcentaje]));
  const cuantas = new Map<string, number>();
  for (const l of todasLasLineas)
    cuantas.set(l.tamano_id, (cuantas.get(l.tamano_id) ?? 0) + 1);

  const nombreProducto = new Map(filas.map((p) => [p.id, p.nombre]));

  const porProducto = new Map<string, Tamano[]>();
  for (const t of tamanos) {
    const lista = porProducto.get(t.producto_id) ?? [];
    lista.push({
      id: t.id,
      productoId: t.producto_id,
      producto: nombreProducto.get(t.producto_id) ?? '',
      nombre: t.nombre,
      magnitud: t.magnitud,
      unidad: t.unidad,
      productividad: t.productividad_unid_hora,
      activo: t.activo,
      lineasFormula: cuantas.get(t.id) ?? 0,
      sumaPorcentaje: suma.get(t.id) ?? null,
      precio: {
        elysium: porTamanoVariante.get(`${t.id}|elysium`) ?? null,
        marca_blanca: porTamanoVariante.get(`${t.id}|marca_blanca`) ?? null,
      },
    });
    porProducto.set(t.producto_id, lista);
  }

  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    lineaId: f.linea_negocio_id,
    linea: (f.lineas_negocio as { nombre: string } | null)?.nombre ?? null,
    margenPct: f.margen_pct,
    descripcion: f.descripcion,
    activo: f.activo,
    tamanos: porProducto.get(f.id) ?? [],
  }));
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const todos = await listarProductos();
  const uno = todos.find((p) => p.id === id);
  if (!uno) throw new Error('Ese producto no existe o no lo podés ver.');
  return uno;
}

export async function obtenerTamano(id: string): Promise<Tamano> {
  const todos = await listarProductos();
  const uno = todos.flatMap((p) => p.tamanos).find((t) => t.id === id);
  if (!uno) throw new Error('Ese tamaño no existe o no lo podés ver.');
  return uno;
}

export type DatosProducto = {
  nombre: string;
  linea_negocio_id: string | null;
  margen_pct: number | null;
  descripcion: string | null;
  activo: boolean;
};

export async function crearProducto(datos: DatosProducto): Promise<string> {
  const { data, error } = await supabase
    .from('productos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function actualizarProducto(id: string, datos: DatosProducto) {
  const { error } = await supabase.from('productos').update(datos).eq('id', id);
  if (error) throw new Error(error.message);
}

export type DatosTamano = {
  producto_id: string;
  nombre: string | null;
  magnitud: number;
  unidad: UnidadTamano;
  productividad_unid_hora: number | null;
  activo: boolean;
};

export async function guardarTamano(datos: DatosTamano, id?: string): Promise<string> {
  if (id) {
    const { error } = await supabase.from('tamanos').update(datos).eq('id', id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabase
    .from('tamanos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

// ---------------------------------------------------------------- costo

/** El desglose de §3.1 + §3.2, tal como lo devuelve `costo_tamano`. */
export type Desglose = {
  materiasPrimas: number | null;
  merma: number | null;
  envases: number | null;
  etiquetas: number | null;
  otros: number | null;
  manoObra: number | null;
  regalias: number | null;
  energia: number | null;
  sinEtiqueta: number | null;
  conEtiqueta: number | null;
  completo: boolean;
  faltantes: string[];
};

export async function costoTamano(
  tamanoId: string,
  variante: Variante = 'elysium',
  fecha?: string,
): Promise<Desglose> {
  const { data, error } = await supabase.rpc('costo_tamano', {
    p_tamano_id: tamanoId,
    p_variante: variante,
    ...(fecha ? { p_fecha: fecha } : {}),
  });
  if (error) throw new Error(error.message);

  // `costo_tamano` devuelve una tabla de una fila.
  const r = data?.[0];
  return {
    materiasPrimas: r?.costo_materias_primas ?? null,
    merma: r?.costo_merma ?? null,
    envases: r?.costo_envases ?? null,
    etiquetas: r?.costo_etiquetas ?? null,
    otros: r?.costo_otros ?? null,
    manoObra: r?.costo_mano_obra ?? null,
    regalias: r?.costo_regalias ?? null,
    energia: r?.costo_energia ?? null,
    sinEtiqueta: r?.costo_sin_etiqueta ?? null,
    conEtiqueta: r?.costo_con_etiqueta ?? null,
    completo: Boolean(r?.completo),
    faltantes: r?.faltantes ?? [],
  };
}

/**
 * El precio recomendado (§7.1). No se guarda nunca: es una función del costo y
 * del margen, y Johanna no lo edita. Se recalcula cada vez que se mira.
 */
export async function precioRecomendado(
  tamanoId: string,
  variante: Variante = 'elysium',
  fecha?: string,
): Promise<Costo> {
  const { data, error } = await supabase.rpc('precio_recomendado', {
    p_tamano_id: tamanoId,
    p_variante: variante,
    ...(fecha ? { p_fecha: fecha } : {}),
  });
  if (error) throw new Error(error.message);
  const r = data as unknown as Costo | null;
  return {
    costo: r?.costo ?? null,
    completo: Boolean(r?.completo),
    faltantes: r?.faltantes ?? [],
  };
}

/** Costo + recomendado + precio de venta de un tamaño, para una variante. */
export type Numeros = {
  desglose: Desglose;
  recomendado: Costo;
  venta: number | null;
};

export async function numerosDe(
  tamano: Tamano,
  variante: Variante = 'elysium',
): Promise<Numeros> {
  const [desglose, recomendado] = await Promise.all([
    costoTamano(tamano.id, variante),
    precioRecomendado(tamano.id, variante),
  ]);
  return { desglose, recomendado, venta: tamano.precio[variante] };
}

// -------------------------------------------------------------- fórmula

export type LineaFormula = {
  id: string;
  insumoId: string;
  insumo: string;
  tipo: TipoInsumo;
  /** Unidad de compra del insumo; las cantidades van en su unidad chica. */
  unidadInsumo: UnidadInsumo;
  modo: ModoComposicion;
  porcentaje: number | null;
  cantidadFija: number | null;
  aplicaA: AplicaVariante;
  orden: number | null;
  notas: string | null;
  /** Cuánto entra en UNA unidad del tamaño, en unidad chica (g / ml / u). */
  cantidadUso: number;
  /** Costo del insumo por unidad chica. */
  costoUnitario: Costo;
  /** Lo que aporta esta línea al costo de una unidad. */
  subtotal: number | null;
};

/**
 * La receta de un tamaño, con el costo de cada línea resuelto.
 *
 * `cantidadUso` es el `%  × tamaño` de §3.1 y se calcula acá y no en la base
 * porque la pantalla lo muestra línea por línea; `costo_tamano` hace la misma
 * cuenta del lado del servidor para el total, que es el número que vale.
 */
export async function formula(tamano: Tamano): Promise<LineaFormula[]> {
  const { data, error } = await supabase
    .from('formula_lineas')
    .select(
      'id, insumo_id, modo, porcentaje, cantidad_fija, aplica_a, orden, notas, insumos (nombre, tipo, unidad)',
    )
    .eq('tamano_id', tamano.id)
    .order('orden', { nullsFirst: false });
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    insumo_id: string;
    modo: ModoComposicion;
    porcentaje: number | null;
    cantidad_fija: number | null;
    aplica_a: AplicaVariante;
    orden: number | null;
    notas: string | null;
    insumos: { nombre: string; tipo: TipoInsumo; unidad: UnidadInsumo } | null;
  }[];

  const costos = await Promise.all(filas.map((f) => costoInsumo(f.insumo_id)));

  return filas.map((f, n) => {
    const cantidadUso =
      f.modo === 'porcentaje'
        ? ((f.porcentaje ?? 0) / 100) * tamano.magnitud
        : (f.cantidad_fija ?? 0);
    const costo = costos[n];
    return {
      id: f.id,
      insumoId: f.insumo_id,
      insumo: f.insumos?.nombre ?? '—',
      tipo: f.insumos?.tipo ?? 'otro',
      unidadInsumo: f.insumos?.unidad ?? 'unidad',
      modo: f.modo,
      porcentaje: f.porcentaje,
      cantidadFija: f.cantidad_fija,
      aplicaA: f.aplica_a,
      orden: f.orden,
      notas: f.notas,
      cantidadUso,
      costoUnitario: costo,
      subtotal: costo.costo == null ? null : costo.costo * cantidadUso,
    };
  });
}

export type DatosLinea = {
  tamano_id: string;
  insumo_id: string;
  modo: ModoComposicion;
  porcentaje: number | null;
  cantidad_fija: number | null;
  aplica_a: AplicaVariante;
  orden: number | null;
  notas: string | null;
};

export async function guardarLineaFormula(datos: DatosLinea, id?: string) {
  const { error } = id
    ? await supabase.from('formula_lineas').update(datos).eq('id', id)
    : await supabase.from('formula_lineas').insert(datos);
  if (error) throw new Error(error.message);
}

export async function borrarLineaFormula(id: string) {
  const { error } = await supabase.from('formula_lineas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------- precio de venta

export type PrecioVentaFila = {
  id: string;
  precio: number;
  variante: Variante;
  vigente_desde: string;
};

export async function historialPreciosVenta(
  tamanoId: string,
): Promise<PrecioVentaFila[]> {
  const { data, error } = await supabase
    .from('tamano_precios')
    .select('id, precio, variante, vigente_desde')
    .eq('tamano_id', tamanoId)
    .order('vigente_desde', { ascending: false })
    .order('creado_en', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Un precio de venta es una fila nueva con su fecha de vigencia: el historial
 * es lo que permite saber a cuánto se vendió en marzo (§7.1). El upsert cubre
 * el único caso en que se pisa: cargar dos veces el precio del mismo día para
 * la misma variante, donde la segunda carga es una corrección de la primera.
 */
export async function registrarPrecioVenta(entrada: {
  tamano_id: string;
  precio: number;
  variante: Variante;
  vigente_desde?: string;
}) {
  const { error } = await supabase.from('tamano_precios').upsert(
    {
      tamano_id: entrada.tamano_id,
      precio: entrada.precio,
      variante: entrada.variante,
      vigente_desde: entrada.vigente_desde ?? hoyISO(),
    },
    { onConflict: 'tamano_id,variante,vigente_desde' },
  );
  if (error) throw new Error(error.message);
}
