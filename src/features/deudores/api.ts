import type { TipoVenta } from '@/features/ventas/api';
import { supabase } from '@/lib/supabase';

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

/**
 * Con quién hace negocio Elysium. Puede no tener cuenta nunca: una deuda existe
 * aunque la persona no se registre (MODELO §Identidad).
 *
 * Los dos roles son acumulables y no excluyentes: el mismo estudiante puede
 * fabricar lotes y llevarse productos para revender. Ninguno de los dos en true
 * es simplemente un cliente.
 */
export type Persona = {
  id: string;
  nombre: string;
  contacto: string | null;
  notas: string | null;
  esRevendedor: boolean;
  esProductor: boolean;
  activo: boolean;
  /** Si tiene cuenta en la app. Se vincula por invitación, no desde acá. */
  tieneCuenta: boolean;
};

export async function listarPersonas(): Promise<Persona[]> {
  const { data, error } = await supabase
    .from('personas')
    .select('id, nombre, contacto, notas, es_revendedor, es_productor, activo, perfil_id')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    contacto: p.contacto,
    notas: p.notas,
    esRevendedor: p.es_revendedor,
    esProductor: p.es_productor,
    activo: p.activo,
    tieneCuenta: p.perfil_id != null,
  }));
}

export async function obtenerPersona(id: string): Promise<Persona> {
  const todas = await listarPersonas();
  const una = todas.find((p) => p.id === id);
  if (!una) throw new Error('Esa persona no existe o no la podés ver.');
  return una;
}

export type DatosPersona = {
  nombre: string;
  contacto: string | null;
  notas: string | null;
  es_revendedor: boolean;
  es_productor: boolean;
  activo: boolean;
};

export async function guardarPersona(datos: DatosPersona, id?: string) {
  const { error } = id
    ? await supabase.from('personas').update(datos).eq('id', id)
    : await supabase.from('personas').insert(datos);
  if (error) throw new Error(error.message);
}

export type Deudor = {
  personaId: string;
  nombre: string;
  esRevendedor: boolean;
  activo: boolean;
  ventasImpagas: number;
  deudaTotal: number;
  /** Fecha de la venta impaga más antigua. Es la que el FIFO cobra primero. */
  deudaMasVieja: string | null;
};

/**
 * Quién debe y cuánto.
 *
 * Sale entero de `v_deuda_persona`: la deuda no se guarda en ningún lado, es lo
 * que queda de restarle a cada venta confirmada lo que se le imputó. Guardarla
 * sería el mismo error que el modelo evita con el stock.
 */
export async function listarDeudores(): Promise<Deudor[]> {
  const [deuda, personas] = await Promise.all([
    supabase
      .from('v_deuda_persona')
      .select('persona_id, nombre, ventas_impagas, deuda_total, deuda_mas_vieja'),
    listarPersonas(),
  ]);

  const filas = revisar(deuda.data, deuda.error);
  const porPersona = new Map(filas.map((d) => [d.persona_id as string, d]));

  // Se parte del padrón y no de la vista: alguien sin ventas no aparece en
  // v_deuda_persona, y "no debe nada" es una respuesta que hay que poder ver.
  return personas.map((p) => {
    const d = porPersona.get(p.id);
    return {
      personaId: p.id,
      nombre: p.nombre,
      esRevendedor: p.esRevendedor,
      activo: p.activo,
      ventasImpagas: Number(d?.ventas_impagas ?? 0),
      deudaTotal: Number(d?.deuda_total ?? 0),
      deudaMasVieja: (d?.deuda_mas_vieja as string | null) ?? null,
    };
  });
}

export type VentaConSaldo = {
  ventaId: string;
  fecha: string;
  tipo: TipoVenta;
  total: number;
  pagado: number;
  saldo: number;
};

export async function ventasDePersona(personaId: string): Promise<VentaConSaldo[]> {
  const { data, error } = await supabase
    .from('v_deuda_venta')
    .select('venta_id, fecha, tipo, total, pagado, saldo')
    .eq('persona_id', personaId);
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    venta_id: string;
    fecha: string;
    tipo: TipoVenta;
    total: number | null;
    pagado: number | null;
    saldo: number | null;
  }[];

  // Ordenadas de la más vieja a la más nueva: es el orden en que el FIFO las
  // va a cobrar, así que es el orden en que conviene mirarlas.
  return filas
    .map((v) => ({
      ventaId: v.venta_id,
      fecha: v.fecha,
      tipo: v.tipo,
      total: Number(v.total ?? 0),
      pagado: Number(v.pagado ?? 0),
      saldo: Number(v.saldo ?? 0),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type Pago = {
  id: string;
  fecha: string;
  monto: number;
  formaPago: string | null;
  cuenta: string | null;
  notas: string | null;
  /** Cuánto de este pago se aplicó a alguna venta. */
  imputado: number;
  /** Lo que sobró. No inventa una venta: queda a favor de la persona. */
  sobrante: number;
  imputaciones: { id: string; ventaId: string; fecha: string; monto: number }[];
};

export async function pagosDePersona(personaId: string): Promise<Pago[]> {
  const [base, sobrantes, imputaciones] = await Promise.all([
    supabase
      .from('pagos')
      .select('id, fecha, monto, forma_pago, notas, cuentas (nombre)')
      .eq('persona_id', personaId)
      .order('fecha', { ascending: false }),
    supabase.from('v_pago_sobrante').select('pago_id, imputado, sobrante'),
    supabase
      .from('pago_imputaciones')
      .select('id, pago_id, venta_id, monto, ventas (fecha)'),
  ]);

  const filas = revisar(base.data, base.error) as unknown as {
    id: string;
    fecha: string;
    monto: number;
    forma_pago: string | null;
    notas: string | null;
    cuentas: { nombre: string } | null;
  }[];

  const porPago = new Map(
    revisar(sobrantes.data, sobrantes.error).map((s) => [s.pago_id as string, s]),
  );

  const imps = revisar(imputaciones.data, imputaciones.error) as unknown as {
    id: string;
    pago_id: string;
    venta_id: string;
    monto: number;
    ventas: { fecha: string } | null;
  }[];

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    monto: Number(f.monto),
    formaPago: f.forma_pago,
    cuenta: f.cuentas?.nombre ?? null,
    notas: f.notas,
    imputado: Number(porPago.get(f.id)?.imputado ?? 0),
    sobrante: Number(porPago.get(f.id)?.sobrante ?? 0),
    imputaciones: imps
      .filter((i) => i.pago_id === f.id)
      .map((i) => ({
        id: i.id,
        ventaId: i.venta_id,
        fecha: i.ventas?.fecha ?? '',
        monto: Number(i.monto),
      })),
  }));
}

export async function registrarPago(datos: {
  persona_id: string;
  fecha: string;
  monto: number;
  cuenta_id: string | null;
  forma_pago: string | null;
  notas: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('pagos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Imputa el pago de la deuda más vieja a la más nueva, que es como lo pidió
 * Johanna. Devuelve lo que sobró sin aplicar.
 *
 * El resultado queda **guardado** como filas de imputación, no recalculado cada
 * vez: así es auditable a qué venta se aplicó cada peso, y se puede corregir.
 */
export async function imputarFifo(pagoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('imputar_pago_fifo', { p_pago_id: pagoId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Aplicar a mano una parte de un pago a una venta concreta. */
export async function imputarAMano(pagoId: string, ventaId: string, monto: number) {
  const { error } = await supabase
    .from('pago_imputaciones')
    .insert({ pago_id: pagoId, venta_id: ventaId, monto });
  if (error) throw new Error(error.message);
}

export async function borrarImputacion(id: string) {
  const { error } = await supabase.from('pago_imputaciones').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function borrarPago(id: string) {
  const { error } = await supabase.from('pagos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
