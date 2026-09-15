-- =============================================================================
-- Elysium — 15. La materia prima es de las productoras
--
-- Hasta acá, cualquier cuenta podía pedir materia prima y, sobre todo, leer las
-- cantidades de la fórmula: `calcular_insumos` estaba otorgada a todo usuario
-- autenticado. Era una decisión abierta anotada en la migración 05 ("si se
-- decide cerrarla, se restringe el grant"); esto la cierra.
--
-- El motivo es que la receta es el activo del negocio. Alguien que revende no
-- necesita saber qué lleva adentro un shampoo, y esconder la pantalla sin cerrar
-- la función habría sido seguridad de pantalla y no de datos: la API es pública.
--
-- El marcador es el que ya existe, `personas.es_productor` (§10, acumulable con
-- es_revendedor). No hace falta un rol nuevo: quien fabrica los lotes es quien
-- necesita la receta.
-- =============================================================================

-- SECURITY DEFINER por lo mismo que es_admin(): tiene que leer `personas` sin
-- que el RLS de esa tabla se le aplique encima mientras se evalúa una policy.
create or replace function es_productora()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from personas
    where perfil_id = auth.uid() and es_productor and activo
  )
$$;

revoke execute on function es_productora() from public, anon;
grant  execute on function es_productora() to authenticated;

-- ---------------------------------------------------------------------------
-- Pedir materia prima queda para las productoras. Pedir PRODUCTO sigue abierto
-- a cualquiera con cuenta: eso es comprar, y no expone nada.
-- ---------------------------------------------------------------------------
drop policy if exists solicitudes_propias_insert on solicitudes;

create policy solicitudes_propias_insert on solicitudes for insert to authenticated
  with check (
    exists (
      select 1 from personas pe
      where pe.id = solicitudes.persona_id
        and pe.perfil_id = auth.uid()
        and (solicitudes.tipo <> 'materia_prima' or pe.es_productor)
    )
  );

-- ---------------------------------------------------------------------------
-- La calculadora de ingredientes: misma firma, misma cuenta, ahora con puerta.
--
-- Pasa de `sql` a `plpgsql` para poder fallar con un mensaje en vez de devolver
-- cero filas: una lista vacía se lee como "este producto no tiene fórmula", que
-- es una respuesta distinta y confunde a quien sí tiene permiso.
-- ---------------------------------------------------------------------------
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
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (es_admin() or es_productora()) then
    raise exception 'la lista de insumos es para quien produce los lotes';
  end if;

  return query
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
end;
$$;

revoke execute on function calcular_insumos(uuid, numeric, variante_producto, numeric) from public, anon;
grant  execute on function calcular_insumos(uuid, numeric, variante_producto, numeric) to authenticated;
