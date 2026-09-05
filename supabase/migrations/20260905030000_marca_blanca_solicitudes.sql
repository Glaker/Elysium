-- =============================================================================
-- Elysium — 05. Marca blanca, solicitudes y RLS final
--
-- MARCA BLANCA. §15 resp. 7: "misma fórmula, distinta presentación". El producto
-- sale sin etiqueta Elysium, y esa etiqueta es una línea de fórmula con costo
-- propio, así que el cálculo tiene que enterarse o las dos versiones salen al
-- mismo precio.
--
-- Se resuelve marcando la APLICABILIDAD de cada línea de fórmula:
--   ambas | solo_elysium | solo_marca_blanca
-- costo_tamano() y precio_recomendado() reciben la variante y filtran.
--
-- Por qué así y no de otra forma:
--   * Producto o tamaño aparte  -> duplica la receta entera y obliga a editar
--     dos fórmulas cada vez que cambia un porcentaje. Contradice "misma fórmula".
--   * Solo un flag en la línea de venta -> no llega al cálculo: las dos
--     versiones costarían igual, que es justamente el problema.
--   * Marcar la línea -> una sola receta, y la diferencia vive donde está en la
--     realidad: en qué insumos lleva cada versión. Además soporta el caso de una
--     etiqueta neutra distinta (solo_marca_blanca), no solo la ausencia.
-- =============================================================================

create type variante_producto as enum ('elysium', 'marca_blanca');
create type aplica_variante   as enum ('ambas', 'solo_elysium', 'solo_marca_blanca');

alter table formula_lineas
  add column aplica_a aplica_variante not null default 'ambas';
comment on column formula_lineas.aplica_a is 'A qué variante pertenece esta línea. La etiqueta Elysium es solo_elysium.';

-- El precio de venta puede diferir por variante.
alter table tamano_precios
  add column variante variante_producto not null default 'elysium';
alter table tamano_precios drop constraint tamano_precios_tamano_id_vigente_desde_key;
alter table tamano_precios add constraint tamano_precios_unico
  unique (tamano_id, variante, vigente_desde);

alter table venta_lineas
  add column variante variante_producto not null default 'elysium';
alter table venta_lineas drop constraint venta_lineas_venta_id_tamano_id_key;
alter table venta_lineas add constraint venta_lineas_unico
  unique (venta_id, tamano_id, variante);

alter table lotes add column variante variante_producto not null default 'elysium';

-- Tipo de persona: define qué precio ve (§2 — el revendedor paga el costo).
create type tipo_persona as enum ('cliente', 'revendedor', 'productor');
alter table personas add column tipo tipo_persona not null default 'cliente';

-- ---------------------------------------------------------------------------
-- costo_tamano con variante. Se DROPEA la firma anterior: agregar un parámetro
-- a `create or replace` genera una sobrecarga, no un reemplazo (lección de 03b).
-- ---------------------------------------------------------------------------
drop function if exists costo_tamano(uuid, date, numeric);
drop function if exists precio_recomendado(uuid, date);

create or replace function costo_tamano(
  p_tamano_id uuid,
  p_fecha     date default current_date,
  p_merma_pct numeric default null,
  p_variante  variante_producto default 'elysium'
)
returns table (
  costo_materias_primas numeric, costo_merma numeric, costo_envases numeric,
  costo_etiquetas numeric, costo_otros numeric, costo_mano_obra numeric,
  costo_regalias numeric, costo_energia numeric, costo_sin_etiqueta numeric,
  costo_con_etiqueta numeric, completo boolean, faltantes text[]
)
language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  v_t tamanos%rowtype; v_hijo resultado_costo;
  v_cant numeric; v_linea numeric;
  v_mp numeric := 0; v_envases numeric := 0; v_etiquetas numeric := 0;
  v_otros numeric := 0; v_merma numeric := 0; v_mo numeric := 0;
  v_regalias numeric := 0; v_energia numeric := 0;
  v_valor_hora numeric; v_merma_pct numeric;
  v_completo boolean := true; v_faltantes text[] := '{}';
  r record;
begin
  select * into v_t from tamanos where id = p_tamano_id;
  if not found then
    return query select null::numeric,null::numeric,null::numeric,null::numeric,
                        null::numeric,null::numeric,null::numeric,null::numeric,
                        null::numeric,null::numeric,false,
                        array['tamaño inexistente: ' || p_tamano_id::text];
    return;
  end if;

  for r in
    select fl.modo, fl.porcentaje, fl.cantidad_fija, i.id as insumo_id, i.tipo
    from formula_lineas fl
    join insumos i on i.id = fl.insumo_id
    where fl.tamano_id = p_tamano_id
      and (fl.aplica_a = 'ambas'
        or (fl.aplica_a = 'solo_elysium'      and p_variante = 'elysium')
        or (fl.aplica_a = 'solo_marca_blanca' and p_variante = 'marca_blanca'))
  loop
    v_cant := case r.modo when 'porcentaje' then r.porcentaje / 100.0 * v_t.magnitud
                          else r.cantidad_fija end;
    v_hijo := costo_insumo(r.insumo_id, p_fecha);
    if not v_hijo.completo then
      v_completo := false; v_faltantes := v_faltantes || v_hijo.faltantes; continue;
    end if;
    v_linea := v_cant * v_hijo.costo;
    case r.tipo
      when 'materia_prima' then v_mp        := v_mp        + v_linea;
      when 'envase'        then v_envases   := v_envases   + v_linea;
      when 'etiqueta'      then v_etiquetas := v_etiquetas + v_linea;
      else                      v_otros     := v_otros     + v_linea;
    end case;
  end loop;

  v_merma_pct := coalesce(p_merma_pct, parametro_valor('merma_pct', p_fecha));
  if v_merma_pct is null then
    v_completo := false; v_faltantes := v_faltantes || array['merma_pct (parámetro sin valor)'];
  else
    v_merma := v_mp * v_merma_pct / 100.0;
  end if;

  v_valor_hora := parametro_valor('valor_hora', p_fecha);
  if v_valor_hora is null then
    v_completo := false; v_faltantes := v_faltantes || array['valor_hora (parámetro sin valor)'];
  elsif v_t.productividad_unid_hora is null then
    v_completo := false; v_faltantes := v_faltantes || array['productividad_unid_hora (sin cargar)'];
  else
    v_mo := v_valor_hora / v_t.productividad_unid_hora;
  end if;

  v_regalias := coalesce(parametro_valor('regalias_por_unidad', p_fecha), 0);
  v_energia  := coalesce(parametro_valor('costo_energia_por_unidad', p_fecha), 0);

  if not v_completo then
    return query select null::numeric,null::numeric,null::numeric,null::numeric,
                        null::numeric,null::numeric,null::numeric,null::numeric,
                        null::numeric,null::numeric,false, v_faltantes;
    return;
  end if;

  return query select v_mp, v_merma, v_envases, v_etiquetas, v_otros, v_mo,
    v_regalias, v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia + v_etiquetas,
    true, '{}'::text[];
end;
$$;

create or replace function precio_recomendado(
  p_tamano_id uuid,
  p_fecha     date default current_date,
  p_variante  variante_producto default 'elysium'
)
returns resultado_costo
language plpgsql stable
set search_path = public, pg_temp
as $$
declare v_c record; v_margen numeric; v_res resultado_costo;
begin
  v_res := (null, false, '{}')::resultado_costo;
  select * into v_c from costo_tamano(p_tamano_id, p_fecha, null, p_variante);
  if not v_c.completo then v_res.faltantes := v_c.faltantes; return v_res; end if;

  select coalesce(p.margen_pct, parametro_valor('margen_pct', p_fecha)) into v_margen
  from tamanos t join productos p on p.id = t.producto_id where t.id = p_tamano_id;

  if v_margen is null then
    v_res.faltantes := array['margen_pct (sin valor global ni del producto)'];
    return v_res;
  end if;
  v_res.costo := v_c.costo_con_etiqueta * (1 + v_margen / 100.0);
  v_res.completo := true;
  return v_res;
end;
$$;

-- confirmar_venta actualizada: resuelve precio/costo por variante.
create or replace function confirmar_venta(p_venta_id uuid, p_ubicacion_id uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_v ventas%rowtype; v_ubic uuid; v_imp numeric;
  v_origen origen_importe; v_costo record; r record;
begin
  select * into v_v from ventas where id = p_venta_id for update;
  if not found then raise exception 'venta inexistente: %', p_venta_id; end if;
  if v_v.estado <> 'borrador' then raise exception 'la venta % no está en borrador', p_venta_id; end if;

  v_ubic := coalesce(p_ubicacion_id, v_v.ubicacion_id, ubicacion_default());
  if v_ubic is null then raise exception 'no hay ubicación de salida'; end if;

  for r in select * from venta_lineas where venta_id = p_venta_id loop
    v_imp := r.importe_unitario; v_origen := r.origen_importe;
    if v_imp is null then
      if v_v.tipo = 'directa' then
        select precio into v_imp from tamano_precios
        where tamano_id = r.tamano_id and variante = r.variante and vigente_desde <= v_v.fecha
        order by vigente_desde desc, creado_en desc limit 1;
        if v_imp is null then
          raise exception 'el tamaño % (%) no tiene precio de venta vigente al %',
            r.tamano_id, r.variante, v_v.fecha;
        end if;
        v_origen := 'precio_venta';
      else
        select * into v_costo from costo_tamano(r.tamano_id, v_v.fecha, null, r.variante);
        if not v_costo.completo then
          raise exception 'no se puede resolver el costo del tamaño %: %',
            r.tamano_id, array_to_string(v_costo.faltantes, ', ');
        end if;
        v_imp := v_costo.costo_con_etiqueta; v_origen := 'costo';
      end if;
      update venta_lineas set importe_unitario = v_imp, origen_importe = v_origen where id = r.id;
    end if;

    insert into movimientos_producto
      (tamano_id, ubicacion_id, cantidad, tipo, fecha, venta_id, motivo)
    values (r.tamano_id, v_ubic, -r.cantidad,
            case when v_v.tipo = 'directa' then 'venta' else 'entrega' end::tipo_mov_producto,
            v_v.fecha, p_venta_id, 'Venta ' || p_venta_id::text);
  end loop;

  update ventas set estado='confirmada', confirmada_en=now(), ubicacion_id=v_ubic
  where id = p_venta_id;
end;
$$;

-- =============================================================================
-- Solicitudes (§11): un pedido NO es una venta. No reserva stock: es un aviso,
-- reemplaza el WhatsApp. Johanna después lo aprueba y carga la venta.
-- =============================================================================
create type tipo_solicitud   as enum ('producto', 'materia_prima');
create type estado_solicitud as enum ('pendiente', 'aprobada', 'rechazada', 'cancelada');

create table solicitudes (
  id                 uuid primary key default gen_random_uuid(),
  tipo               tipo_solicitud not null,
  persona_id         uuid not null references personas (id) on delete restrict,
  estado             estado_solicitud not null default 'pendiente',
  fecha              date not null default current_date,
  tamano_objetivo_id uuid references tamanos (id) on delete set null,
  unidades_objetivo  numeric check (unidades_objetivo > 0),
  notas              text,
  resuelta_en        timestamptz,
  resuelta_por       uuid references perfiles (id),
  creado_en          timestamptz not null default now()
);
comment on column solicitudes.tamano_objetivo_id is 'Para tipo=materia_prima: qué va a fabricar. Las líneas salen de la calculadora de ingredientes.';

create table solicitud_lineas (
  id            uuid primary key default gen_random_uuid(),
  solicitud_id  uuid not null references solicitudes (id) on delete cascade,
  tamano_id     uuid references tamanos (id) on delete restrict,
  insumo_id     uuid references insumos (id) on delete restrict,
  variante      variante_producto not null default 'elysium',
  cantidad      numeric not null check (cantidad > 0),
  constraint objetivo_unico check (
    (tamano_id is not null and insumo_id is null) or
    (tamano_id is null and insumo_id is not null)
  )
);

-- =============================================================================
-- Funciones para el usuario normal.
--
-- SECURITY DEFINER a propósito: `formula_lineas`, `insumo_precios` y los costos
-- son admin-only, pero §11 y el front del productor necesitan (a) las CANTIDADES
-- de la receta y (b) UN importe ya resuelto. Estas funciones devuelven eso y
-- nada más: ni precios de insumo, ni desglose, ni márgenes.
--
-- DECISIÓN anotada: calcular_insumos() expone a un usuario normal las cantidades
-- de la fórmula (de las que se deduce el porcentaje). Es deliberado — el
-- productor fabrica el lote, necesita saber cuánto pesar — pero es información
-- que §10 lista como de admin. Si se decide cerrarla, se restringe el grant.
-- =============================================================================

create or replace function calcular_insumos(p_tamano_id uuid, p_unidades numeric,
                                            p_variante variante_producto default 'elysium')
returns table (insumo text, unidad unidad_insumo, cantidad_necesaria numeric)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select i.nombre, i.unidad,
         (case fl.modo when 'porcentaje' then fl.porcentaje / 100.0 * t.magnitud
                       else fl.cantidad_fija end) * p_unidades
  from formula_lineas fl
  join insumos i on i.id = fl.insumo_id
  join tamanos t on t.id = fl.tamano_id
  where fl.tamano_id = p_tamano_id
    and (fl.aplica_a = 'ambas'
      or (fl.aplica_a = 'solo_elysium'      and p_variante = 'elysium')
      or (fl.aplica_a = 'solo_marca_blanca' and p_variante = 'marca_blanca'))
  order by i.nombre;
$$;

-- El importe que le corresponde a la persona logueada: precio de venta si es
-- cliente, costo c/etiqueta si es revendedor (§2). Devuelve UN número.
create or replace function catalogo_para_usuario()
returns table (
  tamano_id uuid, producto text, tamano text, magnitud numeric,
  unidad unidad_tamano, importe numeric, base text, completo boolean
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare v_paga_costo boolean;
begin
  select coalesce(bool_or(pe.tipo = 'revendedor'), false) into v_paga_costo
  from personas pe where pe.perfil_id = auth.uid();

  return query
  select t.id, p.nombre, t.nombre, t.magnitud, t.unidad,
         case when v_paga_costo then c.costo_con_etiqueta else pv.precio end,
         case when v_paga_costo then 'costo' else 'precio_venta' end,
         case when v_paga_costo then c.completo else pv.precio is not null end
  from tamanos t
  join productos p on p.id = t.producto_id
  left join lateral (
    select precio from tamano_precios
    where tamano_id = t.id and variante = 'elysium' and vigente_desde <= current_date
    order by vigente_desde desc, creado_en desc limit 1
  ) pv on true
  left join lateral (select * from costo_tamano(t.id, current_date, null, 'elysium')) c on true
  where t.activo and p.activo
  order by p.nombre, t.magnitud;
end;
$$;

revoke execute on function calcular_insumos(uuid, numeric, variante_producto) from public, anon;
revoke execute on function catalogo_para_usuario() from public, anon;
grant  execute on function calcular_insumos(uuid, numeric, variante_producto) to authenticated;
grant  execute on function catalogo_para_usuario() to authenticated;

-- Un productor registra el resultado de SU lote sin ver los costos.
-- Function en vez de policy: el RLS es por FILA, y darle SELECT sobre `lotes`
-- le abriría las columnas de costo congelado de esa misma fila.
create or replace function registrar_resultado_lote(
  p_lote_id uuid, p_resultado resultado_lote, p_unidades_obtenidas numeric
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_ok boolean;
begin
  select exists (
    select 1 from lotes l join personas pe on pe.id = l.responsable_persona_id
    where l.id = p_lote_id and pe.perfil_id = auth.uid() and l.estado = 'abierto'
  ) into v_ok;
  if not v_ok and not es_admin() then
    raise exception 'no sos responsable de este lote, o el lote ya está cerrado';
  end if;
  perform cerrar_lote(p_lote_id, p_resultado, p_unidades_obtenidas);
end;
$$;
revoke execute on function registrar_resultado_lote(uuid, resultado_lote, numeric) from public, anon;
grant  execute on function registrar_resultado_lote(uuid, resultado_lote, numeric) to authenticated;

-- ---------------------------------------------------------------------------- RLS
alter table solicitudes     enable row level security;
alter table solicitud_lineas enable row level security;

create policy solicitudes_admin on solicitudes for all to authenticated
  using (es_admin()) with check (es_admin());
create policy solicitudes_propias_select on solicitudes for select to authenticated
  using (exists (select 1 from personas pe where pe.id = solicitudes.persona_id and pe.perfil_id = auth.uid()));
create policy solicitudes_propias_insert on solicitudes for insert to authenticated
  with check (exists (select 1 from personas pe where pe.id = solicitudes.persona_id and pe.perfil_id = auth.uid()));

create policy solicitud_lineas_admin on solicitud_lineas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy solicitud_lineas_propias_select on solicitud_lineas for select to authenticated
  using (exists (select 1 from solicitudes s join personas pe on pe.id = s.persona_id
                 where s.id = solicitud_lineas.solicitud_id and pe.perfil_id = auth.uid()));
create policy solicitud_lineas_propias_insert on solicitud_lineas for insert to authenticated
  with check (exists (select 1 from solicitudes s join personas pe on pe.id = s.persona_id
                 where s.id = solicitud_lineas.solicitud_id and pe.perfil_id = auth.uid()));

-- Marcar la etiqueta Elysium del Shampoo Cafe como solo_elysium (dato de prueba
-- del bloque de verificación; inocuo si la fila no existe).
update formula_lineas fl set aplica_a = 'solo_elysium'
from insumos i where i.id = fl.insumo_id and i.tipo = 'etiqueta';
