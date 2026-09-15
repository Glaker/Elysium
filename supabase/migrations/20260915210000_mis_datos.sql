-- =============================================================================
-- Elysium — 18. Cada uno corrige sus propios datos
--
-- El alta pide nombre, apellido y teléfono (migración 16) y después de eso no
-- había forma de tocarlos salvo pedírselo a un admin. Un teléfono mal tipeado en
-- el alta es justo el dato que después hace falta para cobrar, así que la app
-- abre esos tres campos —y solo esos tres— a su dueño.
--
-- Va como función y no como policy de UPDATE sobre `personas` porque una policy
-- no puede limitar QUÉ columnas se escriben: con `using (perfil_id = auth.uid())`
-- cualquiera podría ponerse `es_revendedor` o `activo` desde la consola del
-- navegador. Acá la lista de columnas está escrita en el cuerpo y es la única
-- que existe.
--
-- El nombre vive en dos lados (`personas` y `perfiles.nombre`, que es lo que
-- saluda la app) y por eso los escribe la misma función: dejarlos a cargo del
-- cliente es garantizar que en algún momento digan cosas distintas.
-- =============================================================================
create or replace function actualizar_mis_datos(
  p_nombre   text,
  p_apellido text,
  p_telefono text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_apellido text := nullif(btrim(coalesce(p_apellido, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_persona  uuid;
begin
  if auth.uid() is null then
    raise exception 'no hay sesión';
  end if;

  if v_nombre = '' then
    raise exception 'el nombre no puede quedar vacío';
  end if;

  select id into v_persona from personas where perfil_id = auth.uid();
  if v_persona is null then
    raise exception 'tu cuenta todavía no tiene una ficha en el padrón';
  end if;

  -- El teléfono es con lo que el alta reconoce a alguien que ya existía en el
  -- padrón (`alta_de_cuenta`): si dos fichas comparten número, esa búsqueda deja
  -- de tener una sola respuesta y la deuda de alguien puede terminar partida.
  if v_telefono is not null and exists (
    select 1 from personas
    where id <> v_persona
      and solo_digitos(telefono) is not null
      and solo_digitos(telefono) = solo_digitos(v_telefono)
  ) then
    raise exception 'ese teléfono ya figura en otra ficha';
  end if;

  update personas
     set nombre   = v_nombre,
         apellido = v_apellido,
         telefono = v_telefono
   where id = v_persona;

  update perfiles
     set nombre = btrim(v_nombre || ' ' || coalesce(v_apellido, ''))
   where id = auth.uid();
end;
$$;

revoke execute on function actualizar_mis_datos(text, text, text) from public, anon;
grant  execute on function actualizar_mis_datos(text, text, text) to authenticated;
