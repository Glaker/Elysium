import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type ResultadoLote = Database['public']['Enums']['resultado_lote'];

export const ETIQUETA_RESULTADO: Record<ResultadoLote, string> = {
  ok: 'Salió bien',
  reproceso: 'Hay que reprocesarlo',
  descarte: 'Se descartó entero',
};

/**
 * Un lote del que la persona logueada es responsable.
 *
 * Sale de `mis_lotes()`, una función `SECURITY DEFINER`, y no de un `select`
 * sobre `lotes`: el RLS filtra filas, no columnas, y darle acceso a la fila le
 * abriría el costo congelado de esa misma producción. Acá no viaja ningún
 * número de plata — ni costo, ni valor hora, ni regalías.
 */
export type MiLote = {
  id: string;
  fecha: string;
  producto: string;
  tamano: string;
  unidadesPlanificadas: number;
  unidadesObtenidas: number | null;
  perdidaCantidad: number | null;
  resultado: ResultadoLote | null;
  /** Cerrado significa que la administración ya lo revisó: deja de ser editable. */
  cerrado: boolean;
  reportadoEn: string | null;
  notas: string | null;
};

export async function misLotes(): Promise<MiLote[]> {
  const { data, error } = await supabase.rpc('mis_lotes');
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    fecha: l.fecha,
    producto: l.producto ?? '—',
    tamano: l.tamano ?? '',
    unidadesPlanificadas: Number(l.unidades_planificadas),
    unidadesObtenidas: l.unidades_obtenidas == null ? null : Number(l.unidades_obtenidas),
    perdidaCantidad: l.perdida_cantidad == null ? null : Number(l.perdida_cantidad),
    resultado: l.resultado,
    cerrado: l.estado === 'cerrado',
    reportadoEn: l.reportado_en,
    notas: l.notas,
  }));
}

/** Quién trabajó y cuántas horas. Sin importes: la plata la pone la administración. */
export type Trabajo = { personaId: string; nombre: string; horas: number | null };

export async function trabajoDelLote(loteId: string): Promise<Trabajo[]> {
  const { data, error } = await supabase.rpc('mi_lote_personas', { p_lote_id: loteId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({
    personaId: t.persona_id,
    nombre: t.nombre,
    horas: t.horas == null ? null : Number(t.horas),
  }));
}

/**
 * Con quién se puede decir que se trabajó: productoras activas y uno mismo.
 *
 * El padrón entero es la lista de clientas de Johanna y una productora solo ve
 * su propia ficha, así que la lista viene de una función que devuelve nombres e
 * ids y nada más.
 */
export async function companeras(): Promise<{ id: string; nombre: string }[]> {
  const { data, error } = await supabase.rpc('companeras_de_produccion');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Reporte = {
  resultado: ResultadoLote;
  unidadesObtenidas: number;
  perdidaCantidad: number | null;
  notas: string | null;
  personas: { persona_id: string; horas: number | null }[];
};

/**
 * Cargar el resultado. **No cierra el lote**: cerrar congela costos y merma y es
 * un acto de administración. Esto declara qué pasó, y se puede volver a cargar
 * mientras el lote siga abierto — el primer número que se escribe después de una
 * jornada de trabajo no siempre es el bueno.
 */
export async function registrarResultado(loteId: string, r: Reporte) {
  const { error } = await supabase.rpc('registrar_resultado_lote', {
    p_lote_id: loteId,
    p_resultado: r.resultado,
    p_unidades_obtenidas: r.unidadesObtenidas,
    p_perdida_cantidad: r.perdidaCantidad,
    p_notas: r.notas,
    p_personas: r.personas,
  });
  if (error) throw new Error(error.message);
}
