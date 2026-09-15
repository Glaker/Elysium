-- =============================================================================
-- Elysium — 14. Lo que le faltaba al admin: invitar y atender pedidos
--
-- Las dos tablas ya existían (`invitaciones` de 06, `solicitudes` de 05) pero no
-- tenían cómo operarse desde la app: la invitación había que insertarla a mano y
-- un pedido entraba a la base sin que nadie pudiera verlo ni convertirlo en nada.
--
-- Las tres operaciones viven acá y no en el cliente porque cada una es varias
-- escrituras que tienen que pasar juntas, o un valor que no debería generar el
-- navegador (el token).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Crear una invitación.
--
-- El token se genera en la base a propósito: es la única credencial del alta
-- (§10), y dejarla en manos del cliente significaría que la calidad del secreto
-- depende de qué navegador la pidió. Dos uuid v4 pegados son 244 bits de
-- aleatoriedad del mismo generador que ya usan todas las claves primarias, sin
-- depender de pgcrypto.
--
-- No es SECURITY DEFINER: invitar es una operación de admin y el RLS de
-- `invitaciones` ya la restringe. El chequeo explícito está para que el error
-- diga qué pasó en vez de devolver cero filas.
-- ---------------------------------------------------------------------------
create or replace function crear_invitacion(
  p_rol        rol_usuario default 'usuario',
  p_persona_id uuid        default null,
  p_email      text        default null,
  p_dias       int         default 14
)
returns invitaciones
language plpgsql
set search_path = public, pg_temp
as $$
declare v_inv invitaciones%rowtype;
begin
  if not es_admin() then
    raise exception 'solo un admin puede invitar';
  end if;

  if p_persona_id is not null and exists (
    select 1 from personas where id = p_persona_id and perfil_id is not null
  ) then
    raise exception 'esa persona ya tiene cuenta en la app';
  end if;

  insert into invitaciones (email, rol, token, persona_id, creada_por, expira_en)
  values (
    nullif(btrim(p_email), ''),
    p_rol,
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    p_persona_id,
    auth.uid(),
    -- Sin vencimiento es una decisión válida (un link que se manda por WhatsApp
    -- y se usa cuando la persona puede), no un descuido: p_dias nulo o cero.
    case when coalesce(p_dias, 0) <= 0 then null else now() + make_interval(days => p_dias) end
  )
  returning * into v_inv;

  return v_inv;
end;
$$;

revoke execute on function crear_invitacion(rol_usuario, uuid, text, int) from public, anon;
grant  execute on function crear_invitacion(rol_usuario, uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolver un pedido sin convertirlo en venta: se entregó, se rechazó, o se
-- deshace una resolución equivocada volviendo a 'pendiente'.
-- ---------------------------------------------------------------------------
create or replace function resolver_solicitud(
  p_solicitud_id uuid,
  p_estado       estado_solicitud
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not es_admin() then
    raise exception 'solo un admin puede resolver un pedido';
  end if;
  if not exists (select 1 from solicitudes where id = p_solicitud_id) then
    raise exception 'pedido inexistente: %', p_solicitud_id;
  end if;

  update solicitudes set
    estado       = p_estado,
    resuelta_en  = case when p_estado = 'pendiente' then null else now() end,
    resuelta_por = case when p_estado = 'pendiente' then null else auth.uid() end
  where id = p_solicitud_id;
end;
$$;

revoke execute on function resolver_solicitud(uuid, estado_solicitud) from public, anon;
grant  execute on function resolver_solicitud(uuid, estado_solicitud) to authenticated;

-- ---------------------------------------------------------------------------
-- Convertir un pedido de producto en una venta en borrador.
--
-- Borrador y no confirmada: confirmar congela importes y descuenta stock (§2),
-- y eso lo decide Johanna mirando la venta, no el pedido. El pedido no reserva
-- nada — §11 es explícito — así que entre el pedido y la venta puede haber
-- pasado cualquier cosa con el stock.
--
-- Va en una función y no en tres llamadas desde el cliente porque son tres
-- escrituras: si la venta se crea y las líneas fallan, queda un borrador huérfano
-- y un pedido que dice "aprobado" sin nada atrás.
-- ---------------------------------------------------------------------------
create or replace function aprobar_solicitud_como_venta(
  p_solicitud_id uuid,
  p_tipo         tipo_venta default null,
  p_fecha        date       default current_date
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_s     solicitudes%rowtype;
  v_tipo  tipo_venta;
  v_venta uuid;
begin
  if not es_admin() then
    raise exception 'solo un admin puede aprobar un pedido';
  end if;

  select * into v_s from solicitudes where id = p_solicitud_id for update;
  if not found then raise exception 'pedido inexistente: %', p_solicitud_id; end if;
  if v_s.tipo <> 'producto' then
    raise exception 'un pedido de materia prima no es una venta: resolvelo como entregado';
  end if;
  if v_s.estado <> 'pendiente' then
    raise exception 'este pedido ya estaba %', v_s.estado;
  end if;
  if not exists (
    select 1 from solicitud_lineas
    where solicitud_id = p_solicitud_id and tamano_id is not null
  ) then
    raise exception 'el pedido no tiene ninguna línea de producto';
  end if;

  -- El tipo por defecto sale del vínculo comercial: quien revende paga el costo
  -- (§2). Es solo un default — el tipo lo puede elegir quien aprueba, porque es
  -- por transacción y no por ficha (MODELO §Identidad).
  v_tipo := coalesce(
    p_tipo,
    (select case when pe.es_revendedor then 'entrega_reventa' else 'directa' end::tipo_venta
     from personas pe where pe.id = v_s.persona_id)
  );

  insert into ventas (tipo, fecha, persona_id, registrada_por, notas)
  values (
    v_tipo, p_fecha, v_s.persona_id, auth.uid(),
    'Pedido del ' || to_char(v_s.fecha, 'DD/MM/YYYY') || coalesce(' — ' || v_s.notas, '')
  )
  returning id into v_venta;

  -- Agrupadas: el pedido puede traer el mismo tamaño dos veces (se pide dos
  -- veces desde el catálogo) y `venta_lineas` es única por tamaño y variante.
  insert into venta_lineas (venta_id, tamano_id, variante, cantidad)
  select v_venta, sl.tamano_id, sl.variante, sum(sl.cantidad)
  from solicitud_lineas sl
  where sl.solicitud_id = p_solicitud_id and sl.tamano_id is not null
  group by sl.tamano_id, sl.variante;

  update solicitudes set estado = 'aprobada', resuelta_en = now(), resuelta_por = auth.uid()
  where id = p_solicitud_id;

  return v_venta;
end;
$$;

revoke execute on function aprobar_solicitud_como_venta(uuid, tipo_venta, date) from public, anon;
grant  execute on function aprobar_solicitud_como_venta(uuid, tipo_venta, date) to authenticated;
