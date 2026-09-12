-- =============================================================================
-- Elysium — 10. Simulador de costos con precios hipotéticos
--
-- §11, textual de Johanna: "elegir fórmula y tamaño, ver el costo. Si un insumo
-- no está cargado, pedir los datos ahí mismo SIN GUARDARLOS".
--
-- El "sin guardarlos" es el requisito difícil: costo_tamano() lee los precios de
-- insumo_precios, así que simular con un precio que no está en la base obliga a
-- pasarlo por parámetro.
--
-- POR QUÉ ACÁ Y NO EN EL FRONT: la alternativa era rehacer la suma de §3.1+§3.2
-- en TypeScript. Serían dos implementaciones del corazón del sistema, y la del
-- front no tendría ni la recursión de las MP intermedias ni el manejo de
-- desconocidos. La divergencia entre las dos no se notaría hasta que un precio
-- simulado no coincida con el real, que es exactamente cuando más importa.
--
-- El override es un jsonb {insumo_id: precio} con el precio EN LA UNIDAD DE
-- COMPRA y en pesos, igual que insumo_precios. Se aplica a cualquier nivel del
-- árbol: sirve para un insumo de la fórmula y también para un componente de una
-- MP intermedia, que es donde el front no podría resolverlo solo.
-- =============================================================================

-- costo_insumo con overrides. Espeja costo_insumo(); la única diferencia es que
-- antes de buscar el precio de lista mira el mapa que le pasaron.
create or replace function costo_insumo_simulado(
  p_insumo_id uuid,
  p_precios   jsonb   default '{}'::jsonb,
  p_fecha     date    default current_date,
  p_path      uuid[]  default '{}'
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

  if v_ins.origen = 'comprado' then
    -- La única diferencia con costo_insumo(): el precio simulado gana.
    v_precio := (p_precios ->> p_insumo_id::text)::numeric;

    if v_precio is not null then
      v_res.costo    := v_precio / factor_unidad(v_ins.unidad);
      v_res.completo := true;
      return v_res;
    end if;

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

  if v_ins.rinde_cantidad is null then
    v_res.faltantes := array[v_ins.nombre || ' (sin rinde declarado)'];
    return v_res;
  end if;

  if not exists (select 1 from insumo_composicion where insumo_producido_id = p_insumo_id) then
    v_res.faltantes := array[v_ins.nombre || ' (sin composición cargada)'];
    return v_res;
  end if;

  for r in select * from insumo_composicion where insumo_producido_id = p_insumo_id loop
    v_hijo := costo_insumo_simulado(r.insumo_componente_id, p_precios, p_fecha, p_path || p_insumo_id);
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

-- El desglose de §3.1+§3.2 con precios simulados. Misma forma de salida que
-- costo_tamano(), para que el front muestre los dos con el mismo componente.
create or replace function simular_costo_tamano(
  p_tamano_id uuid,
  p_variante  variante_producto default 'elysium',
  p_precios   jsonb             default '{}'::jsonb,
  p_fecha     date              default current_date,
  p_merma_pct numeric           default null
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
    v_hijo := costo_insumo_simulado(r.insumo_id, p_precios, p_fecha);
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
    v_completo := false;
    v_faltantes := v_faltantes || array['productividad_unid_hora (sin cargar en el tamaño)'];
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

  return query select
    v_mp, v_merma, v_envases, v_etiquetas, v_otros, v_mo, v_regalias, v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia,
    v_mp + v_merma + v_envases + v_otros + v_mo + v_regalias + v_energia + v_etiquetas,
    true, '{}'::text[];
end;
$$;

-- Qué insumos habría que cotizar para que el costo de un tamaño cierre.
-- El front necesita esto para saber por cuáles preguntar: parsear los strings
-- de `faltantes` sería atarse al texto de un mensaje de error.
create or replace function insumos_sin_precio_tamano(
  p_tamano_id uuid,
  p_variante  variante_producto default 'elysium',
  p_fecha     date              default current_date
)
returns table (insumo_id uuid, nombre text, unidad unidad_insumo)
language sql stable
set search_path = public, pg_temp
as $$
  with recursive arbol as (
    -- Los insumos que la fórmula usa directamente, en esta variante.
    select i.id, i.origen, 0 as nivel
    from formula_lineas fl
    join insumos i on i.id = fl.insumo_id
    where fl.tamano_id = p_tamano_id
      and (fl.aplica_a = 'ambas'
        or (fl.aplica_a = 'solo_elysium'      and p_variante = 'elysium')
        or (fl.aplica_a = 'solo_marca_blanca' and p_variante = 'marca_blanca'))

    union

    -- Y bajando por la composición de las MP intermedias.
    select i.id, i.origen, a.nivel + 1
    from arbol a
    join insumo_composicion ic on ic.insumo_producido_id = a.id
    join insumos i on i.id = ic.insumo_componente_id
    where a.origen = 'producido' and a.nivel < 10
  )
  select distinct i.id, i.nombre, i.unidad
  from arbol a
  join insumos i on i.id = a.id
  where a.origen = 'comprado'
    and not exists (
      select 1 from insumo_precios ip
      where ip.insumo_id = i.id and ip.vigente_desde <= p_fecha
    )
  order by i.nombre;
$$;

revoke execute on function costo_insumo_simulado(uuid, jsonb, date, uuid[]) from public, anon;
revoke execute on function simular_costo_tamano(uuid, variante_producto, jsonb, date, numeric) from public, anon;
revoke execute on function insumos_sin_precio_tamano(uuid, variante_producto, date) from public, anon;
