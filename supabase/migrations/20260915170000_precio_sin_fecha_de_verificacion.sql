-- =============================================================================
-- Elysium — 17. Un precio puede no tener fecha de verificación
--
-- `verificado_en` era NOT NULL con default `current_date`, y eso obliga a
-- afirmar algo que a veces nadie sabe: los precios que vienen del Excel no
-- registran cuándo se verificaron. Con la columna obligatoria, cargarlos
-- significaba inventar una fecha —la de hoy, que dice "recién verificado" y es
-- falso, o una vieja arbitraria— cuando el dato correcto es "no se sabe".
--
-- Es la misma regla que el resto del modelo: **null es desconocido, no es cero
-- ni es hoy** (§4). La app ya lo dibujaba así (`UltimaVerificacion` muestra
-- "Nunca se verificó el precio de este insumo" cuando falta); lo único que no
-- acompañaba era la base.
--
-- La vista `v_insumo_precio_vigente` no se toca: `dias_desde_verificacion` y
-- `alerta_desactualizado` pasan a ser nulos para esas filas, que es lo que
-- corresponde —no se puede decir que un precio está vencido a los 30 días si no
-- se sabe de cuándo es— y es exactamente el caso que el front ya maneja.
--
-- Un precio cargado desde la app sigue trayendo la fecha: el default no cambia,
-- y guardar un precio es un evento de verificación (§5).
-- =============================================================================

alter table insumo_precios alter column verificado_en drop not null;

comment on column insumo_precios.verificado_en is
  'Cuándo se comprobó que este precio es el vigente. Null = nunca se verificó (dato importado sin fecha), y entonces no hay alerta de 30 días que dar.';
