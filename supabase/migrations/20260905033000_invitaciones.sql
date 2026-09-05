-- =============================================================================
-- Elysium — 06. Alta por link de invitación (§10)
--
-- El registro no es abierto: Johanna genera un link. El usuario se crea la
-- cuenta con Supabase Auth y después canjea el token. La creación del perfil
-- con su rol NO puede hacerla el usuario (perfiles es admin-only), así que va
-- en una función SECURITY DEFINER que valida el token antes de asignar el rol.
-- =============================================================================

create or replace function aceptar_invitacion(p_token text)
returns text
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_inv    invitaciones%rowtype;
  v_uid    uuid := auth.uid();
  v_nombre text;
begin
  if v_uid is null then
    raise exception 'hay que estar autenticado para aceptar una invitación';
  end if;

  select * into v_inv from invitaciones where token = p_token for update;
  if not found then raise exception 'invitación inexistente o inválida'; end if;
  if v_inv.usada_en is not null then raise exception 'esta invitación ya fue usada'; end if;
  if v_inv.expira_en is not null and v_inv.expira_en < now() then
    raise exception 'la invitación venció';
  end if;

  select coalesce(v_inv.email, email, 'Sin nombre') into v_nombre
  from auth.users where id = v_uid;

  insert into perfiles (id, nombre, rol) values (v_uid, v_nombre, v_inv.rol)
  on conflict (id) do update set rol = excluded.rol;

  if v_inv.persona_id is not null then
    update personas set perfil_id = v_uid where id = v_inv.persona_id;
  elsif not exists (select 1 from personas where perfil_id = v_uid) then
    insert into personas (nombre, perfil_id) values (v_nombre, v_uid);
  end if;

  update invitaciones set usada_en = now() where id = v_inv.id;
  return v_inv.rol::text;
end;
$$;

revoke execute on function aceptar_invitacion(text) from public, anon;
grant  execute on function aceptar_invitacion(text) to authenticated;

-- Rol del usuario logueado, en una sola llamada.
create or replace function mi_rol()
returns text
language sql stable
set search_path = public, pg_temp
as $$ select rol::text from perfiles where id = auth.uid() $$;
grant execute on function mi_rol() to authenticated;
