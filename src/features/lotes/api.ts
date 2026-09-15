import type { Costo, UnidadInsumo } from '@/features/insumos/api';
import type { UnidadTamano, Variante } from '@/features/productos/api';
import type { Database } from '@/lib/database.types';
import { UNIDAD_CHICA } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export type EstadoLote = Database['public']['Enums']['estado_lote'];
export type ResultadoLote = Database['public']['Enums']['resultado_lote'];

export const ETIQUETA_RESULTADO: Record<ResultadoLote, string> = {
  ok: 'Salió bien',
  descarte: 'Descarte',
  reproceso: 'Reproceso',
};

/**
 * Qué produce un lote. El destino es excluyente por restricción de la base: un
 * lote hace un tamaño de producto terminado **o** una MP intermedia, nunca los
 * dos (MODELO §Producción).
 */
export type DestinoLote = 'producto' | 'mp';

export type Lote = {
  id: string;
  codigo: string | null;
  fecha: string;
  estado: EstadoLote;
  resultado: ResultadoLote | null;
  destino: DestinoLote;
  /**
   * Qué versión se produce. Solo significa algo en un producto terminado: una
   * MP intermedia no lleva etiqueta ni presentación. Desde la migración 09, el
   * plan de consumo la respeta — antes un lote de marca blanca descontaba la
   * etiqueta Elysium del stock.
   */
  variante: Variante;
  tamanoId: string | null;
  insumoProducidoId: string | null;
  /** Nombre legible de lo que produce. */
  produce: string;
  /**
   * La unidad de `planificadas` y `obtenidas`. Para un producto terminado son
   * unidades; para una MP intermedia es la unidad chica (g / ml), **no tandas**.
   */
  unidad: string;
  planificadas: number;
  obtenidas: number | null;
  perdida: number | null;
  responsableId: string | null;
  responsable: string | null;
  notas: string | null;
  /** Parámetros congelados al cierre. Nulos mientras el lote está abierto. */
  mermaAplicada: number | null;
  valorHoraAplicado: number | null;
  regaliasAplicado: number | null;
  costoInsumos: number | null;
  costoManoObra: number | null;
  /** Si la mano de obra sale de lo pagado a personas o de la estimación. */
  manoObraReal: boolean;
  costoRegalias: number | null;
  costoTotal: number | null;
  /** El costo real de una unidad de ESTE lote, no el teórico de la fórmula. */
  costoUnitario: number | null;
  costoCompleto: boolean | null;
  costoFaltantes: string[];
};

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

type FilaLote = {
  id: string;
  codigo: string | null;
  fecha: string;
  estado: EstadoLote;
  resultado: ResultadoLote | null;
  variante: Variante;
  tamano_id: string | null;
  insumo_producido_id: string | null;
  unidades_planificadas: number;
  unidades_obtenidas: number | null;
  perdida_cantidad: number | null;
  merma_pct_aplicado: number | null;
  valor_hora_aplicado: number | null;
  regalias_aplicado: number | null;
  responsable_persona_id: string | null;
  notas: string | null;
  personas: { nombre_completo: string | null } | null;
  tamanos: {
    nombre: string | null;
    magnitud: number;
    unidad: UnidadTamano;
    productos: { nombre: string } | null;
  } | null;
  insumos: { nombre: string; unidad: UnidadInsumo } | null;
};

/**
 * Los lotes con su costo real.
 *
 * El costo no se recalcula acá: sale de `v_lote_costo`, que suma lo que quedó
 * **congelado** en el lote al cerrarlo. Un lote cerrado no cambia de costo
 * porque después suba un insumo — esa es toda la diferencia entre el costo
 * teórico de la fórmula y el costo de lo que efectivamente pasó.
 */
export async function listarLotes(): Promise<Lote[]> {
  const [base, costos] = await Promise.all([
    supabase
      .from('lotes')
      .select(
        'id, codigo, fecha, estado, resultado, variante, tamano_id, insumo_producido_id, unidades_planificadas, unidades_obtenidas, perdida_cantidad, merma_pct_aplicado, valor_hora_aplicado, regalias_aplicado, responsable_persona_id, notas, personas (nombre_completo), tamanos (nombre, magnitud, unidad, productos (nombre)), insumos (nombre, unidad)',
      )
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false }),
    supabase
      .from('v_lote_costo')
      .select(
        'lote_id, costo_insumos, costo_mano_obra, mano_obra_real, costo_regalias, costo_total, costo_unitario_real, costo_completo, costo_faltantes',
      ),
  ]);

  const filas = revisar(base.data, base.error) as unknown as FilaLote[];
  const porLote = new Map(
    revisar(costos.data, costos.error).map((c) => [c.lote_id as string, c]),
  );

  return filas.map((f) => {
    const c = porLote.get(f.id);
    const esProducto = f.tamano_id != null;
    const t = f.tamanos;

    return {
      id: f.id,
      codigo: f.codigo,
      fecha: f.fecha,
      estado: f.estado,
      resultado: f.resultado,
      destino: esProducto ? 'producto' : 'mp',
      variante: f.variante,
      tamanoId: f.tamano_id,
      insumoProducidoId: f.insumo_producido_id,
      produce: esProducto
        ? `${t?.productos?.nombre ?? '—'} · ${t?.nombre?.trim() || `${t?.magnitud ?? ''} ${t?.unidad ?? ''}`}`
        : (f.insumos?.nombre ?? '—'),
      unidad: esProducto ? 'u' : UNIDAD_CHICA[f.insumos?.unidad ?? 'unidad'],
      planificadas: f.unidades_planificadas,
      obtenidas: f.unidades_obtenidas,
      perdida: f.perdida_cantidad,
      responsableId: f.responsable_persona_id,
      responsable: f.personas?.nombre_completo ?? null,
      notas: f.notas,
      mermaAplicada: f.merma_pct_aplicado,
      valorHoraAplicado: f.valor_hora_aplicado,
      regaliasAplicado: f.regalias_aplicado,
      costoInsumos: c?.costo_insumos ?? null,
      costoManoObra: c?.costo_mano_obra ?? null,
      manoObraReal: Boolean(c?.mano_obra_real),
      costoRegalias: c?.costo_regalias ?? null,
      costoTotal: c?.costo_total ?? null,
      costoUnitario: c?.costo_unitario_real ?? null,
      costoCompleto: c?.costo_completo ?? null,
      costoFaltantes: c?.costo_faltantes ?? [],
    };
  });
}

export async function obtenerLote(id: string): Promise<Lote> {
  const todos = await listarLotes();
  const uno = todos.find((l) => l.id === id);
  if (!uno) throw new Error('Ese lote no existe o no lo podés ver.');
  return uno;
}

export type DatosLote = {
  codigo: string | null;
  fecha: string;
  variante: Variante;
  tamano_id: string | null;
  insumo_producido_id: string | null;
  unidades_planificadas: number;
  responsable_persona_id: string | null;
  notas: string | null;
};

/**
 * Crear un lote y planificarlo de una vez.
 *
 * Son dos pasos en la base — insertar y después `lote_planificar` — pero un
 * lote sin plan de insumos no sirve para nada, así que la app no ofrece el
 * estado intermedio.
 */
export async function crearLote(datos: DatosLote): Promise<string> {
  const { data, error } = await supabase
    .from('lotes')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  await planificar(data.id);
  return data.id;
}

export async function actualizarLote(id: string, datos: Partial<DatosLote>) {
  const { error } = await supabase.from('lotes').update(datos).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Vuelve a armar el plan de insumos desde la fórmula vigente. Solo funciona con
 * el lote abierto: lo que consumió un lote cerrado es un hecho, no un cálculo.
 */
export async function planificar(loteId: string) {
  const { error } = await supabase.rpc('lote_planificar', { p_lote_id: loteId });
  if (error) throw new Error(error.message);
}

export async function borrarLote(id: string) {
  const { error } = await supabase.from('lotes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type InsumoDelLote = {
  id: string;
  insumoId: string;
  nombre: string;
  /** Unidad de compra; las cantidades van en su unidad chica. */
  unidad: UnidadInsumo;
  unidadChica: string;
  planificada: number;
  consumida: number | null;
  costoUnitario: number | null;
  costoTotal: number | null;
  /** Stock actual del insumo, en unidad chica. Nulo = nunca tuvo movimientos. */
  stock: number | null;
};

/** El plan de consumo del lote, con el stock disponible de cada insumo. */
export async function insumosDelLote(loteId: string): Promise<InsumoDelLote[]> {
  const [plan, stock] = await Promise.all([
    supabase
      .from('lote_insumos')
      .select(
        'id, insumo_id, cantidad_planificada, cantidad_consumida, costo_unitario_congelado, costo_total_congelado, insumos (nombre, unidad)',
      )
      .eq('lote_id', loteId),
    supabase.from('v_stock_insumo').select('insumo_id, stock'),
  ]);

  const filas = revisar(plan.data, plan.error) as unknown as {
    id: string;
    insumo_id: string;
    cantidad_planificada: number;
    cantidad_consumida: number | null;
    costo_unitario_congelado: number | null;
    costo_total_congelado: number | null;
    insumos: { nombre: string; unidad: UnidadInsumo } | null;
  }[];

  const porInsumo = new Map(
    revisar(stock.data, stock.error).map((s) => [s.insumo_id as string, s.stock]),
  );

  return filas
    .map((f) => {
      const unidad = f.insumos?.unidad ?? 'unidad';
      return {
        id: f.id,
        insumoId: f.insumo_id,
        nombre: f.insumos?.nombre ?? '—',
        unidad,
        unidadChica: UNIDAD_CHICA[unidad],
        planificada: f.cantidad_planificada,
        consumida: f.cantidad_consumida,
        costoUnitario: f.costo_unitario_congelado,
        costoTotal: f.costo_total_congelado,
        stock: porInsumo.get(f.insumo_id) ?? null,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export type PersonaDelLote = {
  id: string;
  personaId: string;
  nombre: string;
  horas: number | null;
  importePagado: number | null;
  notas: string | null;
};

export async function personasDelLote(loteId: string): Promise<PersonaDelLote[]> {
  const { data, error } = await supabase
    .from('lote_personas')
    .select('id, persona_id, horas, importe_pagado, notas, personas (nombre_completo)')
    .eq('lote_id', loteId);
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    persona_id: string;
    horas: number | null;
    importe_pagado: number | null;
    notas: string | null;
    personas: { nombre_completo: string | null } | null;
  }[];

  return filas.map((f) => ({
    id: f.id,
    personaId: f.persona_id,
    nombre: f.personas?.nombre_completo ?? '—',
    horas: f.horas,
    importePagado: f.importe_pagado,
    notas: f.notas,
  }));
}

export async function guardarPersonaLote(
  datos: {
    lote_id: string;
    persona_id: string;
    horas: number | null;
    importe_pagado: number | null;
    notas: string | null;
  },
  id?: string,
) {
  const { error } = id
    ? await supabase.from('lote_personas').update(datos).eq('id', id)
    : await supabase.from('lote_personas').insert(datos);
  if (error) throw new Error(error.message);
}

export async function borrarPersonaLote(id: string) {
  const { error } = await supabase.from('lote_personas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Cerrar el lote: congela los costos y los parámetros del día, y emite los
 * movimientos de stock — la salida de los insumos consumidos y la entrada de lo
 * producido. No tiene vuelta atrás: los movimientos de stock son inmutables por
 * trigger, y corregir es emitir otro movimiento, no borrar este.
 */
export async function cerrarLote(entrada: {
  loteId: string;
  resultado: ResultadoLote;
  unidadesObtenidas: number;
  mermaPct?: number | null;
  perdida?: number | null;
  ubicacionId?: string | null;
}) {
  const { error } = await supabase.rpc('cerrar_lote', {
    p_lote_id: entrada.loteId,
    p_resultado: entrada.resultado,
    p_unidades_obtenidas: entrada.unidadesObtenidas,
    ...(entrada.mermaPct != null ? { p_merma_pct: entrada.mermaPct } : {}),
    ...(entrada.perdida != null ? { p_perdida_cantidad: entrada.perdida } : {}),
    ...(entrada.ubicacionId ? { p_ubicacion_id: entrada.ubicacionId } : {}),
  });
  if (error) throw new Error(error.message);
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

export type { Costo };
