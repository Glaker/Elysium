const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const pesosConCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dolares = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export type Moneda = 'ARS' | 'USD';

export const plata = (n: number) => pesos.format(n);
export const plataExacta = (n: number) => pesosConCentavos.format(n);
export const cantidad = (n: number) => numero.format(n);

/**
 * Importe en la moneda en la que está cargado. Los precios en dólares se
 * guardan en dólares (MODELO §Insumos): mostrarlos convertidos escondería que
 * el número se mueve solo cuando cambia el tipo de cambio.
 */
export const importe = (n: number, moneda: Moneda = 'ARS') =>
  moneda === 'USD' ? dolares.format(n) : pesosConCentavos.format(n);

/** `2026-09-05` → `05/09/2026`. Sin `new Date()`: evita el corrimiento de zona. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Fecha de hoy en el formato que espera `<input type="date">`. */
export function hoyISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Días transcurridos entre una fecha ISO y hoy. */
export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(ms)) return null;
  const hoy = Date.parse(`${hoyISO()}T00:00:00`);
  return Math.round((hoy - ms) / 86_400_000);
}

/** La unidad chica de cada unidad de compra (MODELO §1). */
export const UNIDAD_CHICA: Record<string, string> = { kg: 'g', l: 'ml', unidad: 'u' };
