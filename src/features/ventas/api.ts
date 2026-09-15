import { etiquetaTamano, type Tamano, type Variante } from '@/features/productos/api';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type TipoVenta = Database['public']['Enums']['tipo_venta'];
export type EstadoVenta = Database['public']['Enums']['estado_venta'];
export type OrigenImporte = Database['public']['Enums']['origen_importe'];

export const ETIQUETA_TIPO_VENTA: Record<TipoVenta, string> = {
  directa: 'Venta directa',
  entrega_reventa: 'Entrega para reventa',
};

/**
 * De dónde salió el importe congelado de una línea. No es un detalle técnico:
 * es la diferencia entre "le cobré el precio de lista" y "le cobré el costo",
 * que es justamente lo que separa a un cliente de un revendedor (§2).
 */
export const ETIQUETA_ORIGEN: Record<OrigenImporte, string> = {
  precio_venta: 'Precio de venta',
  costo: 'Costo',
  manual: 'Puesto a mano',
};

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

export type Cuenta = {
  id: string;
  nombre: string;
  alias: string | null;
  activo: boolean;
};

export async function listarCuentas(): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('id, nombre, alias_transferencia, activo')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    alias: c.alias_transferencia,
    activo: c.activo,
  }));
}

export async function guardarCuenta(
  datos: { nombre: string; alias_transferencia: string | null; activo: boolean },
  id?: string,
) {
  const { error } = id
    ? await supabase.from('cuentas').update(datos).eq('id', id)
    : await supabase.from('cuentas').insert(datos);
  if (error) throw new Error(error.message);
}

export type Venta = {
  id: string;
  tipo: TipoVenta;
  fecha: string;
  estado: EstadoVenta;
  personaId: string | null;
  persona: string | null;
  aNombreDeId: string | null;
  aNombreDe: string | null;
  cuentaId: string | null;
  cuenta: string | null;
  formaPago: string | null;
  ubicacionId: string | null;
  notas: string | null;
  /** Total, pagado y saldo salen de `v_deuda_venta`: nunca se guardan. */
  total: number;
  pagado: number;
  saldo: number;
  lineas: number;
};

/**
 * Las ventas con su saldo.
 *
 * La deuda no es una tabla: es lo que queda de restarle a la venta lo que se le
 * imputó (MODELO §Comercial). Por eso el saldo sale de una vista y no de una
 * columna que alguien podría dejar desactualizada.
 */
export async function listarVentas(): Promise<Venta[]> {
  const [base, deuda, lineas] = await Promise.all([
    supabase
      .from('ventas')
      .select(
        'id, tipo, fecha, estado, persona_id, a_nombre_de_persona_id, cuenta_id, forma_pago, ubicacion_id, notas, persona:personas!ventas_persona_id_fkey (nombre_completo), aNombre:personas!ventas_a_nombre_de_persona_id_fkey (nombre_completo), cuentas (nombre)',
      )
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false }),
    supabase.from('v_deuda_venta').select('venta_id, total, pagado, saldo'),
    supabase.from('venta_lineas').select('venta_id, importe_total'),
  ]);

  const filas = revisar(base.data, base.error) as unknown as {
    id: string;
    tipo: TipoVenta;
    fecha: string;
    estado: EstadoVenta;
    persona_id: string | null;
    a_nombre_de_persona_id: string | null;
    cuenta_id: string | null;
    forma_pago: string | null;
    ubicacion_id: string | null;
    notas: string | null;
    persona: { nombre_completo: string | null } | null;
    aNombre: { nombre_completo: string | null } | null;
    cuentas: { nombre: string } | null;
  }[];

  const porVenta = new Map(
    revisar(deuda.data, deuda.error).map((d) => [d.venta_id as string, d]),
  );

  // Una venta en borrador no está en v_deuda_venta —la vista solo mira las
  // confirmadas— pero su total igual se puede mostrar: es la suma de sus líneas.
  const totalBorrador = new Map<string, number>();
  const cuantas = new Map<string, number>();
  for (const l of revisar(lineas.data, lineas.error)) {
    totalBorrador.set(
      l.venta_id,
      (totalBorrador.get(l.venta_id) ?? 0) + Number(l.importe_total ?? 0),
    );
    cuantas.set(l.venta_id, (cuantas.get(l.venta_id) ?? 0) + 1);
  }

  return filas.map((f) => {
    const d = porVenta.get(f.id);
    return {
      id: f.id,
      tipo: f.tipo,
      fecha: f.fecha,
      estado: f.estado,
      personaId: f.persona_id,
      persona: f.persona?.nombre_completo ?? null,
      aNombreDeId: f.a_nombre_de_persona_id,
      aNombreDe: f.aNombre?.nombre_completo ?? null,
      cuentaId: f.cuenta_id,
      cuenta: f.cuentas?.nombre ?? null,
      formaPago: f.forma_pago,
      ubicacionId: f.ubicacion_id,
      notas: f.notas,
      total: Number(d?.total ?? totalBorrador.get(f.id) ?? 0),
      pagado: Number(d?.pagado ?? 0),
      saldo: Number(d?.saldo ?? 0),
      lineas: cuantas.get(f.id) ?? 0,
    };
  });
}

export async function obtenerVenta(id: string): Promise<Venta> {
  const todas = await listarVentas();
  const una = todas.find((v) => v.id === id);
  if (!una) throw new Error('Esa venta no existe o no la podés ver.');
  return una;
}

export type DatosVenta = {
  tipo: TipoVenta;
  fecha: string;
  persona_id: string | null;
  a_nombre_de_persona_id: string | null;
  cuenta_id: string | null;
  forma_pago: string | null;
  ubicacion_id: string | null;
  notas: string | null;
};

export async function crearVenta(datos: DatosVenta): Promise<string> {
  const { data, error } = await supabase
    .from('ventas')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function actualizarVenta(id: string, datos: Partial<DatosVenta>) {
  const { error } = await supabase.from('ventas').update(datos).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function borrarVenta(id: string) {
  const { error } = await supabase.from('ventas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type LineaVenta = {
  id: string;
  tamanoId: string;
  producto: string;
  tamano: string;
  variante: Variante;
  cantidad: number;
  /** Congelado al confirmar. Nulo mientras es borrador: se resuelve después. */
  importeUnitario: number | null;
  origen: OrigenImporte | null;
  total: number | null;
};

export async function lineasDeVenta(ventaId: string): Promise<LineaVenta[]> {
  const { data, error } = await supabase
    .from('venta_lineas')
    .select(
      'id, tamano_id, cantidad, importe_unitario, origen_importe, importe_total, variante, tamanos (nombre, magnitud, unidad, productos (nombre))',
    )
    .eq('venta_id', ventaId);
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    tamano_id: string;
    cantidad: number;
    importe_unitario: number | null;
    origen_importe: OrigenImporte | null;
    importe_total: number | null;
    variante: Variante;
    tamanos: {
      nombre: string | null;
      magnitud: number;
      unidad: string;
      productos: { nombre: string } | null;
    } | null;
  }[];

  return filas
    .map((f) => ({
      id: f.id,
      tamanoId: f.tamano_id,
      producto: f.tamanos?.productos?.nombre ?? '—',
      tamano:
        f.tamanos?.nombre?.trim() ||
        `${f.tamanos?.magnitud ?? ''} ${f.tamanos?.unidad ?? ''}`,
      variante: f.variante,
      cantidad: f.cantidad,
      importeUnitario: f.importe_unitario,
      origen: f.origen_importe,
      total: f.importe_total,
    }))
    .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
}

export async function guardarLineaVenta(
  datos: {
    venta_id: string;
    tamano_id: string;
    variante: Variante;
    cantidad: number;
    importe_unitario: number | null;
    origen_importe: OrigenImporte | null;
  },
  id?: string,
) {
  const { error } = id
    ? await supabase.from('venta_lineas').update(datos).eq('id', id)
    : await supabase.from('venta_lineas').insert(datos);
  if (error) throw new Error(error.message);
}

export async function borrarLineaVenta(id: string) {
  const { error } = await supabase.from('venta_lineas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Confirmar congela el importe de cada línea que no tenga uno puesto a mano y
 * saca la mercadería del stock.
 *
 * Cuál es el importe depende del tipo de venta, no de quién compra: directa usa
 * el precio de venta vigente, entrega para reventa usa el costo c/etiqueta
 * resuelto en ese momento (§2). Desde ahí en adelante es un importe y no un
 * costo, y por eso el deudor lo puede ver sin que se le abran los costos.
 */
export async function confirmarVenta(id: string, ubicacionId?: string | null) {
  const { error } = await supabase.rpc('confirmar_venta', {
    p_venta_id: id,
    ...(ubicacionId ? { p_ubicacion_id: ubicacionId } : {}),
  });
  if (error) throw new Error(error.message);
}

/**
 * Anular una venta confirmada. Las tres cosas pasan juntas o no pasa ninguna:
 * vuelve la mercadería al stock con movimientos espejo, se liberan los pagos
 * que estaban imputados a esta venta, y la venta deja de contar para la deuda.
 *
 * Los movimientos originales no se borran —son inmutables— sino que se
 * compensan. Devuelve cuánto pago quedó liberado, que es plata que sigue
 * estando y ahora se puede imputar a otra venta.
 */
export async function anularVenta(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('anular_venta', { p_venta_id: id });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export type Imputacion = {
  id: string;
  pagoId: string;
  fecha: string;
  monto: number;
  formaPago: string | null;
};

/** Qué pagos se aplicaron a esta venta, con el FIFO ya resuelto y guardado. */
export async function imputacionesDeVenta(ventaId: string): Promise<Imputacion[]> {
  const { data, error } = await supabase
    .from('pago_imputaciones')
    .select('id, pago_id, monto, pagos (fecha, forma_pago)')
    .eq('venta_id', ventaId);
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    pago_id: string;
    monto: number;
    pagos: { fecha: string; forma_pago: string | null } | null;
  }[];

  return filas
    .map((f) => ({
      id: f.id,
      pagoId: f.pago_id,
      fecha: f.pagos?.fecha ?? '',
      monto: f.monto,
      formaPago: f.pagos?.forma_pago ?? null,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * El importe que va a quedar congelado si se confirma la venta así como está.
 *
 * Es una previsualización del lado del cliente: la verdad la resuelve
 * `confirmar_venta` en la base. Sirve para que nadie confirme a ciegas una
 * entrega cuyo costo todavía no se puede calcular.
 */
export function importePrevisto(
  tipo: TipoVenta,
  tamano: Tamano | undefined,
  variante: Variante,
  costoConEtiqueta: number | null,
): { valor: number | null; motivo: string } {
  if (!tamano) return { valor: null, motivo: 'el tamaño ya no existe' };

  if (tipo === 'directa') {
    const precio = tamano.precio[variante];
    return precio == null
      ? {
          valor: null,
          motivo: `${etiquetaTamano(tamano)} no tiene precio de venta cargado para esta variante`,
        }
      : { valor: precio, motivo: 'precio de venta vigente' };
  }

  return costoConEtiqueta == null
    ? { valor: null, motivo: 'el costo de este tamaño está incompleto' }
    : { valor: costoConEtiqueta, motivo: 'costo con etiqueta de hoy' };
}
