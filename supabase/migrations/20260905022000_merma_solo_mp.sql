-- =============================================================================
-- Elysium — 02b. La merma se aplica solo a materia prima
--
-- Detectado al verificar la migración 02: cerrar_lote() aplicaba la merma a
-- TODOS los insumos del lote, incluidos envases y etiquetas, mientras que
-- costo_tamano() la aplica solo a los de tipo materia_prima. Eso hacía que el
-- costo real de un lote limpio ($3.692,78/u) no coincidiera con el teórico
-- ($3.685,28/u): los $7,50 de diferencia son el 5% de los $150 de envase +
-- etiqueta.
--
-- §3.3 dice "Merma de MP por lote". Se rompen frascos y etiquetas, pero eso no
-- es lo que ese parámetro modela, y tener dos definiciones distintas de merma
-- según qué función la calcule es peor que cualquiera de las dos.
-- =============================================================================

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
  v_consumida  numeric;
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

  for r in
    select li.*, i.tipo
    from lote_insumos li
    join insumos i on i.id = li.insumo_id
    where li.lote_id = p_lote_id
  loop
    -- La merma es de MATERIA PRIMA. Un envase no se evapora.
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
