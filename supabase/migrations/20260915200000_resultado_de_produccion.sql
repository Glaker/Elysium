-- =============================================================================
-- Elysium — 17. La productora carga el resultado de lo que fabricó
--
-- Hasta acá una productora podía pedir materia prima (§15) y ahí se terminaba:
-- el pedido se resolvía como "entregado" y lo que pasaba después —cuánto salió,
-- cuánto se perdió, quiénes trabajaron y cuántas horas— volvía por WhatsApp y lo
-- cargaba Johanna a mano, si es que volvía. El dato más caro de la producción es
-- el único que no tenía dónde entrar.
--
-- Lo que faltaba no era una tabla: `lotes`, `lote_insumos` y `lote_personas`
-- (§02) ya modelan exactamente eso. Faltaban tres cosas:
--
--   1. que el pedido de materia prima se convierta en un lote, para que "sus
--      insumos pedidos" y "su producción" sean la misma fila y no dos listas que
--      alguien tiene que aparear de memoria;
--   2. que la productora pueda ver los lotes de los que es responsable sin que
--      eso le abra las columnas de costo congelado de esas mismas filas;
--   3. que el resultado incluya la mano de obra, que es la mitad del costo real
--      y hoy en el Excel es un número agregado que nadie sabe de dónde sale.
--
-- Una decisión que conviene dejar escrita: **reportar no es cerrar.** El cierre
-- congela costos, merma y valor hora (§14) y es un acto de administración; lo
-- que hace la productora es declarar qué pasó en su mesa de trabajo. Johanna
-- mira ese reporte y cierra. `registrar_resultado_lote` cerraba el lote de una:
-- se cambia, y esa es la única incompatibilidad de esta migración.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. El pedido de materia prima queda apuntando a su lote
--
-- En `solicitudes` y no en `lotes` porque la relación es opcional del lado del
-- lote y obligatoria del lado del pedido: un lote puede nacer sin pedido (lo
-- carga Johanna), pero un pedido de MP aprobado tiene exactamente un lote.
-- ---------------------------------------------------------------------------
alter table solicitudes
  add column lote_id uuid references lotes (id) on delete set null;

comment on column solicitudes.lote_id is
  'El lote que se abrió con este pedido de materia prima. Nulo en un pedido de producto y en uno todavía sin resolver.';

create unique index on solicitudes (lote_id) where lote_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Cuándo se reportó el resultado
--
-- `unidades_obtenidas is not null` ya alcanzaría para saber que alguien cargó
-- algo, pero no para saber cuándo ni quién, y ese es justo el dato que hace que
-- Johanna pueda mirar "lo que entró esta semana" sin abrir lote por lote.
-- ---------------------------------------------------------------------------
alter table lotes
  add column reportado_en  timestamptz,
  add column reportado_por uuid references perfiles (id);

comment on column lotes.reportado_en is
  'Cuándo la responsable cargó el resultado. Es anterior al cierre: reportar declara qué pasó, cerrar congela el costo.';

create index on lotes (reportado_en desc) where reportado_en is not null;

-- ---------------------------------------------------------------------------
-- 3. Abrir el lote desde el pedido
--
-- Lo llama un admin al aprobar el pedido de materia prima. Es el equivalente de
-- `aprobar_solicitud_como_venta` para el otro tipo de pedido: una función y no
-- tres llamadas del cliente porque son tres escrituras —el lote, su plan de
-- insumos y el estado del pedido— que no tienen sentido a medias.
--
-- La responsable es quien pidió, y eso es lo que después habilita todo lo demás:
-- "sus insumos" y "su producción" son la misma fila.
-- ---------------------------------------------------------------------------
create or replace function lote_desde_solicitud(
  p_solicitud_id uuid,
  p_fecha        date default current_date
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_s    solicitudes%rowtype;
  v_lote uuid;
begin
  if not es_admin() then
    raise exception 'solo un admin abre el lote de un pedido';
  end if;

  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'pedido inexistente: %', p_solicitud_id; end if;
  if v_s.tipo <> 'materia_prima' then
    raise exception 'un pedido de producto no abre un lote: aprobalo como venta';
  end if;
  if v_s.lote_id is not null then
    raise exception 'este pedido ya tiene su lote abierto';
  end if;
  if v_s.tamano_objetivo_id is null or v_s.unidades_objetivo is null then
    raise exception 'el pedido no dice qué ni cuánto se va a fabricar';
  end if;

  insert into lotes (
    fecha, tamano_id, unidades_planificadas, responsable_persona_id, creado_por, notas
  )
  values (
    p_fecha, v_s.tamano_objetivo_id, v_s.unidades_objetivo, v_s.persona_id, auth.uid(),
    'Pedido de materia prima del ' || to_char(v_s.fecha, 'DD/MM/YYYY')
      || coalesce(' — ' || v_s.notas, '')
  )
  returning id into v_lote;

  -- Las cantidades salen de la fórmula, igual que las que vio la productora en
  -- la calculadora cuando pidió: el plan del lote y lo que se le entregó son el
  -- mismo número, calculado por el mismo lado.
  perform lote_planificar(v_lote);

  -- 'aprobada' es lo que el resto de la app lee como "resuelto": el enum no
  -- distingue entregado de aprobado, y no hace falta que lo haga —el lote es la
  -- prueba de que el material salió.
  update solicitudes set
    lote_id      = v_lote,
    estado       = 'aprobada',
    resuelta_en  = now(),
    resuelta_por = auth.uid()
  where id = p_solicitud_id;

  return v_lote;
end;
$$;

revoke execute on function lote_desde_solicitud(uuid, date) from public, anon;
grant  execute on function lote_desde_solicitud(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Los lotes de los que soy responsable
--
-- Function y no policy, por lo mismo que `registrar_resultado_lote` (§05): el
-- RLS es por fila, y un `select` sobre `lotes` le abriría a la productora las
-- columnas de costo congelado de esas mismas filas. Acá se eligen las columnas
-- una por una y ninguna es plata.
-- ---------------------------------------------------------------------------
create or replace function mis_lotes()
returns table (
  id                    uuid,
  fecha                 date,
  producto              text,
  tamano                text,
  unidades_planificadas numeric,
  unidades_obtenidas    numeric,
  perdida_cantidad      numeric,
  resultado             resultado_lote,
  estado                estado_lote,
  reportado_en          timestamptz,
  notas                 text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select l.id, l.fecha,
         coalesce(p.nombre, i.nombre),
         coalesce(t.nombre, t.magnitud || ' ' || t.unidad, i.unidad::text),
         l.unidades_planificadas, l.unidades_obtenidas, l.perdida_cantidad,
         l.resultado, l.estado, l.reportado_en, l.notas
  from lotes l
  join personas pe on pe.id = l.responsable_persona_id
  left join tamanos  t on t.id = l.tamano_id
  left join productos p on p.id = t.producto_id
  left join insumos  i on i.id = l.insumo_producido_id
  where pe.perfil_id = auth.uid()
  order by l.estado, l.fecha desc;
$$;

revoke execute on function mis_lotes() from public, anon;
grant  execute on function mis_lotes() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Con quién puedo decir que trabajé
--
-- `lote_personas.persona_id` es una FK: quien trabajó tiene que estar en el
-- padrón. Pero una productora solo ve su propia ficha (RLS de `personas`), así
-- que sin esto no tendría de dónde elegir a nadie.
--
-- Devuelve las productoras activas y a ella misma, y nada más: el padrón entero
-- es la lista de clientas de Johanna, y no hay ninguna razón para que una
-- productora la lea. Nombre e id, sin teléfono.
-- ---------------------------------------------------------------------------
create or replace function companeras_de_produccion()
returns table (id uuid, nombre text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select pe.id, pe.nombre_completo
  from personas pe
  where pe.activo
    and (pe.es_productor or pe.perfil_id = auth.uid())
  order by pe.nombre_completo;
$$;

revoke execute on function companeras_de_produccion() from public, anon;
grant  execute on function companeras_de_produccion() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Cargar el resultado
--
-- Reemplaza a la versión de §05, que cerraba el lote. Reportar y cerrar se
-- separan: la productora declara qué salió de su mesa —cuánto, cuánto se perdió,
-- quiénes y cuántas horas— y el lote **queda abierto**. Johanna lo revisa y lo
-- cierra, que es cuando se congelan costo, merma y valor hora (§14).
--
-- Se puede volver a cargar mientras el lote esté abierto: el primer número que
-- alguien escribe después de una jornada de trabajo no siempre es el bueno, y
-- una corrección no debería necesitar un admin.
--
-- `p_personas` es un jsonb `[{"persona_id": "...", "horas": 4.5}, ...]` y no dos
-- arrays paralelos: son pares, y dos arrays que hay que mantener del mismo largo
-- es la forma conocida de asignarle las horas de una a otra. Las filas se
-- reemplazan enteras —no se hace merge— porque "saquen a Fulana, que al final no
-- vino" tiene que ser posible.
-- ---------------------------------------------------------------------------
drop function if exists registrar_resultado_lote(uuid, resultado_lote, numeric);

create or replace function registrar_resultado_lote(
  p_lote_id            uuid,
  p_resultado          resultado_lote,
  p_unidades_obtenidas numeric,
  p_perdida_cantidad   numeric default null,
  p_notas              text    default null,
  p_personas           jsonb   default '[]'::jsonb
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_l        lotes%rowtype;
  v_soy_yo   boolean;
  v_unidades numeric;
begin
  select * into v_l from lotes where id = p_lote_id for update;
  if not found then raise exception 'lote inexistente: %', p_lote_id; end if;

  select exists (
    select 1 from personas pe
    where pe.id = v_l.responsable_persona_id and pe.perfil_id = auth.uid()
  ) into v_soy_yo;

  if not v_soy_yo and not es_admin() then
    raise exception 'no sos responsable de este lote';
  end if;
  if v_l.estado <> 'abierto' then
    raise exception 'el lote ya está cerrado: pedile a la administración que lo reabra';
  end if;

  -- Un descarte no produce nada, se cargue lo que se cargue (§3.4). Es la misma
  -- regla que aplica `cerrar_lote`, repetida acá porque este camino no pasa por
  -- ahí y el dato tiene que quedar coherente desde que se escribe.
  v_unidades := case when p_resultado = 'descarte' then 0 else p_unidades_obtenidas end;
  if v_unidades is null then raise exception 'faltan las unidades obtenidas'; end if;
  if v_unidades < 0 then raise exception 'las unidades obtenidas no pueden ser negativas'; end if;

  update lotes set
    resultado          = p_resultado,
    unidades_obtenidas = v_unidades,
    perdida_cantidad   = coalesce(p_perdida_cantidad,
                                  greatest(unidades_planificadas - v_unidades, 0)),
    notas              = coalesce(nullif(btrim(p_notas), ''), notas),
    reportado_en       = now(),
    reportado_por      = auth.uid()
  where id = p_lote_id;

  -- `importe_pagado` no se toca: cuánto cobró cada una es plata, y la plata la
  -- pone la administración. Acá se declaran horas.
  delete from lote_personas where lote_id = p_lote_id;

  insert into lote_personas (lote_id, persona_id, horas)
  select p_lote_id, (x ->> 'persona_id')::uuid, nullif(x ->> 'horas', '')::numeric
  from jsonb_array_elements(coalesce(p_personas, '[]'::jsonb)) x
  where (x ->> 'persona_id') is not null
  on conflict (lote_id, persona_id) do update set horas = excluded.horas;
end;
$$;

revoke execute on function registrar_resultado_lote(uuid, resultado_lote, numeric, numeric, text, jsonb) from public, anon;
grant  execute on function registrar_resultado_lote(uuid, resultado_lote, numeric, numeric, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Quiénes trabajaron, para la que lo cargó
--
-- Al volver a la pantalla tiene que ver lo que ya había cargado, y `lote_personas`
-- es admin-only. Mismas columnas que escribe, sin `importe_pagado`.
-- ---------------------------------------------------------------------------
create or replace function mi_lote_personas(p_lote_id uuid)
returns table (persona_id uuid, nombre text, horas numeric)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select lp.persona_id, pe.nombre_completo, lp.horas
  from lote_personas lp
  join personas pe on pe.id = lp.persona_id
  where lp.lote_id = p_lote_id
    and (es_admin() or exists (
      select 1 from lotes l join personas r on r.id = l.responsable_persona_id
      where l.id = p_lote_id and r.perfil_id = auth.uid()
    ))
  order by pe.nombre_completo;
$$;

revoke execute on function mi_lote_personas(uuid) from public, anon;
grant  execute on function mi_lote_personas(uuid) to authenticated;
