import type { UnidadInsumo } from '@/features/insumos/api';
import { etiquetaTamano, type Tamano } from '@/features/productos/api';
import type { Database } from '@/lib/database.types';
import { UNIDAD_CHICA } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export type TipoMovProducto = Database['public']['Enums']['tipo_mov_producto'];
export type TipoMovInsumo = Database['public']['Enums']['tipo_mov_insumo'];
export type EstadoRecuento = Database['public']['Enums']['estado_recuento'];

/**
 * Los tipos de movimiento de producto. `produccion` y `venta` no están acá a
 * propósito: los emiten `cerrar_lote` y `confirmar_venta`, no una carga manual.
 * Cargar a mano una venta dejaría el stock movido sin la venta que lo explica.
 */
export const TIPOS_PRODUCTO_MANUAL: {
  value: TipoMovProducto;
  label: string;
  ayuda: string;
}[] = [
  {
    value: 'ajuste',
    label: 'Ajuste',
    ayuda:
      'Corrección de un error de carga o una diferencia encontrada fuera de un recuento.',
  },
  {
    value: 'merma',
    label: 'Merma',
    ayuda: 'Se rompió, se venció, se perdió. Sale del stock y no vuelve.',
  },
  {
    value: 'muestra',
    label: 'Muestra',
    ayuda: 'Se regaló para probar o promocionar. No es una venta ni una pérdida.',
  },
  {
    value: 'entrega',
    label: 'Entrega',
    ayuda: 'Salida para reventa que no pasó por una venta cargada en el sistema.',
  },
  {
    value: 'stock_inicial',
    label: 'Stock inicial',
    ayuda:
      'La carga de arranque. Para hacerla completa conviene un recuento, no un movimiento suelto.',
  },
];

export const TIPOS_INSUMO_MANUAL: {
  value: TipoMovInsumo;
  label: string;
  ayuda: string;
}[] = [
  {
    value: 'compra',
    label: 'Compra',
    ayuda: 'Entró material comprado. Si lo cargás como gasto, el movimiento sale solo.',
  },
  {
    value: 'ajuste',
    label: 'Ajuste',
    ayuda: 'Corrección de una diferencia entre lo que dice el sistema y lo que hay.',
  },
  {
    value: 'merma',
    label: 'Merma',
    ayuda: 'Se perdió fuera de un lote: se derramó, se venció, se contaminó.',
  },
  {
    value: 'devolucion',
    label: 'Devolución',
    ayuda: 'Volvió al proveedor, o volvió de un lote que no lo usó.',
  },
  {
    value: 'stock_inicial',
    label: 'Stock inicial',
    ayuda: 'La carga de arranque de un insumo que ya estaba en el depósito.',
  },
];

export const ETIQUETA_MOV_PRODUCTO: Record<TipoMovProducto, string> = {
  stock_inicial: 'Stock inicial',
  produccion: 'Producción',
  venta: 'Venta',
  entrega: 'Entrega',
  ajuste: 'Ajuste',
  merma: 'Merma',
  muestra: 'Muestra',
  traslado: 'Traslado',
};

export const ETIQUETA_MOV_INSUMO: Record<TipoMovInsumo, string> = {
  stock_inicial: 'Stock inicial',
  compra: 'Compra',
  produccion: 'Producción',
  consumo_lote: 'Consumo de lote',
  merma: 'Merma',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
};

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

export type Ubicacion = {
  id: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
};

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id, nombre, es_default, activo')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    esDefault: u.es_default,
    activo: u.activo,
  }));
}

export async function guardarUbicacion(
  datos: { nombre: string; es_default: boolean; activo: boolean },
  id?: string,
) {
  const { error } = id
    ? await supabase.from('ubicaciones').update(datos).eq('id', id)
    : await supabase.from('ubicaciones').insert(datos);
  if (error) throw new Error(error.message);
}

/** El stock de un tamaño, con el detalle de dónde está. */
export type StockProducto = {
  tamanoId: string;
  producto: string;
  tamano: string;
  total: number;
  /** Cuánto hay en cada ubicación. Solo las que tienen movimientos. */
  porUbicacion: { ubicacionId: string; ubicacion: string; stock: number }[];
};

/**
 * El stock de producto terminado.
 *
 * Las vistas solo conocen los tamaños que tuvieron algún movimiento: un tamaño
 * que nunca se produjo no aparece ahí. Se completan con el catálogo, en cero,
 * porque "todavía no hice ninguno" es una respuesta y una fila faltante no.
 */
export async function stockProductos(tamanos: Tamano[]): Promise<StockProducto[]> {
  const { data, error } = await supabase
    .from('v_stock_producto')
    .select('tamano_id, producto, tamano, ubicacion_id, ubicacion, stock');
  if (error) throw new Error(error.message);

  const porTamano = new Map<string, StockProducto>();

  for (const t of tamanos) {
    porTamano.set(t.id, {
      tamanoId: t.id,
      producto: t.producto,
      tamano: etiquetaTamano(t),
      total: 0,
      porUbicacion: [],
    });
  }

  for (const f of data) {
    const id = f.tamano_id as string;
    const fila =
      porTamano.get(id) ??
      ({
        tamanoId: id,
        producto: f.producto ?? '—',
        tamano: f.tamano ?? '',
        total: 0,
        porUbicacion: [],
      } as StockProducto);

    fila.total += Number(f.stock ?? 0);
    if (Number(f.stock ?? 0) !== 0) {
      fila.porUbicacion.push({
        ubicacionId: f.ubicacion_id as string,
        ubicacion: f.ubicacion ?? '—',
        stock: Number(f.stock ?? 0),
      });
    }
    porTamano.set(id, fila);
  }

  return [...porTamano.values()].sort(
    (a, b) =>
      a.producto.localeCompare(b.producto, 'es') ||
      a.tamano.localeCompare(b.tamano, 'es'),
  );
}

export type StockInsumo = {
  insumoId: string;
  nombre: string;
  unidad: UnidadInsumo;
  unidadChica: string;
  stock: number;
};

export async function stockInsumos(
  insumos: { id: string; nombre: string; unidad: UnidadInsumo }[],
): Promise<StockInsumo[]> {
  const { data, error } = await supabase
    .from('v_stock_insumo')
    .select('insumo_id, stock');
  if (error) throw new Error(error.message);
  const porInsumo = new Map(
    data.map((f) => [f.insumo_id as string, Number(f.stock ?? 0)]),
  );

  return insumos
    .map((i) => ({
      insumoId: i.id,
      nombre: i.nombre,
      unidad: i.unidad,
      unidadChica: UNIDAD_CHICA[i.unidad],
      stock: porInsumo.get(i.id) ?? 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export type Movimiento = {
  id: string;
  clase: 'producto' | 'insumo';
  fecha: string;
  /** Nombre de lo que se movió. */
  que: string;
  /** Unidad en la que está expresada la cantidad. */
  unidad: string;
  cantidad: number;
  tipo: string;
  ubicacion: string | null;
  motivo: string | null;
  loteId: string | null;
  loteCodigo: string | null;
  /** A dónde apunta la fila: la ficha del tamaño o la del insumo. */
  ruta: string;
};

/** El libro de movimientos: las dos tablas en una sola línea de tiempo. */
export async function listarMovimientos(limite = 400): Promise<Movimiento[]> {
  const [prod, ins] = await Promise.all([
    supabase
      .from('movimientos_producto')
      .select(
        'id, fecha, cantidad, tipo, motivo, lote_id, tamano_id, ubicaciones (nombre), lotes (codigo), tamanos (nombre, magnitud, unidad, productos (nombre))',
      )
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
      .limit(limite),
    supabase
      .from('movimientos_insumo')
      .select(
        'id, fecha, cantidad, tipo, motivo, lote_id, insumo_id, lotes (codigo), insumos (nombre, unidad)',
      )
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
      .limit(limite),
  ]);

  const filasP = revisar(prod.data, prod.error) as unknown as {
    id: string;
    fecha: string;
    cantidad: number;
    tipo: TipoMovProducto;
    motivo: string | null;
    lote_id: string | null;
    tamano_id: string;
    ubicaciones: { nombre: string } | null;
    lotes: { codigo: string | null } | null;
    tamanos: {
      nombre: string | null;
      magnitud: number;
      unidad: string;
      productos: { nombre: string } | null;
    } | null;
  }[];

  const filasI = revisar(ins.data, ins.error) as unknown as {
    id: string;
    fecha: string;
    cantidad: number;
    tipo: TipoMovInsumo;
    motivo: string | null;
    lote_id: string | null;
    insumo_id: string;
    lotes: { codigo: string | null } | null;
    insumos: { nombre: string; unidad: UnidadInsumo } | null;
  }[];

  const movimientos: Movimiento[] = [
    ...filasP.map((f) => ({
      id: f.id,
      clase: 'producto' as const,
      fecha: f.fecha,
      que: `${f.tamanos?.productos?.nombre ?? '—'} · ${
        f.tamanos?.nombre?.trim() ||
        `${f.tamanos?.magnitud ?? ''} ${f.tamanos?.unidad ?? ''}`
      }`,
      unidad: 'u',
      cantidad: f.cantidad,
      tipo: ETIQUETA_MOV_PRODUCTO[f.tipo],
      ubicacion: f.ubicaciones?.nombre ?? null,
      motivo: f.motivo,
      loteId: f.lote_id,
      loteCodigo: f.lotes?.codigo ?? null,
      ruta: `/admin/productos/tamanos/${f.tamano_id}`,
    })),
    ...filasI.map((f) => ({
      id: f.id,
      clase: 'insumo' as const,
      fecha: f.fecha,
      que: f.insumos?.nombre ?? '—',
      unidad: UNIDAD_CHICA[f.insumos?.unidad ?? 'unidad'],
      cantidad: f.cantidad,
      tipo: ETIQUETA_MOV_INSUMO[f.tipo],
      ubicacion: null,
      motivo: f.motivo,
      loteId: f.lote_id,
      loteCodigo: f.lotes?.codigo ?? null,
      ruta: `/admin/insumos/${f.insumo_id}`,
    })),
  ];

  return movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Registrar un movimiento a mano.
 *
 * No hay contraparte para editar ni borrar, y no es un olvido: los movimientos
 * son inmutables por trigger en la base (§14.1). Un error se corrige con otro
 * movimiento de signo contrario, que deja rastro de que hubo una corrección.
 */
export async function registrarMovimientoProducto(entrada: {
  tamano_id: string;
  ubicacion_id: string;
  cantidad: number;
  tipo: TipoMovProducto;
  fecha: string;
  motivo: string | null;
}) {
  const { error } = await supabase.from('movimientos_producto').insert(entrada);
  if (error) throw new Error(error.message);
}

export async function registrarMovimientoInsumo(entrada: {
  insumo_id: string;
  cantidad: number;
  tipo: TipoMovInsumo;
  fecha: string;
  motivo: string | null;
}) {
  const { error } = await supabase.from('movimientos_insumo').insert(entrada);
  if (error) throw new Error(error.message);
}

/**
 * Un traslado son dos movimientos, no uno: sale de una ubicación y entra en
 * otra. El stock total no cambia; lo que cambia es dónde está.
 */
export async function trasladar(entrada: {
  tamano_id: string;
  origen_id: string;
  destino_id: string;
  cantidad: number;
  fecha: string;
  motivo: string | null;
}) {
  const { error } = await supabase.from('movimientos_producto').insert([
    {
      tamano_id: entrada.tamano_id,
      ubicacion_id: entrada.origen_id,
      cantidad: -Math.abs(entrada.cantidad),
      tipo: 'traslado' as const,
      fecha: entrada.fecha,
      motivo: entrada.motivo,
    },
    {
      tamano_id: entrada.tamano_id,
      ubicacion_id: entrada.destino_id,
      cantidad: Math.abs(entrada.cantidad),
      tipo: 'traslado' as const,
      fecha: entrada.fecha,
      motivo: entrada.motivo,
    },
  ]);
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------------------ recuentos

export type Recuento = {
  id: string;
  fecha: string;
  ubicacionId: string;
  ubicacion: string;
  estado: EstadoRecuento;
  esStockInicial: boolean;
  notas: string | null;
  lineas: number;
};

export async function listarRecuentos(): Promise<Recuento[]> {
  const [base, lineas] = await Promise.all([
    supabase
      .from('recuentos')
      .select(
        'id, fecha, ubicacion_id, estado, es_stock_inicial, notas, ubicaciones (nombre)',
      )
      .order('fecha', { ascending: false }),
    supabase.from('recuento_lineas').select('recuento_id'),
  ]);

  const filas = revisar(base.data, base.error) as unknown as {
    id: string;
    fecha: string;
    ubicacion_id: string;
    estado: EstadoRecuento;
    es_stock_inicial: boolean;
    notas: string | null;
    ubicaciones: { nombre: string } | null;
  }[];

  const cuantas = new Map<string, number>();
  for (const l of revisar(lineas.data, lineas.error))
    cuantas.set(l.recuento_id, (cuantas.get(l.recuento_id) ?? 0) + 1);

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    ubicacionId: f.ubicacion_id,
    ubicacion: f.ubicaciones?.nombre ?? '—',
    estado: f.estado,
    esStockInicial: f.es_stock_inicial,
    notas: f.notas,
    lineas: cuantas.get(f.id) ?? 0,
  }));
}

export async function obtenerRecuento(id: string): Promise<Recuento> {
  const todos = await listarRecuentos();
  const uno = todos.find((r) => r.id === id);
  if (!uno) throw new Error('Ese recuento no existe o no lo podés ver.');
  return uno;
}

export async function crearRecuento(datos: {
  fecha: string;
  ubicacion_id: string;
  es_stock_inicial: boolean;
  notas: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('recuentos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export type LineaRecuento = {
  id: string | null;
  tamanoId: string;
  producto: string;
  tamano: string;
  contada: number | null;
  /** Congelada al confirmar. Mientras está abierto se calcula al vuelo. */
  teorica: number | null;
};

/**
 * Las líneas del recuento, con el teórico al lado.
 *
 * Mientras el recuento está abierto se listan **todos** los tamaños del
 * catálogo, tengan línea cargada o no: contar es recorrer el estante entero, y
 * un tamaño que falta en la lista es un tamaño que nadie va a contar. Una vez
 * confirmado se muestra solo lo que se contó, con el teórico que quedó
 * congelado.
 */
export async function lineasDelRecuento(
  recuento: Recuento,
  tamanos: Tamano[],
): Promise<LineaRecuento[]> {
  const [lineas, stock] = await Promise.all([
    supabase
      .from('recuento_lineas')
      .select('id, tamano_id, cantidad_contada, cantidad_teorica')
      .eq('recuento_id', recuento.id),
    supabase
      .from('v_stock_producto')
      .select('tamano_id, stock')
      .eq('ubicacion_id', recuento.ubicacionId),
  ]);

  const filas = revisar(lineas.data, lineas.error);
  const porTamano = new Map(filas.map((f) => [f.tamano_id, f]));
  const teorico = new Map(
    revisar(stock.data, stock.error).map((s) => [
      s.tamano_id as string,
      Number(s.stock ?? 0),
    ]),
  );

  const confirmado = recuento.estado === 'confirmado';
  const candidatos = confirmado
    ? tamanos.filter((t) => porTamano.has(t.id))
    : tamanos.filter((t) => t.activo || porTamano.has(t.id));

  return candidatos.map((t) => {
    const l = porTamano.get(t.id);
    return {
      id: l?.id ?? null,
      tamanoId: t.id,
      producto: t.producto,
      tamano: etiquetaTamano(t),
      contada: l?.cantidad_contada ?? null,
      teorica: confirmado ? (l?.cantidad_teorica ?? null) : (teorico.get(t.id) ?? 0),
    };
  });
}

export async function guardarLineaRecuento(entrada: {
  recuento_id: string;
  tamano_id: string;
  cantidad_contada: number;
}) {
  const { error } = await supabase
    .from('recuento_lineas')
    .upsert(entrada, { onConflict: 'recuento_id,tamano_id' });
  if (error) throw new Error(error.message);
}

export async function borrarLineaRecuento(id: string) {
  const { error } = await supabase.from('recuento_lineas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Confirmar congela el teórico de cada línea y emite un ajuste por la
 * diferencia. No pisa ningún número: la corrección es un movimiento más, y por
 * eso no se puede deshacer.
 */
export async function confirmarRecuento(id: string) {
  const { error } = await supabase.rpc('recuento_confirmar', { p_recuento_id: id });
  if (error) throw new Error(error.message);
}

export async function borrarRecuento(id: string) {
  const { error } = await supabase.from('recuentos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
