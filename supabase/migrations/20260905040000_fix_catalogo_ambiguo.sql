-- =============================================================================
-- Elysium — 07. catalogo_para_usuario(): referencia ambigua
--
-- El parámetro de salida `tamano_id` de RETURNS TABLE colisionaba con la
-- columna `tamano_id` de tamano_precios dentro del LATERAL:
--   ERROR 42702: column reference "tamano_id" is ambiguous
-- Se califica la columna con alias de tabla. Detectado al probar el front.
-- =============================================================================

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
    select tp.precio from tamano_precios tp
    where tp.tamano_id = t.id and tp.variante = 'elysium' and tp.vigente_desde <= current_date
    order by tp.vigente_desde desc, tp.creado_en desc limit 1
  ) pv on true
  left join lateral (select * from costo_tamano(t.id, current_date, null, 'elysium')) c on true
  where t.activo and p.activo
  order by p.nombre, t.magnitud;
end;
$$;
