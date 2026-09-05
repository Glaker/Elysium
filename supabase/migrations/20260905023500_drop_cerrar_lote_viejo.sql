-- =============================================================================
-- Elysium — 03b. Eliminar la sobrecarga obsoleta de cerrar_lote
--
-- La migración 03 le agregó el parámetro p_ubicacion_id. Como `create or
-- replace function` distingue por firma, eso creó una segunda función en vez
-- de reemplazar la anterior, y cualquier llamada con 3 argumentos quedaba
-- ambigua ("function cerrar_lote(uuid, resultado_lote, integer) is not unique").
-- Se elimina la de 5 parámetros: la buena es la de 6, que además emite los
-- movimientos de stock.
-- =============================================================================

drop function if exists cerrar_lote(uuid, resultado_lote, numeric, numeric, numeric);
