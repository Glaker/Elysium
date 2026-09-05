-- =============================================================================
-- Elysium — 08. Roles de persona acumulables + merma en la calculadora
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. personas: de un tipo excluyente a atributos acumulables
--
-- `tipo` era un enum de valor único (cliente|revendedor|productor). §10 describe
-- justamente el caso que eso no admite: estudiantes que fabrican lotes Y le
-- compran productos a Johanna para revender. Con un valor único esa persona hay
-- que duplicarla, y entonces su deuda queda partida en dos fichas.
--
-- ELECCIÓN: dos booleanos, no un array de enum ni una tabla de roles.
--   * Son dos hechos ortogonales, estables y conocidos de antemano; no es una
--     lista que Johanna vaya a administrar. Una tabla de roles normaliza algo
--     que no varía y mete un join en el camino caliente (la resolución de precio
--     corre por cada fila del catálogo, en cada carga de la app).
--   * Un array de enum obliga a GIN y a operadores de contención para preguntas
--     que con un booleano son `where es_revendedor`.
--   * "cliente" desaparece como valor porque no es un rol: es el estado por
--     defecto de cualquiera. Ninguno de los dos booleanos en true = cliente.
--   * Si algún día los roles se vuelven dinámicos, la migración a tabla es
--     mecánica y no toca a quién le apunta nada.
-- -----------------------------------------------------------------------------

alter table personas
  add column es_revendedor boolean not null default false,
  add column es_productor  boolean not null default false;

update personas set
  es_revendedor = (tipo = 'revendedor'),
  es_productor  = (tipo = 'productor');

comment on column personas.es_revendedor is
  'Se lleva productos para revender y paga el costo (§2). Acumulable con es_productor.';
comment on column personas.es_productor is
  'Fabrica lotes (§10). Acumulable con es_revendedor: el mismo estudiante puede hacer las dos cosas.';

create index on personas (es_revendedor) where es_revendedor;
create index on personas (es_productor)  where es_productor;

alter table personas drop column tipo;
drop type tipo_persona;

-- -----------------------------------------------------------------------------
-- 2. Precedencia de precio
--
-- REGLA: si es_revendedor, el catálogo le muestra el costo. Si no, el precio de
-- venta. Ser productor no influye en el precio.
--
-- Por qué el revendedor gana cuando alguien es las dos cosas: el vínculo de
-- reventa es el que define las condiciones comerciales (§2), y mostrar el número
-- más favorable es el comportamiento seguro — si además compra para sí, Johanna
-- le cobra la diferencia al cargar la venta.
--
-- El precio del catálogo es INDICATIVO. El importe que obliga se congela en la
-- línea de venta según `ventas.tipo` (directa vs. entrega_reventa), que Johanna
-- elige por transacción. O sea: la ambigüedad de una persona con dos roles se
-- resuelve donde corresponde, en el hecho, no en la ficha de la persona.
-- -----------------------------------------------------------------------------

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
  select coalesce(bool_or(pe.es_revendedor), false) into v_paga_costo
  from personas pe where pe.perfil_id = auth.uid();

  return query
  select t.id, p.nombre, t.nombre, t.magnitud, t.unidad,
         case when v_paga_costo then c.costo_con_etiqueta else pv.precio end,
         case when v_paga_costo then 'costo' else 'precio_venta' end,
         case when v_paga_costo then c.completo else pv.precio is not null end
  from tamanos t
  join productos p on p.id = t.producto_id
  left join lateral (
    select tp.precio from tamano_precios tp
    where tp.tamano_id = t.id and tp.variante = 'elysium' and tp.vigente_desde <= current_date
    order by tp.vigente_desde desc, tp.creado_en desc limit 1
  ) pv on true
  left join lateral (select * from costo_tamano(t.id, current_date, null, 'elysium')) c on true
  where t.activo and p.activo
  order by p.nombre, t.magnitud;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. calcular_insumos: la cantidad que el productor pide incluye la merma
--
-- La calculadora existe para saber CUÁNTO PEDIR. Devolver la cantidad de fórmula
-- pura hacía que, con un 5% de pérdida, no alcanzara para terminar el lote.
-- Ahora devuelve las tres columnas y `cantidad_necesaria` — la que se usa para
-- pedir — ya trae la merma aplicada.
--
-- La merma va solo sobre materia prima, igual que en costo_tamano() y en
-- cerrar_lote(). Un envase no se evapora.
-- -----------------------------------------------------------------------------

drop function if exists calcular_insumos(uuid, numeric, variante_producto);

create or replace function calcular_insumos(
  p_tamano_id uuid,
  p_unidades  numeric,
  p_variante  variante_producto default 'elysium',
  p_merma_pct numeric default null
)
returns table (
  insumo             text,
  unidad             unidad_insumo,
  cantidad_formula   numeric,
  merma              numeric,
  cantidad_necesaria numeric,
  lleva_merma        boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with m as (
    select coalesce(p_merma_pct, parametro_valor('merma_pct', current_date), 0) as pct
  ),
  base as (
    select i.nombre,
           i.unidad as un,
           i.tipo = 'materia_prima' as es_mp,
           (case fl.modo when 'porcentaje' then fl.porcentaje / 100.0 * t.magnitud
                         else fl.cantidad_fija end) * p_unidades as cant
    from formula_lineas fl
    join insumos i on i.id = fl.insumo_id
    join tamanos t on t.id = fl.tamano_id
    where fl.tamano_id = p_tamano_id
      and (fl.aplica_a = 'ambas'
        or (fl.aplica_a = 'solo_elysium'      and p_variante = 'elysium')
        or (fl.aplica_a = 'solo_marca_blanca' and p_variante = 'marca_blanca'))
  )
  select b.nombre,
         b.un,
         b.cant,
         case when b.es_mp then b.cant * m.pct / 100.0 else 0 end,
         b.cant + case when b.es_mp then b.cant * m.pct / 100.0 else 0 end,
         b.es_mp
  from base b cross join m
  order by b.nombre;
$$;

revoke execute on function calcular_insumos(uuid, numeric, variante_producto, numeric) from public, anon;
grant  execute on function calcular_insumos(uuid, numeric, variante_producto, numeric) to authenticated;
