-- =============================================================================
-- Elysium — 01. Núcleo de costo
--
-- Identidad mínima, parámetros configurables, catálogo de insumos con historial
-- de precios, productos/tamaños/fórmulas, y el cálculo de costo recursivo.
--
-- Convención de unidades (importante):
--   El precio de un insumo se carga en su unidad de compra (kg, l, unidad),
--   pero TODAS las cantidades de fórmula y composición se expresan en la unidad
--   chica: g para insumos por kg, ml para insumos por l, unidad para unitarios.
--   `costo_insumo()` devuelve el costo por unidad chica, así que el ÷1000 de
--   §3.1 de CONTEXT.md ocurre una sola vez y en un solo lugar.
-- =============================================================================

-- ---------------------------------------------------------------- enumerados
create type rol_usuario       as enum ('admin', 'usuario');
create type unidad_insumo      as enum ('kg', 'l', 'unidad');
create type tipo_insumo        as enum ('materia_prima', 'envase', 'etiqueta', 'packaging', 'otro');
create type origen_insumo      as enum ('comprado', 'producido');
create type moneda             as enum ('ARS', 'USD');
create type unidad_tamano      as enum ('g', 'ml');
create type modo_composicion   as enum ('porcentaje', 'cantidad_fija');

-- Resultado de un cálculo de costo que puede estar incompleto.
-- `costo` nulo NO es cero: es "no se sabe". `faltantes` dice por qué.
create type resultado_costo as (
  costo     numeric,
  completo  boolean,
  faltantes text[]
);

-- ------------------------------------------------------------- identidad
create table perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text,
  rol       rol_usuario not null default 'usuario',
  activo    boolean     not null default true,
  creado_en timestamptz not null default now()
);
comment on table perfiles is 'Una fila por cuenta de la app. El RLS lee el rol de acá.';

-- Con quién hace negocio Elysium. Puede no tener cuenta nunca.
create table personas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  perfil_id uuid unique references perfiles (id) on delete set null,
  contacto  text,
  notas     text,
  activo    boolean     not null default true,
  creado_en timestamptz not null default now()
);
comment on table personas is 'Clientes, deudores, revendedores y productores. El perfil es opcional: una deuda existe aunque la persona nunca se registre.';

create table invitaciones (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  rol        rol_usuario not null default 'usuario',
  token      text unique not null,
  persona_id uuid references personas (id) on delete set null,
  creada_por uuid references perfiles (id),
  creada_en  timestamptz not null default now(),
  expira_en  timestamptz,
  usada_en   timestamptz
);

-- ------------------------------------------------------------ parámetros
create table parametros (
  clave       text primary key,
  descripcion text not null,
  unidad      text
);

create table parametro_valores (
  id             uuid primary key default gen_random_uuid(),
  parametro      text not null references parametros (clave) on delete cascade,
  valor          numeric not null,
  vigente_desde  date not null default current_date,
  creado_por     uuid references perfiles (id),
  creado_en      timestamptz not null default now(),
  unique (parametro, vigente_desde)
);
comment on table parametro_valores is 'Historial de cada parámetro. El valor de hoy es la fila más reciente; el del 12/03 es la vigente ese día.';

-- --------------------------------------------------------------- insumos
create table proveedores (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  link      text,
  contacto  text,
  notas     text,
  activo    boolean     not null default true,
  creado_en timestamptz not null default now()
);

create table insumos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  unidad          unidad_insumo not null,
  tipo            tipo_insumo   not null default 'materia_prima',
  origen          origen_insumo not null default 'comprado',
  proveedor_id    uuid references proveedores (id) on delete set null,
  link            text,
  rinde_cantidad  numeric,
  notas           text,
  activo          boolean     not null default true,
  creado_en       timestamptz not null default now(),

  -- El rinde solo tiene sentido en una MP intermedia (§4).
  constraint rinde_solo_si_producido
    check (origen = 'producido' or rinde_cantidad is null),
  constraint rinde_positivo
    check (rinde_cantidad is null or rinde_cantidad > 0)
);
comment on column insumos.origen is 'comprado = se compra. producido = MP intermedia que fabrica Elysium (§4), reemplaza el proveedor "PRODUCCIÓN CIAB".';
comment on column insumos.rinde_cantidad is 'Cuánto sale de una tanda, en unidad chica (g/ml/unidad). Solo para origen=producido.';

create table insumo_precios (
  id            uuid primary key default gen_random_uuid(),
  insumo_id     uuid not null references insumos (id) on delete cascade,
  precio        numeric not null check (precio >= 0),
  moneda        moneda  not null default 'ARS',
  vigente_desde date    not null default current_date,
  verificado_en date    not null default current_date,
  fuente        text,
  creado_por    uuid references perfiles (id),
  creado_en     timestamptz not null default now(),
  unique (insumo_id, vigente_desde)
);
comment on table insumo_precios is 'Historial de precios. Un insumo SIN precio no tiene fila (no tiene precio 0): esa es la diferencia entre "no sé" y "sale nada" (§4). Cada fila es también un evento de verificación (§5).';

create index on insumo_precios (insumo_id, vigente_desde desc);

-- -------------------------------------------------------------- productos
create table lineas_negocio (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

create table productos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null unique,
  linea_negocio_id  uuid references lineas_negocio (id) on delete set null,
  margen_pct        numeric,
  descripcion       text,
  activo            boolean     not null default true,
  creado_en         timestamptz not null default now()
);
comment on column productos.margen_pct is 'Margen propio que pisa el parámetro global margen_pct. Nulo = usa el global.';

create table tamanos (
  id                       uuid primary key default gen_random_uuid(),
  producto_id              uuid not null references productos (id) on delete cascade,
  nombre                   text,
  magnitud                 numeric not null check (magnitud > 0),
  unidad                   unidad_tamano not null,
  productividad_unid_hora  numeric check (productividad_unid_hora > 0),
  activo                   boolean     not null default true,
  creado_en                timestamptz not null default now(),
  unique (producto_id, magnitud, unidad)
);
comment on table tamanos is 'La unidad real del sistema: lo que se stockea, se vende y tiene precio. Movimientos y líneas de venta apuntan acá, nunca a productos.';
comment on column tamanos.productividad_unid_hora is 'Unidades por hora (§3.2). Hoy en el Excel es texto suelto al costado de la hoja. Dato de admin: es tiempo de producción (§10).';

create table tamano_precios (
  id            uuid primary key default gen_random_uuid(),
  tamano_id     uuid not null references tamanos (id) on delete cascade,
  precio        numeric not null check (precio >= 0),
  vigente_desde date not null default current_date,
  creado_por    uuid references perfiles (id),
  creado_en     timestamptz not null default now(),
  unique (tamano_id, vigente_desde)
);
comment on table tamano_precios is 'Precio de venta con historial (§7.1 punto 2). El precio recomendado NO se guarda: se calcula.';

-- ------------------------------------------------------------ composición
create table formula_lineas (
  id            uuid primary key default gen_random_uuid(),
  tamano_id     uuid not null references tamanos (id) on delete cascade,
  insumo_id     uuid not null references insumos (id) on delete restrict,
  modo          modo_composicion not null default 'porcentaje',
  porcentaje    numeric,
  cantidad_fija numeric,
  orden         integer,
  notas         text,
  unique (tamano_id, insumo_id),

  constraint modo_coherente check (
    (modo = 'porcentaje'    and porcentaje    is not null and porcentaje    > 0 and cantidad_fija is null) or
    (modo = 'cantidad_fija' and cantidad_fija is not null and cantidad_fija > 0 and porcentaje    is null)
  )
);
comment on table formula_lineas is 'Receta de un tamaño. Los porcentajes NO tienen que sumar 100: §3.1 documenta el Shampoo Café al 101% y dice que no es error de tipeo. La app avisa, la base no impide.';
comment on column formula_lineas.cantidad_fija is 'Para insumos que no son un porcentaje del contenido: 1 etiqueta, 1 envase.';

create table insumo_composicion (
  id                    uuid primary key default gen_random_uuid(),
  insumo_producido_id   uuid not null references insumos (id) on delete cascade,
  insumo_componente_id  uuid not null references insumos (id) on delete restrict,
  cantidad              numeric not null check (cantidad > 0),
  notas                 text,
  unique (insumo_producido_id, insumo_componente_id),
  constraint no_autoreferencia check (insumo_producido_id <> insumo_componente_id)
);
comment on table insumo_composicion is 'Receta de una MP intermedia (§4). Acá vive la recursión: se recorre hasta llegar a insumos comprados.';

-- =============================================================================
-- Funciones
-- =============================================================================

create or replace function es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol = 'admin' and activo
  );
$$;
comment on function es_admin is 'SECURITY DEFINER a propósito: corre como owner y así no dispara el RLS de perfiles sobre sí mismo.';

-- Cuántas unidades chicas entran en la unidad de compra.
create or replace function factor_unidad(p_unidad unidad_insumo)
returns numeric
language sql
immutable
as $$
  select case when p_unidad in ('kg', 'l') then 1000 else 1 end::numeric;
$$;

create or replace function parametro_valor(p_clave text, p_fecha date default current_date)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select valor
  from parametro_valores
  where parametro = p_clave and vigente_desde <= p_fecha
  order by vigente_desde desc, creado_en desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- costo_insumo: costo por unidad chica (g / ml / unidad).
-- Recursiva para MP intermedias. Nunca asume cero: si falta un precio devuelve
-- costo nulo + la lista de qué falta. Corta ciclos con el camino recorrido.
-- ---------------------------------------------------------------------------
create or replace function costo_insumo(
  p_insumo_id uuid,
  p_fecha     date default current_date,
  p_path      uuid[] default '{}'
)
returns resultado_costo
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_ins       insumos%rowtype;
  v_res       resultado_costo;
  v_hijo      resultado_costo;
  v_precio    numeric;
  v_moneda    moneda;
  v_tc        numeric;
  v_total     numeric := 0;
  v_faltantes text[]  := '{}';
  v_completo  boolean := true;
  r           record;
begin
  v_res := (null, false, '{}')::resultado_costo;

  -- Guarda de ciclos: el grafo es recursivo y nada impide A→B→A.
  if p_insumo_id = any (p_path) then
    select nombre into v_ins.nombre from insumos where id = p_insumo_id;
    v_res.faltantes := array['CICLO en la composición: ' || coalesce(v_ins.nombre, p_insumo_id::text)];
    return v_res;
  end if;

  select * into v_ins from insumos where id = p_insumo_id;
  if not found then
    v_res.faltantes := array['insumo inexistente: ' || p_insumo_id::text];
    return v_res;
  end if;

  -- Caso base: insumo comprado.
  if v_ins.origen = 'comprado' then
    select precio, moneda into v_precio, v_moneda
    from insumo_precios
    where insumo_id = p_insumo_id and vigente_desde <= p_fecha
    order by vigente_desde desc, creado_en desc
    limit 1;

    if v_precio is null then
      v_res.faltantes := array[v_ins.nombre || ' (sin precio)'];
      return v_res;
    end if;

    if v_moneda = 'USD' then
      v_tc := parametro_valor('tipo_cambio_usd', p_fecha);
      if v_tc is null then
        v_res.faltantes := array['tipo_cambio_usd (sin valor, lo necesita ' || v_ins.nombre || ')'];
        return v_res;
      end if;
      v_precio := v_precio * v_tc;
    end if;

    v_res.costo    := v_precio / factor_unidad(v_ins.unidad);
    v_res.completo := true;
    return v_res;
  end if;

  -- Caso recursivo: MP intermedia.
  if v_ins.rinde_cantidad is null then
    v_res.faltantes := array[v_ins.nombre || ' (sin rinde declarado)'];
    return v_res;
  end if;

  if not exists (select 1 from insumo_composicion where insumo_producido_id = p_insumo_id) then
    v_res.faltantes := array[v_ins.nombre || ' (sin composición cargada)'];
    return v_res;
  end if;

  for r in
    select * from insumo_composicion where insumo_producido_id = p_insumo_id
  loop
    v_hijo := costo_insumo(r.insumo_componente_id, p_fecha, p_path || p_insumo_id);
    if v_hijo.completo then
      v_total := v_total + r.cantidad * v_hijo.costo;
    else
      v_completo  := false;
      v_faltantes := v_faltantes || v_hijo.faltantes;
    end if;
  end loop;

  if not v_completo then
    v_res.faltantes := v_faltantes;
    return v_res;
  end if;

  v_res.costo    := v_total / v_ins.rinde_cantidad;
  v_res.completo := true;
  return v_res;
end;
$$;

-- ---------------------------------------------------------------------------
-- costo_tamano: el desglose de §3.1 + §3.2, con la merma ESPERADA incluida.
--
-- p_merma_pct nulo => toma el parámetro `merma_pct`.
--
-- Por qué el default es el parámetro y no 0: el total de §3.2 del Excel
-- ($3.596,53) no incluye merma, pero §3.3 se titula "Lo que el Excel no
-- contempla y sí debería" y pone la merma de MP como su primer ítem. Tomar ese
-- total como patrón sería validar contra una referencia que el propio documento
-- marca como incompleta, y dejaría precio_recomendado() calculado sobre un
-- costo que ignora un 5% de pérdida conocida.
--
-- Son dos números distintos y los dos hacen falta:
--   * costo teórico, para pricing -> merma ESPERADA (este parámetro)
--   * costo real de un lote       -> merma EFECTIVA, medida contra el consumo
--                                    real al cerrar el lote (migración 02)
--
-- El test de paridad con el Excel pasa p_merma_pct => 0 explícitamente, y ese
-- es el único caso en que debería pasarse.
-- ---------------------------------------------------------------------------
create or replace function costo_tamano(
  p_tamano_id uuid,
  p_fecha     date    default current_date,
  p_merma_pct numeric default null
)
returns table (
  costo_materias_primas numeric,
  costo_merma           numeric,
  costo_envases         numeric,
  costo_etiquetas       numeric,
  costo_otros           numeric,
  costo_mano_obra       numeric,
  costo_regalias        numeric,
  costo_energia         numeric,
  costo_sin_etiqueta    numeric,
  costo_con_etiqueta    numeric,
  completo              boolean,
  faltantes             text[]
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_t          tamanos%rowtype;
  v_hijo       resultado_costo;
  v_cant       numeric;
  v_linea      numeric;
  v_mp         numeric := 0;
  v_envases    numeric := 0;
  v_etiquetas  numeric := 0;
  v_otros      numeric := 0;
  v_merma      numeric := 0;
  v_mo         numeric := 0;
  v_regalias   numeric := 0;
  v_energia    numeric := 0;
  v_valor_hora numeric;
  v_merma_pct  numeric;
  v_completo   boolean := true;
  v_faltantes  text[]  := '{}';
  r            record;
begin
  select * into v_t from tamanos where id = p_tamano_id;
  if not found then
    return query select null::numeric, null::numeric, null::numeric, null::numeric,
                        null::numeric, null::numeric, null::numeric, null::numeric,
                        null::numeric, null::numeric, false,
                        array['tamaño inexistente: ' || p_tamano_id::text];
    return;
  end if;

  for r in
    select fl.modo, fl.porcentaje, fl.cantidad_fija, i.id as insumo_id, i.tipo
    from formula_lineas fl
    join insumos i on i.id = fl.insumo_id
    where fl.tamano_id = p_tamano_id
  loop
    -- §3.1: cantidad_uso = porcentaje × tamaño
    v_cant := case r.modo
                when 'porcentaje' then r.porcentaje / 100.0 * v_t.magnitud
                else r.cantidad_fija
              end;

    v_hijo := costo_insumo(r.insumo_id, p_fecha);

    if not v_hijo.completo then
      v_completo  := false;
      v_faltantes := v_faltantes || v_hijo.faltantes;
      continue;
    end if;

    v_linea := v_cant * v_hijo.costo;

    case r.tipo
      when 'materia_prima' then v_mp        := v_mp        + v_linea;
      when 'envase'        then v_envases   := v_envases   + v_linea;
      when 'etiqueta'      then v_etiquetas := v_etiquetas + v_linea;
      else                      v_otros     := v_otros     + v_linea;
    end case;
  end loop;

  -- Merma esperada, solo sobre materia prima. Si no se pasa explícitamente sale
  -- del parámetro. Un parámetro sin valor es un faltante, no un cero: misma
  -- regla que un precio sin cargar.
  v_merma_pct := p_merma_pct;
  if v_merma_pct is null then
    v_merma_pct := parametro_valor('merma_pct', p_fecha);
  end if;

  if v_merma_pct is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['merma_pct (parámetro sin valor)'];
  else
    v_merma := v_mp * v_merma_pct / 100.0;
  end if;

  -- §3.2: hora de trabajo = valor_hora ÷ unidades por hora
  v_valor_hora := parametro_valor('valor_hora', p_fecha);
  if v_valor_hora is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['valor_hora (parámetro sin valor)'];
  elsif v_t.productividad_unid_hora is null then
    v_completo  := false;
    v_faltantes := v_faltantes || array['productividad_unid_hora (sin cargar en el tamaño)'];
  else
    v_mo := v_valor_hora / v_t.productividad_unid_hora;
  end if;

  v_regalias := coalesce(parametro_valor('regalias_por_unidad', p_fecha), 0);
  -- §3.2/§3.3: la fila de energía existe pero siempre está vacía. 0 explícito.
  v_energia  := coalesce(parametro_valor('costo_energia_por_unidad', p_fecha), 0);

  if not v_completo then
    return query select null::numeric, null::numeric, null::numeric, null::numeric,
                        null::numeric, null::numeric, null::numeric, null::numeric,
                        null::numeric, null::numeric, false, v_faltantes;
    return;
  end if;

  return query select
    v_mp,
    v_merma,
    v_envases,
    v_etiquetas,
    v_otros,
    v_mo,
    v_regalias,
    v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia + v_etiquetas,
    true,
    '{}'::text[];
end;
$$;

-- Precio recomendado (§7.1 punto 1). Se calcula siempre, no se guarda.
create or replace function precio_recomendado(
  p_tamano_id uuid,
  p_fecha     date default current_date
)
returns resultado_costo
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_c      record;
  v_margen numeric;
  v_res    resultado_costo;
begin
  v_res := (null, false, '{}')::resultado_costo;

  select * into v_c from costo_tamano(p_tamano_id, p_fecha);
  if not v_c.completo then
    v_res.faltantes := v_c.faltantes;
    return v_res;
  end if;

  select coalesce(p.margen_pct, parametro_valor('margen_pct', p_fecha))
    into v_margen
  from tamanos t join productos p on p.id = t.producto_id
  where t.id = p_tamano_id;

  if v_margen is null then
    v_res.faltantes := array['margen_pct (sin valor global ni del producto)'];
    return v_res;
  end if;

  v_res.costo    := v_c.costo_con_etiqueta * (1 + v_margen / 100.0);
  v_res.completo := true;
  return v_res;
end;
$$;

-- =============================================================================
-- Vistas
-- =============================================================================

-- Fórmulas que no suman 100% (§3.1: se avisa, no se impide).
create view v_formula_control with (security_invoker = true) as
select
  t.id                                as tamano_id,
  p.nombre                            as producto,
  t.magnitud, t.unidad,
  sum(fl.porcentaje) filter (where fl.modo = 'porcentaje') as suma_porcentaje,
  sum(fl.porcentaje) filter (where fl.modo = 'porcentaje') = 100 as cierra_100
from tamanos t
join productos p on p.id = t.producto_id
left join formula_lineas fl on fl.tamano_id = t.id
group by t.id, p.nombre, t.magnitud, t.unidad;

-- Precio vigente de cada insumo + alerta de 30 días (§5).
create view v_insumo_precio_actual with (security_invoker = true) as
select distinct on (i.id)
  i.id as insumo_id,
  i.nombre,
  i.unidad,
  i.tipo,
  i.origen,
  ip.precio,
  ip.moneda,
  ip.vigente_desde,
  ip.verificado_en,
  current_date - ip.verificado_en as dias_desde_verificacion,
  (current_date - ip.verificado_en) > 30 as alerta_desactualizado
from insumos i
left join insumo_precios ip on ip.insumo_id = i.id and ip.vigente_desde <= current_date
order by i.id, ip.vigente_desde desc, ip.creado_en desc;

-- =============================================================================
-- RLS
--
-- Se activa acá y no en una migración final a propósito: entre esta migración
-- y la última, la publishable key podría leer precios y fórmulas por PostgREST.
-- =============================================================================

alter table perfiles           enable row level security;
alter table personas           enable row level security;
alter table invitaciones       enable row level security;
alter table parametros         enable row level security;
alter table parametro_valores  enable row level security;
alter table proveedores        enable row level security;
alter table insumos            enable row level security;
alter table insumo_precios     enable row level security;
alter table lineas_negocio     enable row level security;
alter table productos          enable row level security;
alter table tamanos            enable row level security;
alter table tamano_precios     enable row level security;
alter table formula_lineas     enable row level security;
alter table insumo_composicion enable row level security;

-- Cada uno ve su perfil; el admin ve todos.
create policy perfiles_select on perfiles for select to authenticated
  using (id = auth.uid() or es_admin());
create policy perfiles_admin on perfiles for all to authenticated
  using (es_admin()) with check (es_admin());

-- Una persona ve su propia ficha (la necesita para ver su deuda).
create policy personas_select on personas for select to authenticated
  using (perfil_id = auth.uid() or es_admin());
create policy personas_admin on personas for all to authenticated
  using (es_admin()) with check (es_admin());

create policy invitaciones_admin on invitaciones for all to authenticated
  using (es_admin()) with check (es_admin());

-- Parámetros: valor hora, regalías, márgenes. Todo costo → solo admin (§10).
create policy parametros_admin on parametros for all to authenticated
  using (es_admin()) with check (es_admin());
create policy parametro_valores_admin on parametro_valores for all to authenticated
  using (es_admin()) with check (es_admin());

-- Proveedores: información comercial → solo admin.
create policy proveedores_admin on proveedores for all to authenticated
  using (es_admin()) with check (es_admin());

-- El catálogo de insumos SÍ lo ve un usuario normal: §11 le deja solicitar
-- materia prima, y para eso necesita los nombres. Los precios no.
create policy insumos_select on insumos for select to authenticated using (true);
create policy insumos_admin  on insumos for all to authenticated
  using (es_admin()) with check (es_admin());

create policy insumo_precios_admin on insumo_precios for all to authenticated
  using (es_admin()) with check (es_admin());

-- Catálogo de productos y precio de venta: visibles para todos los logueados.
-- Ver el precio es uno de los dos motivos por los que existe la cuenta (§10).
create policy lineas_negocio_select on lineas_negocio for select to authenticated using (true);
create policy lineas_negocio_admin  on lineas_negocio for all to authenticated
  using (es_admin()) with check (es_admin());

create policy productos_select on productos for select to authenticated using (true);
create policy productos_admin  on productos for all to authenticated
  using (es_admin()) with check (es_admin());

create policy tamanos_select on tamanos for select to authenticated using (true);
create policy tamanos_admin  on tamanos for all to authenticated
  using (es_admin()) with check (es_admin());

create policy tamano_precios_select on tamano_precios for select to authenticated using (true);
create policy tamano_precios_admin  on tamano_precios for all to authenticated
  using (es_admin()) with check (es_admin());

-- Fórmulas y composición: gestión de fórmulas es admin (§10).
create policy formula_lineas_admin on formula_lineas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy insumo_composicion_admin on insumo_composicion for all to authenticated
  using (es_admin()) with check (es_admin());

-- =============================================================================
-- Semilla de parámetros
-- Los valores salen de CONTEXT.md §3.2 y §5. margen_pct queda SIN valor: el
-- documento nunca lo cuantifica y no se inventa.
-- =============================================================================

insert into parametros (clave, descripcion, unidad) values
  ('valor_hora',               'Costo de una hora de trabajo (§3.2). En el Excel es =960000/160.', '$/hora'),
  ('merma_pct',                'Merma de MP por lote (§3.3). Default 5%, editable por lote.',      '%'),
  ('regalias_por_unidad',      'Cargo fijo por unidad producida que se paga a un tercero (§1).',   '$/unidad'),
  ('margen_pct',               'Margen sobre costo c/etiqueta para el precio recomendado (§7.1).', '%'),
  ('tipo_cambio_usd',          'Pesos por dólar, para insumos cotizados en USD (§5).',             '$/USD'),
  ('costo_energia_por_unidad', 'Energía por unidad (§3.2). La fila existe en el Excel, vacía.',    '$/unidad');

insert into parametro_valores (parametro, valor, vigente_desde) values
  ('valor_hora',               6000,  '2020-01-01'),
  ('merma_pct',                5,     '2020-01-01'),
  ('regalias_por_unidad',      1500,  '2020-01-01'),
  ('tipo_cambio_usd',          1530,  '2020-01-01'),
  ('costo_energia_por_unidad', 0,     '2020-01-01');
