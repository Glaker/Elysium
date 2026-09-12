import type { UnidadInsumo } from '@/features/insumos/api';
import type { Database } from '@/lib/database.types';
import { UNIDAD_CHICA } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export type TipoGasto = Database['public']['Enums']['tipo_gasto'];

/**
 * Los tipos que Johanna ya usa en el Excel, más los dos que pidió agregar
 * (§9). "Otros" deja de ser un residuo calculado por diferencia y pasa a ser
 * una categoría que se elige.
 */
export const ETIQUETA_TIPO_GASTO: Record<TipoGasto, string> = {
  materia_prima: 'Materia prima',
  envases: 'Envases',
  etiquetas: 'Etiquetas',
  regalias: 'Regalías',
  mano_de_obra: 'Mano de obra',
  libreria: 'Librería',
  publicidad: 'Publicidad',
  otros: 'Otros',
};

/** Los tipos que suelen corresponder a la compra de un insumo concreto. */
export const TIPOS_DE_INSUMO: TipoGasto[] = ['materia_prima', 'envases', 'etiquetas'];

export type Gasto = {
  id: string;
  fecha: string;
  tipo: TipoGasto;
  descripcion: string | null;
  insumoId: string | null;
  insumo: string | null;
  /** En unidad chica del insumo, si el gasto es la compra de uno. */
  cantidad: number | null;
  unidadChica: string | null;
  costoUnitario: number | null;
  total: number;
  proveedorId: string | null;
  proveedor: string | null;
  formaPago: string | null;
  cuentaId: string | null;
  cuenta: string | null;
  comentario: string | null;
};

export async function listarGastos(): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from('gastos')
    .select(
      'id, fecha, tipo, descripcion, insumo_id, cantidad, costo_unitario, total, proveedor_id, forma_pago, cuenta_id, comentario, insumos (nombre, unidad), proveedores (nombre), cuentas (nombre)',
    )
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false });
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    fecha: string;
    tipo: TipoGasto;
    descripcion: string | null;
    insumo_id: string | null;
    cantidad: number | null;
    costo_unitario: number | null;
    total: number;
    proveedor_id: string | null;
    forma_pago: string | null;
    cuenta_id: string | null;
    comentario: string | null;
    insumos: { nombre: string; unidad: UnidadInsumo } | null;
    proveedores: { nombre: string } | null;
    cuentas: { nombre: string } | null;
  }[];

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    tipo: f.tipo,
    descripcion: f.descripcion,
    insumoId: f.insumo_id,
    insumo: f.insumos?.nombre ?? null,
    cantidad: f.cantidad,
    unidadChica: f.insumos ? UNIDAD_CHICA[f.insumos.unidad] : null,
    costoUnitario: f.costo_unitario,
    total: Number(f.total),
    proveedorId: f.proveedor_id,
    proveedor: f.proveedores?.nombre ?? null,
    formaPago: f.forma_pago,
    cuentaId: f.cuenta_id,
    cuenta: f.cuentas?.nombre ?? null,
    comentario: f.comentario,
  }));
}

export type DatosGasto = {
  fecha: string;
  tipo: TipoGasto;
  descripcion: string | null;
  insumo_id: string | null;
  cantidad: number | null;
  costo_unitario: number | null;
  total: number;
  proveedor_id: string | null;
  forma_pago: string | null;
  cuenta_id: string | null;
  comentario: string | null;
};

/**
 * Registrar un gasto.
 *
 * Si lleva insumo y cantidad, un trigger de la base emite además la entrada de
 * stock: comprar un insumo y darlo de alta son el mismo hecho y se registran
 * una sola vez. Lo que **no** hace es pisar el precio de lista — una compra
 * puntual puede ser a precio atípico, y actualizar la lista en silencio
 * rompería el costo de todo lo que use ese insumo.
 */
export async function crearGasto(datos: DatosGasto) {
  const { error } = await supabase.from('gastos').insert(datos);
  if (error) throw new Error(error.message);
}

/**
 * Editar un gasto **no** toca el movimiento de stock que generó al crearse: el
 * trigger corre solo al insertar, y los movimientos son inmutables. Por eso la
 * app solo deja editar lo que no afecta al stock.
 */
export async function actualizarGasto(
  id: string,
  datos: Omit<DatosGasto, 'insumo_id' | 'cantidad'>,
) {
  const { error } = await supabase.from('gastos').update(datos).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function borrarGasto(id: string) {
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type ResumenTipo = { tipo: TipoGasto; total: number; cuantos: number };

/** El resumen por tipo que pide §9, sobre el período que se esté mirando. */
export function resumirPorTipo(gastos: Gasto[]): ResumenTipo[] {
  const por = new Map<TipoGasto, ResumenTipo>();
  for (const g of gastos) {
    const actual = por.get(g.tipo) ?? { tipo: g.tipo, total: 0, cuantos: 0 };
    actual.total += g.total;
    actual.cuantos += 1;
    por.set(g.tipo, actual);
  }
  return [...por.values()].sort((a, b) => b.total - a.total);
}
