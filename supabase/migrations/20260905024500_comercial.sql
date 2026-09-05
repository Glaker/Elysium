-- =============================================================================
-- Elysium — 04. Ventas, cobranza y gastos
--
-- Los dos flujos de §2 conviven en una tabla con discriminador explícito, no
-- colapsados en columnas distintas como en el Excel.
--
-- DECISIÓN: no hay tabla de deudas. Una deuda no es un hecho que alguien
-- registra: es lo que queda de restarle a una venta lo que se le imputó.
-- Guardarla sería el mismo error que §14.1 prohíbe para el stock. Son vistas.
--
-- DECISIÓN: una venta cobrada en el acto se registra igual como venta + pago
-- del mismo día. No hay flag de "pagado": el saldo siempre sale de los hechos.
-- =============================================================================

create type tipo_venta      as enum ('directa', 'entrega_reventa');
create type estado_venta    as enum ('borrador', 'confirmada', 'anulada');
create type origen_importe  as enum ('precio_venta', 'costo', 'manual');
create type tipo_gasto      as enum
  ('materia_prima', 'envases', 'etiquetas', 'regalias', 'mano_de_obra',
   'libreria', 'publicidad', 'otros');

create table cuentas (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null unique,
  alias_transferencia text,
  activo              boolean not null default true,
  creado_en           timestamptz not null default now()
);
comment on column cuentas.alias_transferencia is 'Hoy anotados sueltos en el Excel (§8): autino.jo, bnluisperego, m.perego.mp, Elysium3.';

-- ------------------------------------------------------------------- ventas
create table ventas (
  id                     uuid primary key default gen_random_uuid(),
  tipo                   tipo_venta not null,
  fecha                  date not null default current_date,
  persona_id             uuid references personas (id) on delete restrict,
  a_nombre_de_persona_id uuid references personas (id) on delete set null,
  registrada_por         uuid references perfiles (id),
  cuenta_id              uuid references cuentas (id) on delete set null,
  forma_pago             text,
  comprobante_url        text,
  ubicacion_id           uuid references ubicaciones (id) on delete set null,
  estado                 estado_venta not null default 'borrador',
  notas                  text,
  confirmada_en          timestamptz,
  creado_en              timestamptz not null default now()
);
comment on column ventas.persona_id is 'Comprador. Anulable: §7 pide poder cargar una venta sin nombre.';
comment on column ventas.a_nombre_de_persona_id is 'Para cargar una venta a nombre de otro (§7).';
create index on ventas (persona_id);
create index on ventas (fecha);

create table venta_lineas (
  id                uuid primary key default gen_random_uuid(),
  venta_id          uuid not null references ventas (id) on delete cascade,
  tamano_id         uuid not null references tamanos (id) on delete restrict,
  cantidad          numeric not null check (cantidad > 0),
  importe_unitario  numeric check (importe_unitario >= 0),
  origen_importe    origen_importe,
  importe_total     numeric generated always as (cantidad * importe_unitario) stored,
  unique (venta_id, tamano_id)
);
comment on column venta_lineas.importe_unitario is
  'CONGELADO al confirmar. En venta directa es el precio de venta vigente; en entrega para reventa, el costo c/etiqueta resuelto en ese momento. A partir de ahí es un importe, no un costo: por eso el deudor puede verlo sin que se le abran los costos.';

-- Los movimientos de producto ahora pueden originarse en una venta.
alter table movimientos_producto
  add column venta_id uuid references ventas (id) on delete restrict;

-- ------------------------------------------------------------------ cobranza
create table pagos (
  id              uuid primary key default gen_random_uuid(),
  persona_id      uuid not null references personas (id) on delete restrict,
  fecha           date not null default current_date,
  monto           numeric not null check (monto > 0),
  cuenta_id       uuid references cuentas (id) on delete set null,
  forma_pago      text,
  comprobante_url text,
  notas           text,
  registrado_por  uuid references perfiles (id),
  creado_en       timestamptz not null default now()
);
create index on pagos (persona_id, fecha);

create table pago_imputaciones (
  id        uuid primary key default gen_random_uuid(),
  pago_id   uuid not null references pagos (id) on delete cascade,
  venta_id  uuid not null references ventas (id) on delete restrict,
  monto     numeric not null check (monto > 0),
  creado_en timestamptz not null default now(),
  unique (pago_id, venta_id)
);
comment on table pago_imputaciones is 'El resultado del FIFO queda GUARDADO como filas, no recalculado: así es auditable a qué venta se aplicó cada peso, y se puede corregir a mano.';

-- -------------------------------------------------------------------- gastos
create table gastos (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  tipo           tipo_gasto not null,
  insumo_id      uuid references insumos (id) on delete set null,
  descripcion    text,
  cantidad       numeric check (cantidad > 0),
  costo_unitario numeric check (costo_unitario >= 0),
  total          numeric not null check (total >= 0),
  proveedor_id   uuid references proveedores (id) on delete set null,
  forma_pago     text,
  cuenta_id      uuid references cuentas (id) on delete set null,
  comentario     text,
  creado_por     uuid references perfiles (id),
  creado_en      timestamptz not null default now()
);
comment on column gastos.cantidad is 'En unidad chica del insumo (g/ml/unidad), misma convención que fórmulas, composición y movimientos.';
create index on gastos (fecha);
create index on gastos (tipo);

-- Comprar un insumo y darlo de alta en stock son el mismo hecho: se registra
-- una vez. NO pisa el precio de lista: una compra puntual puede ser a precio
-- atípico, y actualizar la lista en silencio rompería el costo de todo.
create or replace function gasto_a_stock()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.insumo_id is not null and new.cantidad is not null and new.cantidad > 0 then
    insert into movimientos_insumo (insumo_id, cantidad, tipo, fecha, motivo)
    values (new.insumo_id, new.cantidad, 'compra', new.fecha,
            coalesce(new.descripcion, 'Compra registrada como gasto'));
  end if;
  return new;
end;
$$;

create trigger gasto_genera_entrada_stock
  after insert on gastos
  for each row execute function gasto_a_stock();

-- =============================================================================
-- Funciones
-- =============================================================================

-- Confirmar una venta congela el importe de cada línea y saca el stock.
create or replace function confirmar_venta(
  p_venta_id     uuid,
  p_ubicacion_id uuid default null
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_v      ventas%rowtype;
  v_ubic   uuid;
  v_imp    numeric;
  v_origen origen_importe;
  v_costo  record;
  r        record;
begin
  select * into v_v from ventas where id = p_venta_id for update;
  if not found then raise exception 'venta inexistente: %', p_venta_id; end if;
  if v_v.estado <> 'borrador' then raise exception 'la venta % no está en borrador', p_venta_id; end if;

  v_ubic := coalesce(p_ubicacion_id, v_v.ubicacion_id, ubicacion_default());
  if v_ubic is null then raise exception 'no hay ubicación de salida'; end if;

  for r in select * from venta_lineas where venta_id = p_venta_id loop
    v_imp    := r.importe_unitario;
    v_origen := r.origen_importe;

    if v_imp is null then
      if v_v.tipo = 'directa' then
        select precio into v_imp from tamano_precios
        where tamano_id = r.tamano_id and vigente_desde <= v_v.fecha
        order by vigente_desde desc, creado_en desc limit 1;
        if v_imp is null then
          raise exception 'el tamaño % no tiene precio de venta vigente al %', r.tamano_id, v_v.fecha;
        end if;
        v_origen := 'precio_venta';
      else
        select * into v_costo from costo_tamano(r.tamano_id, v_v.fecha);
        if not v_costo.completo then
          raise exception 'no se puede resolver el costo del tamaño %: %',
            r.tamano_id, array_to_string(v_costo.faltantes, ', ');
        end if;
        v_imp    := v_costo.costo_con_etiqueta;
        v_origen := 'costo';
      end if;

      update venta_lineas
         set importe_unitario = v_imp, origen_importe = v_origen
       where id = r.id;
    end if;

    insert into movimientos_producto
      (tamano_id, ubicacion_id, cantidad, tipo, fecha, venta_id, motivo)
    values (r.tamano_id, v_ubic, -r.cantidad,
            case when v_v.tipo = 'directa' then 'venta' else 'entrega' end::tipo_mov_producto,
            v_v.fecha, p_venta_id, 'Venta ' || p_venta_id::text);
  end loop;

  update ventas set estado = 'confirmada', confirmada_en = now(), ubicacion_id = v_ubic
  where id = p_venta_id;
end;
$$;

-- Imputación FIFO (§7, pedido textual): de la deuda más vieja a la más nueva.
-- Lo que sobra queda SIN imputar. No inventa una venta.
create or replace function imputar_pago_fifo(p_pago_id uuid)
returns numeric   -- devuelve el sobrante sin imputar
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_p         pagos%rowtype;
  v_restante  numeric;
  v_saldo     numeric;
  v_aplica    numeric;
  r           record;
begin
  select * into v_p from pagos where id = p_pago_id for update;
  if not found then raise exception 'pago inexistente: %', p_pago_id; end if;

  select v_p.monto - coalesce(sum(monto), 0) into v_restante
  from pago_imputaciones where pago_id = p_pago_id;

  for r in
    select v.id, v.fecha,
           coalesce(sum(vl.importe_total), 0) as total,
           coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.venta_id = v.id), 0) as imputado
    from ventas v
    join venta_lineas vl on vl.venta_id = v.id
    where v.estado = 'confirmada'
      and coalesce(v.persona_id, v.a_nombre_de_persona_id) = v_p.persona_id
    group by v.id, v.fecha
    having coalesce(sum(vl.importe_total), 0)
         - coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.venta_id = v.id), 0) > 0
    order by v.fecha asc, v.creado_en asc
  loop
    exit when v_restante <= 0;
    v_saldo  := r.total - r.imputado;
    v_aplica := least(v_restante, v_saldo);

    insert into pago_imputaciones (pago_id, venta_id, monto)
    values (p_pago_id, r.id, v_aplica)
    on conflict (pago_id, venta_id) do update set monto = pago_imputaciones.monto + excluded.monto;

    v_restante := v_restante - v_aplica;
  end loop;

  return v_restante;
end;
$$;

-- =============================================================================
-- Vistas de deuda — derivadas, nunca almacenadas
-- =============================================================================

create view v_deuda_venta with (security_invoker = true) as
select
  v.id as venta_id,
  v.fecha,
  v.tipo,
  coalesce(v.persona_id, v.a_nombre_de_persona_id) as persona_id,
  coalesce(sum(vl.importe_total), 0) as total,
  coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.venta_id = v.id), 0) as pagado,
  coalesce(sum(vl.importe_total), 0)
    - coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.venta_id = v.id), 0) as saldo
from ventas v
left join venta_lineas vl on vl.venta_id = v.id
where v.estado = 'confirmada'
group by v.id, v.fecha, v.tipo, v.persona_id, v.a_nombre_de_persona_id;

create view v_deuda_persona with (security_invoker = true) as
select
  d.persona_id,
  p.nombre,
  count(*) filter (where d.saldo > 0) as ventas_impagas,
  sum(d.saldo) as deuda_total,
  min(d.fecha) filter (where d.saldo > 0) as deuda_mas_vieja
from v_deuda_venta d
join personas p on p.id = d.persona_id
group by d.persona_id, p.nombre;

create view v_pago_sobrante with (security_invoker = true) as
select p.id as pago_id, p.persona_id, p.fecha, p.monto,
       coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.pago_id = p.id), 0) as imputado,
       p.monto - coalesce((select sum(pi.monto) from pago_imputaciones pi where pi.pago_id = p.id), 0) as sobrante
from pagos p;

-- =============================================================================
-- RLS
-- Admin ve todo. Un usuario normal ve SUS ventas, SUS líneas y SUS pagos:
-- ver lo que debe es uno de los dos motivos por los que existe la cuenta (§10).
-- =============================================================================
alter table cuentas           enable row level security;
alter table ventas            enable row level security;
alter table venta_lineas      enable row level security;
alter table pagos             enable row level security;
alter table pago_imputaciones enable row level security;
alter table gastos            enable row level security;

create policy cuentas_admin on cuentas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy gastos_admin on gastos for all to authenticated
  using (es_admin()) with check (es_admin());

create policy ventas_admin on ventas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy ventas_propias on ventas for select to authenticated
  using (exists (
    select 1 from personas pe
    where pe.perfil_id = auth.uid()
      and pe.id in (ventas.persona_id, ventas.a_nombre_de_persona_id)
  ));

create policy venta_lineas_admin on venta_lineas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy venta_lineas_propias on venta_lineas for select to authenticated
  using (exists (
    select 1 from ventas v join personas pe on pe.id in (v.persona_id, v.a_nombre_de_persona_id)
    where v.id = venta_lineas.venta_id and pe.perfil_id = auth.uid()
  ));

create policy pagos_admin on pagos for all to authenticated
  using (es_admin()) with check (es_admin());
create policy pagos_propios on pagos for select to authenticated
  using (exists (select 1 from personas pe where pe.id = pagos.persona_id and pe.perfil_id = auth.uid()));

create policy imputaciones_admin on pago_imputaciones for all to authenticated
  using (es_admin()) with check (es_admin());
create policy imputaciones_propias on pago_imputaciones for select to authenticated
  using (exists (
    select 1 from pagos pg join personas pe on pe.id = pg.persona_id
    where pg.id = pago_imputaciones.pago_id and pe.perfil_id = auth.uid()
  ));

insert into cuentas (nombre, alias_transferencia) values
  ('Silvia', null), ('Johanna', 'autino.jo'), ('Martin', 'm.perego.mp'), ('Luis', 'bnluisperego');
