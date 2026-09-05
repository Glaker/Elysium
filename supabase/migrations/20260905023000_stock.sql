-- =============================================================================
-- Elysium — 03. Stock por movimientos inmutables
--
-- §14.1: el stock es un derivado, no un dato. No hay columna de stock en
-- ninguna tabla; se calcula sumando movimientos. Un error se corrige con un
-- movimiento de signo contrario, que deja rastro.
--
-- La inmutabilidad es real: REVOKE de UPDATE/DELETE + trigger que aborta.
-- El REVOKE solo no alcanza porque el dueño de la tabla puede re-otorgarse
-- permisos; el trigger cierra esa puerta para cualquier rol.
-- =============================================================================

create type tipo_mov_producto as enum
  ('stock_inicial', 'produccion', 'venta', 'entrega', 'ajuste', 'merma', 'muestra', 'traslado');

create type tipo_mov_insumo as enum
  ('stock_inicial', 'compra', 'produccion', 'consumo_lote', 'merma', 'ajuste', 'devolucion');

create table ubicaciones (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  es_default boolean not null default false,
  activo     boolean not null default true
);
create unique index ubicacion_default_unica on ubicaciones (es_default) where es_default;

create table movimientos_producto (
  id           uuid primary key default gen_random_uuid(),
  tamano_id    uuid not null references tamanos (id) on delete restrict,
  ubicacion_id uuid not null references ubicaciones (id) on delete restrict,
  cantidad     numeric not null check (cantidad <> 0),
  tipo         tipo_mov_producto not null,
  fecha        date not null default current_date,
  lote_id      uuid references lotes (id) on delete restrict,
  recuento_id  uuid,
  motivo       text,
  creado_por   uuid references perfiles (id),
  creado_en    timestamptz not null default now()
);
comment on table movimientos_producto is 'Libro de asientos de producto terminado. Inmutable: sin UPDATE ni DELETE.';
create index on movimientos_producto (tamano_id, ubicacion_id);
create index on movimientos_producto (fecha desc);

create table movimientos_insumo (
  id          uuid primary key default gen_random_uuid(),
  insumo_id   uuid not null references insumos (id) on delete restrict,
  cantidad    numeric not null check (cantidad <> 0),
  tipo        tipo_mov_insumo not null,
  fecha       date not null default current_date,
  lote_id     uuid references lotes (id) on delete restrict,
  recuento_id uuid,
  motivo      text,
  creado_por  uuid references perfiles (id),
  creado_en   timestamptz not null default now()
);
comment on column movimientos_insumo.cantidad is 'En unidad chica (g/ml/unidad), con signo. Misma convención que fórmulas y composición.';
create index on movimientos_insumo (insumo_id);
create index on movimientos_insumo (fecha desc);

-- ------------------------------------------------------------ inmutabilidad
create or replace function impedir_modificacion()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'los movimientos de stock son inmutables (intento de % en %). Corregí con un movimiento de signo contrario.',
    tg_op, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

create trigger mov_producto_inmutable
  before update or delete on movimientos_producto
  for each row execute function impedir_modificacion();

create trigger mov_insumo_inmutable
  before update or delete on movimientos_insumo
  for each row execute function impedir_modificacion();

revoke update, delete on movimientos_producto from public, anon, authenticated;
revoke update, delete on movimientos_insumo   from public, anon, authenticated;

-- ------------------------------------------------------------------ recuentos
create type estado_recuento as enum ('abierto', 'confirmado');

create table recuentos (
  id                uuid primary key default gen_random_uuid(),
  fecha             date not null default current_date,
  ubicacion_id      uuid not null references ubicaciones (id) on delete restrict,
  estado            estado_recuento not null default 'abierto',
  es_stock_inicial  boolean not null default false,
  notas             text,
  confirmado_en     timestamptz,
  creado_por        uuid references perfiles (id),
  creado_en         timestamptz not null default now()
);
comment on column recuentos.es_stock_inicial is 'La carga de stock inicial de §6 es un recuento como cualquier otro; solo cambia el tipo de movimiento que emite.';

create table recuento_lineas (
  id                uuid primary key default gen_random_uuid(),
  recuento_id       uuid not null references recuentos (id) on delete cascade,
  tamano_id         uuid not null references tamanos (id) on delete restrict,
  cantidad_contada  numeric not null check (cantidad_contada >= 0),
  cantidad_teorica  numeric,
  unique (recuento_id, tamano_id)
);
comment on column recuento_lineas.cantidad_teorica is 'Congelada al confirmar, para que la diferencia siga siendo auditable después (§6).';

-- ---------------------------------------------------------------------- vistas
create view v_stock_producto with (security_invoker = true) as
select
  mp.tamano_id,
  p.nombre as producto,
  t.nombre as tamano,
  mp.ubicacion_id,
  u.nombre as ubicacion,
  sum(mp.cantidad) as stock
from movimientos_producto mp
join tamanos t     on t.id = mp.tamano_id
join productos p   on p.id = t.producto_id
join ubicaciones u on u.id = mp.ubicacion_id
group by mp.tamano_id, p.nombre, t.nombre, mp.ubicacion_id, u.nombre;

create view v_stock_producto_total with (security_invoker = true) as
select mp.tamano_id, p.nombre as producto, t.nombre as tamano, sum(mp.cantidad) as stock
from movimientos_producto mp
join tamanos t   on t.id = mp.tamano_id
join productos p on p.id = t.producto_id
group by mp.tamano_id, p.nombre, t.nombre;

create view v_stock_insumo with (security_invoker = true) as
select mi.insumo_id, i.nombre, i.unidad, sum(mi.cantidad) as stock
from movimientos_insumo mi
join insumos i on i.id = mi.insumo_id
group by mi.insumo_id, i.nombre, i.unidad;

-- ------------------------------------------------------------------ funciones
create or replace function ubicacion_default()
returns uuid
language sql stable
set search_path = public, pg_temp
as $$ select id from ubicaciones where es_default limit 1 $$;

-- Confirmar un recuento congela el teórico y emite ajustes por la diferencia.
-- No pisa ningún número: la corrección es un movimiento más.
create or replace function recuento_confirmar(p_recuento_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_r recuentos%rowtype;
  r   record;
  v_dif numeric;
begin
  select * into v_r from recuentos where id = p_recuento_id for update;
  if not found then raise exception 'recuento inexistente: %', p_recuento_id; end if;
  if v_r.estado = 'confirmado' then raise exception 'el recuento % ya fue confirmado', p_recuento_id; end if;

  for r in select * from recuento_lineas where recuento_id = p_recuento_id loop
    select coalesce(sum(cantidad), 0) into v_dif
    from movimientos_producto
    where tamano_id = r.tamano_id and ubicacion_id = v_r.ubicacion_id;

    update recuento_lineas set cantidad_teorica = v_dif where id = r.id;

    v_dif := r.cantidad_contada - v_dif;
    if v_dif <> 0 then
      insert into movimientos_producto
        (tamano_id, ubicacion_id, cantidad, tipo, fecha, recuento_id, motivo)
      values (r.tamano_id, v_r.ubicacion_id, v_dif,
              case when v_r.es_stock_inicial then 'stock_inicial' else 'ajuste' end::tipo_mov_producto,
              v_r.fecha, p_recuento_id,
              case when v_r.es_stock_inicial then 'Carga de stock inicial'
                   else 'Ajuste por recuento físico' end);
    end if;
  end loop;

  update recuentos set estado = 'confirmado', confirmado_en = now() where id = p_recuento_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cerrar_lote (reemplazo): ahora hace las TRES cosas juntas.
--   1. congela costos y parámetros
--   2. genera las salidas de insumo (consumo + merma efectiva)
--   3. genera la entrada de producto terminado o de MP intermedia
-- ---------------------------------------------------------------------------
create or replace function cerrar_lote(
  p_lote_id            uuid,
  p_resultado          resultado_lote,
  p_unidades_obtenidas numeric,
  p_merma_pct          numeric default null,
  p_perdida_cantidad   numeric default null,
  p_ubicacion_id       uuid default null
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_l          lotes%rowtype;
  v_merma      numeric;
  v_vh         numeric;
  v_reg        numeric;
  v_completo   boolean := true;
  v_faltantes  text[]  := '{}';
  v_costo      resultado_costo;
  v_unidades   numeric;
  v_consumida  numeric;
  v_ubic       uuid;
  r            record;
begin
  select * into v_l from lotes where id = p_lote_id for update;
  if not found then raise exception 'lote inexistente: %', p_lote_id; end if;
  if v_l.estado = 'cerrado' then raise exception 'el lote % ya está cerrado', p_lote_id; end if;

  v_unidades := case when p_resultado = 'descarte' then 0 else p_unidades_obtenidas end;
  if v_unidades is null then raise exception 'faltan las unidades obtenidas'; end if;

  v_merma := coalesce(p_merma_pct, parametro_valor('merma_pct', v_l.fecha));
  if v_merma is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['merma_pct (parámetro sin valor)'];
    v_merma     := 0;
  end if;

  v_vh := parametro_valor('valor_hora', v_l.fecha);
  if v_vh is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['valor_hora (parámetro sin valor)'];
  end if;
  v_reg := parametro_valor('regalias_por_unidad', v_l.fecha);
  if v_reg is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['regalias_por_unidad (parámetro sin valor)'];
  end if;

  -- 1 + 2: congelar costos y sacar los insumos del stock.
  for r in
    select li.*, i.tipo
    from lote_insumos li
    join insumos i on i.id = li.insumo_id
    where li.lote_id = p_lote_id
  loop
    v_consumida := r.cantidad_planificada *
                   case when r.tipo = 'materia_prima' then 1 + v_merma / 100.0 else 1 end;

    v_costo := costo_insumo(r.insumo_id, v_l.fecha);

    update lote_insumos
       set cantidad_consumida       = v_consumida,
           costo_unitario_congelado = v_costo.costo,
           costo_total_congelado    = case when v_costo.completo
                                        then v_consumida * v_costo.costo end
     where id = r.id;

    if not v_costo.completo then
      v_completo  := false;
      v_faltantes := v_faltantes || v_costo.faltantes;
    end if;

    if v_consumida > 0 then
      insert into movimientos_insumo (insumo_id, cantidad, tipo, fecha, lote_id, motivo)
      values (r.insumo_id, -v_consumida, 'consumo_lote', v_l.fecha, p_lote_id,
              'Consumo del lote ' || coalesce(v_l.codigo, p_lote_id::text));
    end if;
  end loop;

  -- 3: entrada de lo producido. Un descarte no entra nada (§3.4).
  if v_unidades > 0 then
    if v_l.tamano_id is not null then
      v_ubic := coalesce(p_ubicacion_id, ubicacion_default());
      if v_ubic is null then
        raise exception 'no hay ubicación destino: pasá p_ubicacion_id o marcá una ubicación por defecto';
      end if;
      insert into movimientos_producto (tamano_id, ubicacion_id, cantidad, tipo, fecha, lote_id, motivo)
      values (v_l.tamano_id, v_ubic, v_unidades, 'produccion', v_l.fecha, p_lote_id,
              'Producción del lote ' || coalesce(v_l.codigo, p_lote_id::text));
    else
      insert into movimientos_insumo (insumo_id, cantidad, tipo, fecha, lote_id, motivo)
      values (v_l.insumo_producido_id, v_unidades, 'produccion', v_l.fecha, p_lote_id,
              'Producción de MP intermedia, lote ' || coalesce(v_l.codigo, p_lote_id::text));
    end if;
  end if;

  update lotes
     set estado              = 'cerrado',
         resultado           = p_resultado,
         unidades_obtenidas  = v_unidades,
         perdida_cantidad    = coalesce(p_perdida_cantidad,
                                        greatest(unidades_planificadas - v_unidades, 0)),
         merma_pct_aplicado  = v_merma,
         valor_hora_aplicado = v_vh,
         regalias_aplicado   = v_reg,
         costo_completo      = v_completo,
         costo_faltantes     = v_faltantes,
         cerrado_en          = now(),
         cerrado_por         = auth.uid()
   where id = p_lote_id;
end;
$$;

-- ---------------------------------------------------------------------------- RLS
alter table ubicaciones          enable row level security;
alter table movimientos_producto enable row level security;
alter table movimientos_insumo   enable row level security;
alter table recuentos            enable row level security;
alter table recuento_lineas      enable row level security;

create policy ubicaciones_select on ubicaciones for select to authenticated using (true);
create policy ubicaciones_admin  on ubicaciones for all to authenticated
  using (es_admin()) with check (es_admin());

create policy mov_producto_admin on movimientos_producto for all to authenticated
  using (es_admin()) with check (es_admin());
create policy mov_insumo_admin on movimientos_insumo for all to authenticated
  using (es_admin()) with check (es_admin());
create policy recuentos_admin on recuentos for all to authenticated
  using (es_admin()) with check (es_admin());
create policy recuento_lineas_admin on recuento_lineas for all to authenticated
  using (es_admin()) with check (es_admin());

insert into ubicaciones (nombre, es_default) values
  ('Cajon', true), ('Vitrina', false), ('Muestras', false);
