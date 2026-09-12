-- =============================================================================
-- Elysium — 09. lote_planificar respeta la variante del lote
--
-- BUG: la migración 05 agregó `lotes.variante` y enseñó a costo_tamano(),
-- precio_recomendado() y calcular_insumos() a filtrar las líneas de fórmula por
-- variante. `lote_planificar()` quedó como estaba en la migración 02, de cuando
-- la variante no existía: planifica TODAS las líneas del tamaño.
--
-- Consecuencia real, verificada contra la base: un lote de marca blanca de 100
-- unidades planificaba 100 etiquetas Elysium, y al cerrarlo emitía un
-- movimiento de -100 sobre ese insumo. O sea, la marca blanca descontaba del
-- stock la etiqueta que por definición no lleva.
--
-- Era además una incoherencia interna: el costo de ese mismo lote se calculaba
-- sin la etiqueta y el consumo se planificaba con ella.
--
-- El filtro es idéntico al de costo_tamano(), a propósito: si algún día cambia
-- la regla de aplicabilidad, tiene que cambiar en los dos lados o vuelven a
-- divergir. El resto de la función queda igual.
-- =============================================================================

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
    where fl.tamano_id = v_l.tamano_id
      and (fl.aplica_a = 'ambas'
        or (fl.aplica_a = 'solo_elysium'      and v_l.variante = 'elysium')
        or (fl.aplica_a = 'solo_marca_blanca' and v_l.variante = 'marca_blanca'));
  else
    -- Una MP intermedia no tiene variante: no lleva etiqueta ni presentación.
    select * into v_i from insumos where id = v_l.insumo_producido_id;
    if v_i.rinde_cantidad is null then
      raise exception 'la MP intermedia % no tiene rinde declarado', v_i.nombre;
    end if;
    insert into lote_insumos (lote_id, insumo_id, cantidad_planificada)
    select p_lote_id, ic.insumo_componente_id,
           ic.cantidad * (v_l.unidades_planificadas / v_i.rinde_cantidad)
    from insumo_composicion ic
    where ic.insumo_producido_id = v_l.insumo_producido_id;
  end if;
end;
$$;
