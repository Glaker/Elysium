import type { UnidadInsumo } from '@/features/insumos/api';
import type { Desglose, Variante } from '@/features/productos/api';
import { hoyISO } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

/** Un insumo que hay que cotizar para que el costo del tamaño cierre. */
export type SinPrecio = { insumoId: string; nombre: string; unidad: UnidadInsumo };

export async function insumosSinPrecio(
  tamanoId: string,
  variante: Variante = 'elysium',
): Promise<SinPrecio[]> {
  const { data, error } = await supabase.rpc('insumos_sin_precio_tamano', {
    p_tamano_id: tamanoId,
    p_variante: variante,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    insumoId: f.insumo_id,
    nombre: f.nombre,
    unidad: f.unidad,
  }));
}

/**
 * El costo del tamaño calculado con precios que no están en la base.
 *
 * Los precios van en la unidad de compra y en pesos, igual que en la lista. El
 * cálculo corre del lado del servidor con la misma lógica que el costo real
 * —incluida la recursión de las MP intermedias— y no escribe nada: es la parte
 * de "sin guardarlos" que pidió Johanna.
 */
export async function simularCosto(
  tamanoId: string,
  variante: Variante,
  precios: Record<string, number>,
  mermaPct?: number | null,
): Promise<Desglose> {
  const { data, error } = await supabase.rpc('simular_costo_tamano', {
    p_tamano_id: tamanoId,
    p_variante: variante,
    p_precios: precios,
    p_fecha: hoyISO(),
    ...(mermaPct != null ? { p_merma_pct: mermaPct } : {}),
  });
  if (error) throw new Error(error.message);

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

/** El valor vigente de un parámetro global. Nulo si nunca se le cargó uno. */
export async function parametroValor(clave: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('parametro_valores')
    .select('valor')
    .eq('parametro', clave)
    .lte('vigente_desde', hoyISO())
    .order('vigente_desde', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.valor ?? null;
}

export type NecesidadInsumo = {
  insumo: string;
  unidad: UnidadInsumo;
  cantidadFormula: number;
  merma: number;
  cantidadNecesaria: number;
  llevaMerma: boolean;
};

/**
 * La calculadora de ingredientes (§11): para producir X unidades, cuánto hace
 * falta de cada insumo con la merma ya sumada. La merma va solo sobre materia
 * prima — un envase no se evapora.
 */
export async function calcularInsumos(
  tamanoId: string,
  unidades: number,
  variante: Variante = 'elysium',
  mermaPct?: number | null,
): Promise<NecesidadInsumo[]> {
  const { data, error } = await supabase.rpc('calcular_insumos', {
    p_tamano_id: tamanoId,
    p_unidades: unidades,
    p_variante: variante,
    ...(mermaPct != null ? { p_merma_pct: mermaPct } : {}),
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    insumo: f.insumo,
    unidad: f.unidad,
    cantidadFormula: f.cantidad_formula,
    merma: f.merma,
    cantidadNecesaria: f.cantidad_necesaria,
    llevaMerma: f.lleva_merma,
  }));
}
