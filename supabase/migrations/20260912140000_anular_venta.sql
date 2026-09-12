-- =============================================================================
-- Elysium — 11. Anular una venta confirmada devolviendo la mercadería
--
-- Hasta acá anular era solo `update ventas set estado = 'anulada'`: la venta
-- desaparecía de la deuda pero el stock seguía descontado, y había que acordarse
-- de cargar la entrada a mano. Una corrección que depende de la memoria de quien
-- la hace no es una corrección.
--
-- Las tres cosas pasan juntas o no pasa ninguna:
--   1. vuelve la mercadería al stock
--   2. se liberan los pagos que estaban imputados a esta venta
--   3. la venta queda anulada
--
-- DECISIÓN (el tipo del movimiento espejo): se repite el tipo del original
-- —'venta' o 'entrega'— con el signo dado vuelta, en vez de usar 'ajuste'.
--   * Un informe de "cuánto vendí" que suma tipo='venta' queda bien solo: la
--     salida y su devolución se cancelan. Con 'ajuste' contaría de más las
--     ventas anuladas y habría que acordarse de restarlas.
--   * Filtrando los movimientos por venta_id se lee la historia completa.
-- El motivo dice que es una anulación, así que la fila no se confunde con una
-- venta que sumó stock.
--
-- DECISIÓN (los pagos): se borran las imputaciones, no el pago. La plata entró
-- de verdad; lo que dejó de ser cierto es a qué venta se aplicaba. El pago
-- vuelve a tener sobrante y se puede re-imputar a otra venta, o devolver.
--
-- La fecha del movimiento espejo es la de hoy y no la de la venta: la
-- mercadería vuelve cuando se anula, no retroactivamente. El stock a una fecha
-- pasada sigue siendo el que era.
-- =============================================================================

create or replace function anular_venta(p_venta_id uuid)
returns numeric   -- cuánto de pagos quedó liberado
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_v        ventas%rowtype;
  v_liberado numeric := 0;
  r          record;
begin
  select * into v_v from ventas where id = p_venta_id for update;
  if not found then
    raise exception 'venta inexistente: %', p_venta_id;
  end if;
  if v_v.estado <> 'confirmada' then
    raise exception 'solo se anula una venta confirmada; esta está en %', v_v.estado;
  end if;

  -- 1. Devolver lo que salió: un movimiento espejo de cada salida.
  for r in
    select * from movimientos_producto
    where venta_id = p_venta_id and cantidad < 0
  loop
    insert into movimientos_producto
      (tamano_id, ubicacion_id, cantidad, tipo, fecha, venta_id, motivo)
    values (r.tamano_id, r.ubicacion_id, -r.cantidad, r.tipo, current_date, p_venta_id,
            'Anulación de la venta del ' || v_v.fecha);
  end loop;

  -- 2. Soltar los pagos. El monto vuelve a quedar como sobrante de su pago.
  select coalesce(sum(monto), 0) into v_liberado
  from pago_imputaciones where venta_id = p_venta_id;

  delete from pago_imputaciones where venta_id = p_venta_id;

  -- 3. Recién ahora la venta deja de contar para la deuda.
  update ventas set estado = 'anulada' where id = p_venta_id;

  return v_liberado;
end;
$$;

comment on function anular_venta is 'Anula una venta confirmada: devuelve la mercadería al stock con movimientos espejo, libera los pagos imputados y marca la venta. Devuelve cuánto pago quedó liberado.';

revoke execute on function anular_venta(uuid) from public, anon;
grant  execute on function anular_venta(uuid) to authenticated;
