import type { Database } from '@/lib/database.types';
import { hoyISO } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export type UnidadInsumo = Database['public']['Enums']['unidad_insumo'];
export type TipoInsumo = Database['public']['Enums']['tipo_insumo'];
export type OrigenInsumo = Database['public']['Enums']['origen_insumo'];
export type Moneda = Database['public']['Enums']['moneda'];

export type Proveedor = {
  id: string;
  nombre: string;
  link: string | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
};

export type Costo = { costo: number | null; completo: boolean; faltantes: string[] };

export type Insumo = {
  id: string;
  nombre: string;
  unidad: UnidadInsumo;
  tipo: TipoInsumo;
  origen: OrigenInsumo;
  proveedorId: string | null;
  proveedor: string | null;
  proveedorLink: string | null;
  link: string | null;
  rinde: number | null;
  notas: string | null;
  activo: boolean;
  /** Precio de lista vigente, en la unidad de compra. Nulo = no se sabe. */
  precio: number | null;
  moneda: Moneda | null;
  /**
   * El precio de lista convertido a pesos al tipo de cambio vigente. Es lo que
   * hace comparable una columna donde conviven insumos en pesos y en dólares:
   * sin esto, US$ 48,50 ordena por debajo de $ 8.500. Se calcula para mostrar y
   * ordenar; lo que se guarda sigue siendo el precio en su moneda.
   */
  precioARS: number | null;
  verificadoEn: string | null;
  diasSinVerificar: number | null;
  /** Solo para MP intermedias: el costo calculado por composición (MODELO §3). */
  costo: Costo | null;
};

/** Cuántas unidades chicas entran en la unidad de compra (MODELO §1). */
export const factorUnidad = (u: UnidadInsumo) => (u === 'unidad' ? 1 : 1000);

export const ETIQUETA_TIPO: Record<TipoInsumo, string> = {
  materia_prima: 'Materia prima',
  envase: 'Envase',
  etiqueta: 'Etiqueta',
  packaging: 'Packaging',
  otro: 'Otro',
};

export const ETIQUETA_UNIDAD: Record<UnidadInsumo, string> = {
  kg: 'kg',
  l: 'l',
  unidad: 'unidad',
};

/** Un ciclo en la composición está roto, no incompleto: eso es error, no aviso. */
export const esCiclo = (faltantes: string[] | null | undefined) =>
  Boolean(faltantes?.some((f) => f.startsWith('CICLO')));

function revisar<T>(datos: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return datos as T;
}

/** Pesos por dólar vigente hoy (§5). Nulo si el parámetro no tiene valor. */
export async function tipoCambioUSD(): Promise<number | null> {
  const { data, error } = await supabase
    .from('parametro_valores')
    .select('valor')
    .eq('parametro', 'tipo_cambio_usd')
    .lte('vigente_desde', hoyISO())
    .order('vigente_desde', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.valor ?? null;
}

export async function listarInsumos(): Promise<Insumo[]> {
  const [base, precios, tc] = await Promise.all([
    supabase
      .from('insumos')
      .select(
        'id, nombre, unidad, tipo, origen, link, rinde_cantidad, notas, activo, proveedor_id, proveedores (id, nombre, link)',
      )
      .order('nombre'),
    supabase
      .from('v_insumo_precio_actual')
      .select('insumo_id, precio, moneda, verificado_en, dias_desde_verificacion'),
    tipoCambioUSD(),
  ]);

  const filas = revisar(base.data, base.error);
  const vigentes = revisar(precios.data, precios.error);
  const porInsumo = new Map(vigentes.map((p) => [p.insumo_id, p]));

  const insumos: Insumo[] = filas.map((f) => {
    const p = porInsumo.get(f.id);
    const prov = f.proveedores as {
      id: string;
      nombre: string;
      link: string | null;
    } | null;
    return {
      id: f.id,
      nombre: f.nombre,
      unidad: f.unidad,
      tipo: f.tipo,
      origen: f.origen,
      proveedorId: f.proveedor_id,
      proveedor: prov?.nombre ?? null,
      proveedorLink: prov?.link ?? null,
      link: f.link,
      rinde: f.rinde_cantidad,
      notas: f.notas,
      activo: f.activo,
      precio: p?.precio ?? null,
      moneda: p?.moneda ?? null,
      precioARS:
        p?.precio == null
          ? null
          : p.moneda === 'USD'
            ? tc == null
              ? null
              : p.precio * tc
            : p.precio,
      verificadoEn: p?.verificado_en ?? null,
      diasSinVerificar: p?.dias_desde_verificacion ?? null,
      costo: null,
    };
  });

  // Las MP intermedias no tienen precio de lista: su costo se calcula bajando
  // por la composición. Es una llamada por insumo producido, que son pocos.
  const producidos = insumos.filter((i) => i.origen === 'producido');
  const costos = await Promise.all(producidos.map((i) => costoInsumo(i.id)));
  producidos.forEach((i, n) => {
    i.costo = costos[n];
  });

  return insumos;
}

export async function costoInsumo(id: string, fecha?: string): Promise<Costo> {
  const { data, error } = await supabase.rpc('costo_insumo', {
    p_insumo_id: id,
    ...(fecha ? { p_fecha: fecha } : {}),
  });
  if (error) throw new Error(error.message);
  const r = data as unknown as Costo | null;
  return {
    costo: r?.costo ?? null,
    completo: Boolean(r?.completo),
    faltantes: r?.faltantes ?? [],
  };
}

export async function obtenerInsumo(id: string): Promise<Insumo> {
  const todos = await listarInsumos();
  const uno = todos.find((i) => i.id === id);
  if (!uno) throw new Error('Ese insumo no existe o no lo podés ver.');
  return uno;
}

export type DatosInsumo = {
  nombre: string;
  unidad: UnidadInsumo;
  tipo: TipoInsumo;
  origen: OrigenInsumo;
  proveedor_id: string | null;
  link: string | null;
  rinde_cantidad: number | null;
  notas: string | null;
  activo: boolean;
};

export async function crearInsumo(datos: DatosInsumo): Promise<string> {
  const { data, error } = await supabase
    .from('insumos')
    .insert(datos)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function actualizarInsumo(id: string, datos: DatosInsumo) {
  const { error } = await supabase.from('insumos').update(datos).eq('id', id);
  if (error) throw new Error(error.message);
}

export type PrecioFila = {
  id: string;
  precio: number;
  moneda: Moneda;
  vigente_desde: string;
  verificado_en: string;
  fuente: string | null;
};

export async function historialPrecios(insumoId: string): Promise<PrecioFila[]> {
  const { data, error } = await supabase
    .from('insumo_precios')
    .select('id, precio, moneda, vigente_desde, verificado_en, fuente')
    .eq('insumo_id', insumoId)
    .order('vigente_desde', { ascending: false })
    .order('creado_en', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Registrar un precio es **siempre** una fila nueva, también cuando el precio no
 * cambió: verificar es el hecho que se registra, y es lo que apaga la alerta de
 * 30 días (§5). El upsert es solo para el caso de verificar dos veces el mismo
 * día, donde la única fila posible para esa fecha se pisa.
 */
export async function registrarPrecio(entrada: {
  insumo_id: string;
  precio: number;
  moneda: Moneda;
  vigente_desde?: string;
  verificado_en?: string;
  fuente?: string | null;
}) {
  const fecha = entrada.vigente_desde ?? hoyISO();
  const { error } = await supabase.from('insumo_precios').upsert(
    {
      insumo_id: entrada.insumo_id,
      precio: entrada.precio,
      moneda: entrada.moneda,
      vigente_desde: fecha,
      verificado_en: entrada.verificado_en ?? fecha,
      fuente: entrada.fuente ?? null,
    },
    { onConflict: 'insumo_id,vigente_desde' },
  );
  if (error) throw new Error(error.message);
}

export type ComponenteMP = {
  id: string;
  componenteId: string;
  nombre: string;
  unidad: UnidadInsumo;
  cantidad: number;
  costo: Costo;
};

/** Composición de una MP intermedia, con el costo resuelto de cada componente. */
export async function composicion(insumoId: string): Promise<ComponenteMP[]> {
  const { data, error } = await supabase
    .from('insumo_composicion')
    .select(
      'id, cantidad, insumo_componente_id, insumos!insumo_composicion_insumo_componente_id_fkey (nombre, unidad)',
    )
    .eq('insumo_producido_id', insumoId);
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    cantidad: number;
    insumo_componente_id: string;
    insumos: { nombre: string; unidad: UnidadInsumo } | null;
  }[];

  const costos = await Promise.all(filas.map((f) => costoInsumo(f.insumo_componente_id)));

  return filas.map((f, n) => ({
    id: f.id,
    componenteId: f.insumo_componente_id,
    nombre: f.insumos?.nombre ?? '—',
    unidad: f.insumos?.unidad ?? 'unidad',
    cantidad: f.cantidad,
    costo: costos[n],
  }));
}

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('id, nombre, link, contacto, notas, activo')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
}

export type DatosProveedor = {
  nombre: string;
  link: string;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
};

export async function guardarProveedor(datos: DatosProveedor, id?: string) {
  const { error } = id
    ? await supabase.from('proveedores').update(datos).eq('id', id)
    : await supabase.from('proveedores').insert(datos);
  if (error) throw new Error(error.message);
}

/** Cuántos insumos usan cada proveedor. Para no borrar a ciegas. */
export async function usoDeProveedores(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('insumos').select('proveedor_id');
  if (error) throw new Error(error.message);
  const uso = new Map<string, number>();
  for (const f of data) {
    if (f.proveedor_id) uso.set(f.proveedor_id, (uso.get(f.proveedor_id) ?? 0) + 1);
  }
  return uso;
}
