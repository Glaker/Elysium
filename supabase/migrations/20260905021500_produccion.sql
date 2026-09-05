-- =============================================================================
-- Elysium — 02. Producción
--
-- Un lote produce O un tamaño de producto terminado O una MP intermedia
-- (la tanda de resina de §4 también es una producción). Destino dual con
-- exclusividad garantizada por restricción.
--
-- DECISIÓN (costo de MP intermedia): un lote que consume una MP intermedia
-- congela su costo TEÓRICO a la fecha del lote, no el costo real de la tanda
-- concreta de resina que se usó.
--   Consecuencia: si la tanda de resina de febrero salió más cara que el
--   teórico, el costo del lote de marzo no lo refleja. Es una aproximación
--   consciente.
--   Camino de evolución: `lote_insumos.lote_origen_id` ya existe y queda nulo.
--   El día que haga falta trazabilidad real, se apunta al lote que produjo esa
--   MP y se lee su costo unitario real en vez del teórico, sin migrar esquema.
-- =============================================================================

create type estado_lote    as enum ('abierto', 'cerrado');
create type resultado_lote as enum ('ok', 'descarte', 'reproceso');

create table lotes (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text unique,
  fecha                 date not null default current_date,

  -- Destino dual: producto terminado o MP intermedia. Exactamente uno.
  tamano_id             uuid references tamanos (id) on delete restrict,
  insumo_producido_id   uuid references insumos (id) on delete restrict,

  unidades_planificadas numeric not null check (unidades_planificadas > 0),
  unidades_obtenidas    numeric check (unidades_obtenidas >= 0),
  perdida_cantidad      numeric check (perdida_cantidad >= 0),

  estado                estado_lote not null default 'abierto',
  resultado             resultado_lote,

  -- Parámetros congelados al cierre (§14.4 + §14.2).
  merma_pct_aplicado    numeric,
  valor_hora_aplicado   numeric,
  regalias_aplicado     numeric,

  -- El costo puede quedar incompleto sin que nada reviente.
  costo_completo        boolean,
  costo_faltantes       text[],

  responsable_persona_id uuid references personas (id) on delete set null,
  notas                 text,
  cerrado_en            timestamptz,
  cerrado_por           uuid references perfiles (id),
  creado_en             timestamptz not null default now(),
  creado_por            uuid references perfiles (id),

  constraint destino_exclusivo check (
    (tamano_id is not null and insumo_producido_id is null) or
    (tamano_id is null and insumo_producido_id is not null)
  ),
  constraint cerrado_tiene_resultado check (
    estado = 'abierto' or (resultado is not null and unidades_obtenidas is not null)
  ),
  constraint descarte_no_produce check (
    resultado is distinct from 'descarte' or unidades_obtenidas = 0
  )
);
comment on column lotes.unidades_planificadas is 'Para un tamaño: unidades a producir. Para una MP intermedia: cantidad a producir en unidad chica (ej. ml de resina), NO cantidad de tandas.';
comment on column lotes.merma_pct_aplicado is 'Merma EFECTIVA del lote, declarada al cierre. Distinta de la merma esperada que usa costo_tamano() para pricing.';

create index on lotes (fecha desc);
create index on lotes (estado);

create table lote_insumos (
  id                       uuid primary key default gen_random_uuid(),
  lote_id                  uuid not null references lotes (id) on delete cascade,
  insumo_id                uuid not null references insumos (id) on delete restrict,
  cantidad_planificada     numeric not null check (cantidad_planificada >= 0),
  cantidad_consumida       numeric check (cantidad_consumida >= 0),
  costo_unitario_congelado numeric,
  costo_total_congelado    numeric,
  lote_origen_id           uuid references lotes (id) on delete set null,
  unique (lote_id, insumo_id)
);
comment on table lote_insumos is 'Qué consumió el lote, con el costo congelado al cierre. Esto es más fuerte que versionar la fórmula: registra lo que pasó, no lo que la receta decía.';
comment on column lote_insumos.lote_origen_id is 'Reservado: el lote de MP intermedia del que salió este insumo. Hoy siempre nulo (se usa costo teórico). Ver cabecera de la migración.';

create table lote_personas (
  id             uuid primary key default gen_random_uuid(),
  lote_id        uuid not null references lotes (id) on delete cascade,
  persona_id     uuid not null references personas (id) on delete restrict,
  horas          numeric check (horas >= 0),
  importe_pagado numeric check (importe_pagado >= 0),
  notas          text,
  unique (lote_id, persona_id)
);
comment on table lote_personas is 'Quién trabajó, cuánto tiempo y cuánto cobró (§3.3). Hoy en el Excel la mano de obra es un número agregado.';

-- ---------------------------------------------------------------------------
-- lote_planificar: llena lote_insumos desde la fórmula / composición.
-- Se puede volver a correr mientras el lote esté abierto.
-- ---------------------------------------------------------------------------
create or replace function lote_planificar(p_lote_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_l lotes%rowtype;
  v_t tamanos%rowtype;
  v_i insumos%rowtype;
begin
  select * into v_l from lotes where id = p_lote_id;
  if not found then raise exception 'lote inexistente: %', p_lote_id; end if;
  if v_l.estado <> 'abierto' then raise exception 'el lote % ya está cerrado', p_lote_id; end if;

  delete from lote_insumos where lote_id = p_lote_id;

  if v_l.tamano_id is not null then
    select * into v_t from tamanos where id = v_l.tamano_id;
    insert into lote_insumos (lote_id, insumo_id, cantidad_planificada)
    select p_lote_id, fl.insumo_id,
           (case fl.modo
              when 'porcentaje' then fl.porcentaje / 100.0 * v_t.magnitud
              else fl.cantidad_fija
            end) * v_l.unidades_planificadas
    from formula_lineas fl
    where fl.tamano_id = v_l.tamano_id;
  else
    select * into v_i from insumos where id = v_l.insumo_producido_id;
    if v_i.rinde_cantidad is null then
      raise exception 'la MP intermedia % no tiene rinde declarado', v_i.nombre;
    end if;
    -- unidades_planificadas está en unidad chica: cuántas tandas equivale.
    insert into lote_insumos (lote_id, insumo_id, cantidad_planificada)
    select p_lote_id, ic.insumo_componente_id,
           ic.cantidad * (v_l.unidades_planificadas / v_i.rinde_cantidad)
    from insumo_composicion ic
    where ic.insumo_producido_id = v_l.insumo_producido_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- cerrar_lote: congela costos y parámetros, fija el resultado.
--
-- En la migración 03 esta función se REEMPLAZA para que además genere los
-- movimientos de stock (salida de insumo por consumo+merma, entrada de producto
-- si corresponde). Las tablas de movimientos todavía no existen acá.
-- ---------------------------------------------------------------------------
create or replace function cerrar_lote(
  p_lote_id            uuid,
  p_resultado          resultado_lote,
  p_unidades_obtenidas numeric,
  p_merma_pct          numeric default null,
  p_perdida_cantidad   numeric default null
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
  r            record;
begin
  select * into v_l from lotes where id = p_lote_id for update;
  if not found then raise exception 'lote inexistente: %', p_lote_id; end if;
  if v_l.estado = 'cerrado' then raise exception 'el lote % ya está cerrado', p_lote_id; end if;

  -- Un descarte no produce nada, se pida lo que se pida (§3.4).
  v_unidades := case when p_resultado = 'descarte' then 0 else p_unidades_obtenidas end;
  if v_unidades is null then raise exception 'faltan las unidades obtenidas'; end if;

  v_merma := coalesce(p_merma_pct, parametro_valor('merma_pct', v_l.fecha));
  if v_merma is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['merma_pct (parámetro sin valor)'];
    v_merma     := 0;   -- solo para poder registrar el consumo; el costo queda marcado incompleto
  end if;

  v_vh  := parametro_valor('valor_hora', v_l.fecha);
  if v_vh is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['valor_hora (parámetro sin valor)'];
  end if;
  v_reg := parametro_valor('regalias_por_unidad', v_l.fecha);
  if v_reg is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['regalias_por_unidad (parámetro sin valor)'];
  end if;

  -- Congelar el costo de cada insumo consumido, a la fecha del lote.
  for r in select * from lote_insumos where lote_id = p_lote_id loop
    v_costo := costo_insumo(r.insumo_id, v_l.fecha);

    update lote_insumos
       set cantidad_consumida       = r.cantidad_planificada * (1 + v_merma / 100.0),
           costo_unitario_congelado = v_costo.costo,
           costo_total_congelado    = case when v_costo.completo
                                        then r.cantidad_planificada * (1 + v_merma / 100.0) * v_costo.costo
                                      end
     where id = r.id;

    if not v_costo.completo then
      v_completo  := false;
      v_faltantes := v_faltantes || v_costo.faltantes;
    end if;
  end loop;

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

-- ---------------------------------------------------------------------------
-- v_lote_costo: el costo REAL del lote, desde las filas congeladas.
--
-- Mano de obra: si hay personas cargadas se usa lo efectivamente pagado; si no,
-- se estima con el valor hora congelado y la productividad del tamaño.
-- Regalías: por unidad OBTENIDA. Un descarte no paga regalías.
-- ---------------------------------------------------------------------------
create view v_lote_costo with (security_invoker = true) as
select
  l.id as lote_id,
  l.codigo,
  l.fecha,
  l.estado,
  l.resultado,
  l.unidades_planificadas,
  l.unidades_obtenidas,
  coalesce(p.nombre, i.nombre)              as produce,
  li.costo_insumos,
  coalesce(lp.pagado, est.mo_estimada)      as costo_mano_obra,
  (lp.pagado is not null)                   as mano_obra_real,
  l.regalias_aplicado * l.unidades_obtenidas as costo_regalias,
  li.costo_insumos
    + coalesce(lp.pagado, est.mo_estimada, 0)
    + l.regalias_aplicado * l.unidades_obtenidas as costo_total,
  case when l.unidades_obtenidas > 0 then
    (li.costo_insumos
      + coalesce(lp.pagado, est.mo_estimada, 0)
      + l.regalias_aplicado * l.unidades_obtenidas) / l.unidades_obtenidas
  end as costo_unitario_real,
  l.costo_completo,
  l.costo_faltantes
from lotes l
left join tamanos  t on t.id = l.tamano_id
left join productos p on p.id = t.producto_id
left join insumos  i on i.id = l.insumo_producido_id
left join lateral (
  select sum(costo_total_congelado) as costo_insumos
  from lote_insumos where lote_id = l.id
) li on true
left join lateral (
  select sum(importe_pagado) as pagado
  from lote_personas where lote_id = l.id
) lp on true
left join lateral (
  select case when t.productividad_unid_hora is not null and l.valor_hora_aplicado is not null
              then l.valor_hora_aplicado * l.unidades_planificadas / t.productividad_unid_hora
         end as mo_estimada
) est on true;

-- =============================================================================
-- RLS — producción es información de costo y tiempo: solo admin (§10).
-- En la migración 05 se agrega la política que deja a un productor registrar
-- el resultado de SU lote sin ver los costos.
-- =============================================================================
alter table lotes         enable row level security;
alter table lote_insumos  enable row level security;
alter table lote_personas enable row level security;

create policy lotes_admin on lotes for all to authenticated
  using (es_admin()) with check (es_admin());
create policy lote_insumos_admin on lote_insumos for all to authenticated
  using (es_admin()) with check (es_admin());
create policy lote_personas_admin on lote_personas for all to authenticated
  using (es_admin()) with check (es_admin());
