import { supabase } from '@/lib/supabase';

export type Deuda = {
  total: number;
  ventas: number;
  detalle: { fecha: string; saldo: number }[];
};

/**
 * Lo que debe una persona, con el detalle de qué entrega es cada peso.
 *
 * Vive fuera del componente que lo muestra porque se pide en el arranque, junto
 * con la sesión: es lo que evita que la banda aparezca un instante después del
 * resto y empuje toda la pantalla hacia abajo. (Y en su propio archivo porque un
 * módulo que exporta componentes y funciones rompe Fast Refresh.)
 *
 * La deuda no se guarda en ningún lado: sale de restarle a cada venta lo que se
 * le imputó (MODELO §Comercial), por eso son dos vistas y no una tabla.
 */
export async function cargarDeuda(personaId: string | undefined): Promise<Deuda | null> {
  if (!personaId) return null;
  const [{ data: total }, { data: detalle }] = await Promise.all([
    supabase
      .from('v_deuda_persona')
      .select('deuda_total, ventas_impagas')
      .eq('persona_id', personaId)
      .maybeSingle(),
    supabase
      .from('v_deuda_venta')
      .select('fecha, saldo')
      .eq('persona_id', personaId)
      .gt('saldo', 0)
      .order('fecha', { ascending: true }),
  ]);
  return {
    total: Number(total?.deuda_total ?? 0),
    ventas: Number(total?.ventas_impagas ?? 0),
    detalle: (detalle ?? []).map((d) => ({
      fecha: String(d.fecha),
      saldo: Number(d.saldo),
    })),
  };
}
