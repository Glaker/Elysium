import { supabase } from '@/lib/supabase';

/**
 * Los tres datos que cada uno puede corregir de su propia ficha.
 *
 * Pasa por `actualizar_mis_datos` y no por un update a `personas`: la tabla es
 * admin-only a propósito, y una policy no puede limitar **qué columnas** se
 * escriben —con el update abierto, cualquiera se pondría `es_revendedor` desde
 * la consola del navegador. La función escribe esas tres columnas y ninguna más,
 * y mantiene en sincronía el nombre de `perfiles`, que es el que saluda la app.
 */
export async function guardarMisDatos(datos: {
  nombre: string;
  apellido: string;
  telefono: string;
}): Promise<void> {
  const { error } = await supabase.rpc('actualizar_mis_datos', {
    p_nombre: datos.nombre.trim(),
    p_apellido: datos.apellido.trim(),
    p_telefono: datos.telefono.trim(),
  });
  if (error) throw new Error(error.message);
}
