-- =============================================================================
-- Elysium — 16. El alta deja de ser por invitación
--
-- §10 decía "no hay registro abierto: el alta es por link". Se cambia la
-- decisión: cualquiera se crea la cuenta, y lo que era la credencial del alta
-- (el token) pasa a ser lo único que de verdad importaba — **el rol**, que ahora
-- lo pone un admin desde el padrón, después y con la persona a la vista.
--
-- El token no protegía nada que el rol no proteja mejor: una cuenta recién
-- creada es 'usuario', y un usuario ve su catálogo, su deuda y nada más. Lo que
-- sí costaba era el camino: Johanna tenía que generar un link, pasarlo, y
-- después la persona tenía que abrirlo en el navegador correcto.
--
-- A cambio, el alta ahora pide los datos que antes no pedía nadie: nombre,
-- apellido y teléfono. Son obligatorios en el formulario y llegan acá como
-- metadata del usuario de Auth.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. La persona: nombre y apellido separados, y el teléfono con nombre propio
--
-- `contacto` era un texto libre que en los hechos siempre fue un teléfono. Se
-- renombra en vez de agregar otro campo al lado: dos campos parecidos en el
-- mismo formulario es la forma más segura de que la mitad de los teléfonos
-- terminen en el equivocado.
--
-- `nombre` pasa a ser el nombre de pila, y `nombre_completo` es una columna
-- generada: todo lo que muestra una persona lee esa, así nadie concatena por su
-- cuenta y nadie puede dejar las dos desincronizadas. Las personas cargadas a
-- mano antes de esto quedan con el nombre entero en `nombre` y sin apellido,
-- que es exactamente lo que se sabe de ellas.
-- ---------------------------------------------------------------------------
alter table personas rename column contacto to telefono;
alter table personas add column apellido text;

alter table personas add column nombre_completo text
  generated always as (btrim(nombre || ' ' || coalesce(apellido, ''))) stored;

comment on column personas.telefono is
  'Obligatorio en el alta por la app; opcional en una persona cargada a mano, que puede no tener cuenta nunca.';
comment on column personas.nombre_completo is
  'Generada. Es la que se muestra en toda la app: nadie concatena nombre y apellido a mano.';

create index on personas (telefono) where telefono is not null;
create index on personas (nombre_completo);

-- La vista de deuda muestra personas: pasa a devolver el nombre completo, con
-- el mismo nombre de columna para no partir a quien la lee.
drop view if exists v_deuda_persona;
create view v_deuda_persona with (security_invoker = true) as
select
  d.persona_id,
  p.nombre_completo as nombre,
  count(*) filter (where d.saldo > 0) as ventas_impagas,
  sum(d.saldo) as deuda_total,
  min(d.fecha) filter (where d.saldo > 0) as deuda_mas_vieja
from v_deuda_venta d
join personas p on p.id = d.persona_id
group by d.persona_id, p.nombre_completo;

-- ---------------------------------------------------------------------------
-- 2. El alta: una cuenta de Auth crea su perfil y su persona
--
-- Va en un trigger sobre `auth.users` y no en una función que llame el cliente
-- después de registrarse por una razón concreta: si el proyecto pide confirmar
-- el email, entre el `signUp` y la primera sesión no hay nadie autenticado que
-- pueda llamar a nada, y la cuenta quedaría existiendo sin perfil. Acá el perfil
-- nace con el usuario, con sesión o sin ella.
--
-- SECURITY DEFINER porque `perfiles` y `personas` son admin-only: el que se
-- registra no puede escribir en ninguna de las dos, y está bien que no pueda.
-- El rol es 'usuario' siempre — que el default del enum lo sea no alcanza, se
-- escribe explícito porque es la regla que sostiene todo lo demás.
--
-- Si ya existía una persona con ese teléfono y sin cuenta, se vincula en vez de
-- duplicarla: es el caso normal, alguien a quien Johanna ya le vendía y que
-- recién ahora se registra. Duplicarla partiría su deuda en dos fichas.
-- ---------------------------------------------------------------------------
create or replace function solo_digitos(p_texto text)
returns text
language sql immutable
as $$ select nullif(regexp_replace(coalesce(p_texto, ''), '\D', '', 'g'), '') $$;

create or replace function alta_de_cuenta()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre   text := btrim(coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  v_apellido text := btrim(coalesce(new.raw_user_meta_data ->> 'apellido', ''));
  v_telefono text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'telefono', '')), '');
  v_persona  uuid;
begin
  -- Sin nombre no se puede: el email como nombre es lo que hacía la invitación
  -- y es lo que dejaba el padrón lleno de fulano@gmail.com.
  if v_nombre = '' then
    v_nombre := split_part(new.email, '@', 1);
  end if;

  insert into perfiles (id, nombre, rol)
  values (new.id, btrim(v_nombre || ' ' || v_apellido), 'usuario')
  on conflict (id) do nothing;

  select id into v_persona
  from personas
  where perfil_id is null
    and solo_digitos(telefono) is not null
    and solo_digitos(telefono) = solo_digitos(v_telefono)
  order by creado_en
  limit 1;

  if v_persona is not null then
    update personas set
      perfil_id = new.id,
      apellido  = coalesce(nullif(v_apellido, ''), apellido)
    where id = v_persona;
  else
    insert into personas (nombre, apellido, telefono, perfil_id)
    values (v_nombre, nullif(v_apellido, ''), v_telefono, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function alta_de_cuenta();

-- ---------------------------------------------------------------------------
-- 3. El rol lo da un admin, desde el padrón
--
-- Los tres roles de una persona viven en dos lados y eso no es un descuido:
-- `perfiles.rol` (admin | usuario) es de la CUENTA y lo lee el RLS, mientras que
-- revendedora y productora son atributos de la PERSONA y valen aunque nunca se
-- registre (una deuda no espera a que alguien se cree una cuenta). Esta función
-- toca solo el primero; los otros dos se editan en la ficha como cualquier campo.
--
-- Dos guardas que no pueden vivir en el cliente: que la persona tenga cuenta, y
-- que no quede la app sin ningún admin. La segunda incluye el caso de un admin
-- bajándose a sí mismo, que es la forma más fácil de perder el acceso a todo.
-- ---------------------------------------------------------------------------
create or replace function cambiar_rol(p_persona_id uuid, p_rol rol_usuario)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_perfil uuid;
begin
  if not es_admin() then
    raise exception 'solo un admin puede cambiar un rol';
  end if;

  select perfil_id into v_perfil from personas where id = p_persona_id;
  if v_perfil is null then
    raise exception 'esa persona todavía no tiene cuenta en la app';
  end if;

  if p_rol <> 'admin' and not exists (
    select 1 from perfiles where rol = 'admin' and activo and id <> v_perfil
  ) then
    raise exception 'no se puede sacar el último admin: nadie podría volver a entrar';
  end if;

  update perfiles set rol = p_rol where id = v_perfil;
end;
$$;

revoke execute on function cambiar_rol(uuid, rol_usuario) from public, anon;
grant  execute on function cambiar_rol(uuid, rol_usuario) to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. Al padrón se entra registrándose, y solo así
--
-- Con el alta abierta, cargar personas a mano dejó de tener sentido: si alguien
-- va a comprar, se crea la cuenta, y su ficha nace con ella. Dos caminos para
-- que exista una persona —el trigger y el alta manual— es la receta conocida
-- para terminar con la misma persona dos veces y su deuda partida al medio.
--
-- Así que el INSERT deja de estar permitido para cualquiera: la única fila que
-- entra a `personas` es la que escribe `alta_de_cuenta()`, que corre como owner
-- y no pasa por acá. El admin sigue pudiendo leer, corregir y desactivar.
--
-- (Una venta puede seguir no teniendo persona: es la venta de mostrador que no
-- genera deuda. Lo que ya no se puede es deberle plata a alguien que no existe
-- como cuenta.)
-- ---------------------------------------------------------------------------
drop policy if exists personas_admin on personas;
create policy personas_update on personas for update to authenticated
  using (es_admin()) with check (es_admin());
create policy personas_delete on personas for delete to authenticated
  using (es_admin());

-- ---------------------------------------------------------------------------
-- 4. Se va la invitación
--
-- La tabla, sus dos funciones y su policy. El historial de quién invitó a quién
-- no se conserva porque no describe ningún hecho del negocio: la cuenta y su
-- persona ya dicen quién entró y cuándo.
-- ---------------------------------------------------------------------------
drop function if exists aceptar_invitacion(text);
drop function if exists crear_invitacion(rol_usuario, uuid, text, int);
drop table if exists invitaciones;
