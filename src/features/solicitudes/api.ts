import type { Variante } from '@/features/productos/api';
import type { TipoVenta } from '@/features/ventas/api';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type TipoSolicitud = Database['public']['Enums']['tipo_solicitud'];
export type EstadoSolicitud = Database['public']['Enums']['estado_solicitud'];

export const ETIQUETA_TIPO: Record<TipoSolicitud, string> = {
  producto: 'Producto',
  materia_prima: 'Materia prima',
};

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Resuelto',
  rechazada: 'Rechazado',
  cancelada: 'Cancelado',
};

export type LineaSolicitud = {
  id: string;
  tamanoId: string | null;
  descripcion: string;
  variante: Variante;
  cantidad: number;
};

/**
 * Un pedido. **No reserva stock** (§11): es el aviso que reemplaza al WhatsApp,
 * y entre que entra y se atiende puede haber pasado cualquier cosa con el stock.
 * Por eso aprobarlo crea una venta en borrador y no una confirmada.
 */
export type Solicitud = {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  fecha: string;
  personaId: string;
  persona: string;
  /** Define el tipo de venta que se propone al aprobar: quien revende paga el costo (§2). */
  esRevendedor: boolean;
  /** Solo en materia prima: qué va a fabricar. */
  tamanoObjetivoId: string | null;
  tamanoObjetivo: string | null;
  unidadesObjetivo: number | null;
  notas: string | null;
  resueltaEn: string | null;
  /** Solo en materia prima: el lote que se abrió con este pedido, si ya se abrió. */
  loteId: string | null;
  lineas: LineaSolicitud[];
};

type FilaTamano = {
  nombre: string | null;
  magnitud: number;
  unidad: string;
  productos: { nombre: string } | null;
} | null;

const etiqueta = (t: FilaTamano) =>
  t
    ? `${t.productos?.nombre ?? '—'} · ${t.nombre?.trim() || `${t.magnitud} ${t.unidad}`}`
    : '—';

export async function listarSolicitudes(): Promise<Solicitud[]> {
  const [base, lineas] = await Promise.all([
    supabase
      .from('solicitudes')
      .select(
        'id, tipo, estado, fecha, persona_id, unidades_objetivo, tamano_objetivo_id, notas, resuelta_en, lote_id, personas (nombre_completo, es_revendedor), tamanos (nombre, magnitud, unidad, productos (nombre))',
      )
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false }),
    supabase
      .from('solicitud_lineas')
      .select(
        'id, solicitud_id, tamano_id, variante, cantidad, tamanos (nombre, magnitud, unidad, productos (nombre)), insumos (nombre)',
      ),
  ]);

  if (base.error) throw new Error(base.error.message);
  if (lineas.error) throw new Error(lineas.error.message);

  const filas = base.data as unknown as {
    id: string;
    tipo: TipoSolicitud;
    estado: EstadoSolicitud;
    fecha: string;
    persona_id: string;
    unidades_objetivo: number | null;
    tamano_objetivo_id: string | null;
    notas: string | null;
    resuelta_en: string | null;
    lote_id: string | null;
    personas: { nombre_completo: string | null; es_revendedor: boolean } | null;
    tamanos: FilaTamano;
  }[];

  const sueltas = lineas.data as unknown as {
    id: string;
    solicitud_id: string;
    tamano_id: string | null;
    variante: Variante;
    cantidad: number;
    tamanos: FilaTamano;
    insumos: { nombre: string } | null;
  }[];

  const porSolicitud = new Map<string, LineaSolicitud[]>();
  for (const l of sueltas) {
    const lista = porSolicitud.get(l.solicitud_id) ?? [];
    lista.push({
      id: l.id,
      tamanoId: l.tamano_id,
      descripcion: l.tamano_id ? etiqueta(l.tamanos) : (l.insumos?.nombre ?? '—'),
      variante: l.variante,
      cantidad: Number(l.cantidad),
    });
    porSolicitud.set(l.solicitud_id, lista);
  }

  return filas.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    estado: f.estado,
    fecha: f.fecha,
    personaId: f.persona_id,
    persona: f.personas?.nombre_completo ?? '—',
    esRevendedor: f.personas?.es_revendedor ?? false,
    tamanoObjetivoId: f.tamano_objetivo_id,
    tamanoObjetivo: f.tamano_objetivo_id ? etiqueta(f.tamanos) : null,
    unidadesObjetivo: f.unidades_objetivo == null ? null : Number(f.unidades_objetivo),
    notas: f.notas,
    resueltaEn: f.resuelta_en,
    loteId: f.lote_id,
    lineas: (porSolicitud.get(f.id) ?? []).sort((a, b) =>
      a.descripcion.localeCompare(b.descripcion, 'es'),
    ),
  }));
}

/** Para la marca de la barra lateral: cuántos pedidos esperan respuesta. */
export async function contarPendientes(): Promise<number> {
  const { count, error } = await supabase
    .from('solicitudes')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function resolverSolicitud(id: string, estado: EstadoSolicitud) {
  const { error } = await supabase.rpc('resolver_solicitud', {
    p_solicitud_id: id,
    p_estado: estado,
  });
  if (error) throw new Error(error.message);
}

/**
 * Convierte el pedido en una venta **en borrador** y devuelve su id.
 *
 * Borrador y no confirmada porque confirmar congela importes y descuenta stock:
 * eso se decide mirando la venta, no el pedido. Las tres escrituras (venta,
 * líneas, estado del pedido) pasan juntas del lado de la base.
 */
/**
 * Abrir el lote de un pedido de materia prima.
 *
 * El equivalente de `aprobarComoVenta` para el otro tipo de pedido: en vez de
 * una venta en borrador, deja un lote abierto con la persona que pidió como
 * responsable y los insumos ya planificados desde la fórmula. Es lo que después
 * le permite a ella cargar el resultado, que sin lote no tendría dónde entrar.
 */
export async function abrirLoteDelPedido(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('lote_desde_solicitud', {
    p_solicitud_id: id,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function aprobarComoVenta(id: string, tipo: TipoVenta): Promise<string> {
  const { data, error } = await supabase.rpc('aprobar_solicitud_como_venta', {
    p_solicitud_id: id,
    p_tipo: tipo,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export type Necesidad = {
  insumo: string;
  unidad: string;
  cantidad_formula: number;
  merma: number;
  cantidad_necesaria: number;
  lleva_merma: boolean;
};

/**
 * Qué insumos hay que entregar para un pedido de materia prima. Es la misma
 * cuenta que vio quien lo pidió, resuelta de nuevo con la fórmula de hoy.
 */
export async function insumosDelPedido(
  tamanoId: string,
  unidades: number,
): Promise<Necesidad[]> {
  const { data, error } = await supabase.rpc('calcular_insumos', {
    p_tamano_id: tamanoId,
    p_unidades: unidades,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Necesidad[];
}
