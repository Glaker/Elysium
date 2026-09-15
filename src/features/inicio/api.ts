import { listarDeudores } from '@/features/deudores/api';
import { listarGastos } from '@/features/gastos/api';
import { contarPendientes } from '@/features/solicitudes/api';
import { listarVentas } from '@/features/ventas/api';

export type Resumen = {
  pendientes: number;
  borradores: number;
  deudaTotal: number;
  deudores: number;
  ventasDelMes: number;
  cuantasVentas: number;
  gastosDelMes: number;
};

/**
 * Lo que el admin necesita saber antes de elegir a dónde ir.
 *
 * No hay consultas nuevas: son las mismas que ya usan las cuatro pantallas de
 * las que sale cada número. Un resumen que calcula por su cuenta es un resumen
 * que en algún momento va a decir algo distinto que la pantalla que resume.
 */
export async function cargarResumen(): Promise<Resumen> {
  const [pendientes, ventas, deudores, gastos] = await Promise.all([
    contarPendientes(),
    listarVentas(),
    listarDeudores(),
    listarGastos(),
  ]);

  const mes = new Date().toISOString().slice(0, 7);
  const delMes = ventas.filter(
    (v) => v.estado === 'confirmada' && v.fecha.startsWith(mes),
  );
  const deben = deudores.filter((d) => d.deudaTotal > 0);

  return {
    pendientes,
    borradores: ventas.filter((v) => v.estado === 'borrador').length,
    deudaTotal: deben.reduce((s, d) => s + d.deudaTotal, 0),
    deudores: deben.length,
    ventasDelMes: delMes.reduce((s, v) => s + v.total, 0),
    cuantasVentas: delMes.length,
    gastosDelMes: gastos
      .filter((g) => g.fecha.startsWith(mes))
      .reduce((s, g) => s + g.total, 0),
  };
}
