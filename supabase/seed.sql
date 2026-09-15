-- =============================================================================
-- Elysium — datos de prueba
--
-- Este archivo lo aplica `supabase db reset` SOLO en local. Nunca corre contra
-- la base remota: ahí Johanna carga los datos reales.
--
-- Qué hay acá:
--   * El Shampoo Café de CONTEXT.md §3.1 y §3.2, con sus números reales.
--   * Artefactos SINTÉTICOS para ejercitar los casos de borde: la Resina con
--     precios inventados (§4 dice que el costo real NO se migra), un ciclo de
--     composición, un producto con un insumo sin precio.
--   * Tres lotes con los tres resultados, ventas, pagos y un recuento.
--   * Dos usuarios de prueba (admin y usuario normal).
--
-- Nada de esto es dato de negocio. Si alguna vez aparece en producción, es un bug.
-- =============================================================================

-- ---------------------------------------------------------------- usuarios
-- Password de los dos: Elysium-Test-2026!
-- Las columnas de token van en '' y NO en NULL: GoTrue las lee en strings no
-- nulos de Go y un NULL le rompe el scan con "Database error querying schema",
-- que se manifiesta como un 500 al intentar loguearse. Verificado en remoto.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000'::uuid, v.id, 'authenticated', 'authenticated',
       v.email, extensions.crypt('Elysium-Test-2026!', extensions.gen_salt('bf')),
       now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('nombre', v.nombre, 'apellido', v.apellido, 'telefono', v.telefono),
       '', '', '', '', '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'admin.test@elysium.dev',
   'Johanna', 'Admin',      '11 5555 0001'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'usuario.test@elysium.dev',
   'Sofia',   'Revendedora', '11 5555 0002')
) v(id, email, nombre, apellido, telefono)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', u.id::text, now(), now(), now()
from auth.users u
where u.email in ('admin.test@elysium.dev', 'usuario.test@elysium.dev')
on conflict do nothing;

-- El perfil y la persona de cada uno ya los creó el trigger `alta_de_cuenta()`
-- con la metadata de arriba: acá solo queda el rol, que ninguna cuenta nueva se
-- da a sí misma.
update perfiles set rol = 'admin'
where id = '11111111-1111-4111-8111-111111111111';

-- ------------------------------------------------------------- parámetros
-- margen_pct sigue SIN valor a propósito: CONTEXT nunca lo cuantifica.
insert into parametro_valores (parametro, valor, vigente_desde) values
  ('margen_pct', 60, '2020-01-01')
on conflict do nothing;

-- ------------------------------------------------------------- proveedores
insert into proveedores (nombre, link) values
  ('Aromas del Sur', 'https://ejemplo.com/aromas')
on conflict (nombre) do nothing;

-- ---------------------------------------------- insumos del Shampoo Café (§3.1)
insert into insumos (nombre, unidad, tipo, origen) values
  ('SCI',                          'kg',     'materia_prima', 'comprado'),
  ('SCS',                          'kg',     'materia_prima', 'comprado'),
  ('Betaina de coco',              'kg',     'materia_prima', 'comprado'),
  ('Cafeina anhidra',              'kg',     'materia_prima', 'comprado'),
  ('Arcilla blanca',               'kg',     'materia_prima', 'comprado'),
  ('Cafe molido',                  'kg',     'materia_prima', 'comprado'),
  ('Aceite almendras c/ cannabis', 'kg',     'materia_prima', 'comprado'),
  ('Alcohol cetilico',             'kg',     'materia_prima', 'comprado'),
  ('Etiqueta Shampoo Cafe',        'unidad', 'etiqueta',      'comprado'),
  ('Envase Shampoo Cafe',          'unidad', 'envase',        'comprado')
on conflict (nombre) do nothing;

insert into insumo_precios (insumo_id, precio, vigente_desde, verificado_en)
select i.id, v.precio, date '2026-01-01', date '2026-01-01'
from insumos i join (values
  ('SCI', 25299::numeric), ('SCS', 22899), ('Betaina de coco', 7830),
  ('Cafeina anhidra', 99700), ('Arcilla blanca', 4530), ('Cafe molido', 26235),
  ('Aceite almendras c/ cannabis', 72212), ('Alcohol cetilico', 14830),
  ('Etiqueta Shampoo Cafe', 100), ('Envase Shampoo Cafe', 50)
) v(nombre, precio) on v.nombre = i.nombre
on conflict (insumo_id, vigente_desde) do nothing;

-- ------------------------- MP intermedia con PRECIOS INVENTADOS (§4: no se migran)
insert into insumos (nombre, unidad, tipo, origen) values
  ('Flores',          'kg',     'materia_prima', 'comprado'),
  ('Alcohol etilico', 'l',      'materia_prima', 'comprado'),
  ('Jeringa',         'unidad', 'otro',          'comprado'),
  ('Filtro',          'unidad', 'otro',          'comprado'),
  ('MP sin precio',   'kg',     'materia_prima', 'comprado')
on conflict (nombre) do nothing;

insert into insumo_precios (insumo_id, precio, vigente_desde, verificado_en)
select i.id, v.precio, date '2026-01-01', date '2026-01-01'
from insumos i join (values
  ('Flores', 12000::numeric), ('Alcohol etilico', 8500), ('Jeringa', 350), ('Filtro', 900)
) v(nombre, precio) on v.nombre = i.nombre
on conflict (insumo_id, vigente_desde) do nothing;
-- 'MP sin precio' queda sin fila: ejercita el camino de costo desconocido.

insert into insumos (nombre, unidad, tipo, origen, rinde_cantidad)
values ('Resina', 'l', 'materia_prima', 'producido', 500)
on conflict (nombre) do nothing;

insert into insumo_composicion (insumo_producido_id, insumo_componente_id, cantidad)
select r.id, c.id, v.cant
from insumos r
join (values ('Flores', 300::numeric), ('Alcohol etilico', 1000), ('Jeringa', 2), ('Filtro', 1))
     v(nombre, cant) on true
join insumos c on c.nombre = v.nombre
where r.nombre = 'Resina'
on conflict (insumo_producido_id, insumo_componente_id) do nothing;

-- Ciclo A -> B -> A: verifica que la recursión corta en vez de colgarse.
insert into insumos (nombre, unidad, tipo, origen, rinde_cantidad) values
  ('Ciclo A', 'kg', 'materia_prima', 'producido', 100),
  ('Ciclo B', 'kg', 'materia_prima', 'producido', 100)
on conflict (nombre) do nothing;
insert into insumo_composicion (insumo_producido_id, insumo_componente_id, cantidad)
select a.id, b.id, 10 from insumos a, insumos b where a.nombre='Ciclo A' and b.nombre='Ciclo B'
on conflict do nothing;
insert into insumo_composicion (insumo_producido_id, insumo_componente_id, cantidad)
select b.id, a.id, 10 from insumos a, insumos b where a.nombre='Ciclo A' and b.nombre='Ciclo B'
on conflict do nothing;

-- ------------------------------------------------------------------ productos
insert into productos (nombre) values
  ('Shampoo Cafe'), ('Balsamo test'), ('Test sin precio'), ('Test ciclo')
on conflict (nombre) do nothing;

insert into tamanos (producto_id, nombre, magnitud, unidad, productividad_unid_hora)
select p.id, v.nom, v.mag, v.un::unidad_tamano, v.prod
from productos p join (values
  ('Shampoo Cafe',    '75 g', 75::numeric, 'g', 35::numeric),
  ('Balsamo test',    '30 g', 30,          'g', 20),
  ('Test sin precio', '50 g', 50,          'g', 20),
  ('Test ciclo',      '10 g', 10,          'g', 20)
) v(prod_nom, nom, mag, un, prod) on v.prod_nom = p.nombre
on conflict (producto_id, magnitud, unidad) do nothing;

insert into tamano_precios (tamano_id, precio, vigente_desde)
select t.id, 4500, date '2026-01-01'
from tamanos t join productos p on p.id = t.producto_id
where p.nombre = 'Shampoo Cafe'
on conflict do nothing;

-- Fórmula del Shampoo Café: §3.1 (suma 101%, tal cual el original) + §3.2
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, cantidad_fija, orden, aplica_a)
select t.id, i.id, v.modo::modo_composicion, v.pct, v.fija, v.orden, v.ap::aplica_variante
from tamanos t
join productos p on p.id = t.producto_id and p.nombre = 'Shampoo Cafe'
cross join (values
  ('SCI',                          'porcentaje',    30::numeric, null::numeric,  1, 'ambas'),
  ('SCS',                          'porcentaje',    30,          null,           2, 'ambas'),
  ('Betaina de coco',              'porcentaje',    10,          null,           3, 'ambas'),
  ('Cafeina anhidra',              'porcentaje',     1,          null,           4, 'ambas'),
  ('Arcilla blanca',               'porcentaje',    10,          null,           5, 'ambas'),
  ('Cafe molido',                  'porcentaje',    10,          null,           6, 'ambas'),
  ('Aceite almendras c/ cannabis', 'porcentaje',     5,          null,           7, 'ambas'),
  ('Alcohol cetilico',             'porcentaje',     5,          null,           8, 'ambas'),
  ('Envase Shampoo Cafe',          'cantidad_fija', null,           1,           9, 'ambas'),
  ('Etiqueta Shampoo Cafe',        'cantidad_fija', null,           1,          10, 'solo_elysium')
) v(nombre, modo, pct, fija, orden, ap)
join insumos i on i.nombre = v.nombre
on conflict (tamano_id, insumo_id) do nothing;

-- Productos que ejercitan los casos de borde
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, cantidad_fija)
select t.id, i.id, 'porcentaje'::modo_composicion, v.pct, null::numeric
from tamanos t
join productos p on p.id = t.producto_id
join (values
  ('Balsamo test',    'Resina',           10::numeric),
  ('Balsamo test',    'Alcohol cetilico',  5),
  ('Test sin precio', 'SCI',              50),
  ('Test sin precio', 'MP sin precio',    20),
  ('Test ciclo',      'Ciclo A',         100)
) v(prod, ins, pct) on v.prod = p.nombre
join insumos i on i.nombre = v.ins
on conflict (tamano_id, insumo_id) do nothing;

-- ------------------------------------------------------------------- personas
-- Existen desde el alta; lo que falta son los dos roles de persona, que no se
-- eligen al registrarse: los pone Johanna cuando sabe quién es quién.
update personas set es_revendedor = true, es_productor = true
where perfil_id = '22222222-2222-4222-8222-222222222222';

-- --------------------------------------------------- lotes: los tres resultados
insert into lotes (codigo, fecha, tamano_id, unidades_planificadas,
                   responsable_persona_id)
select v.cod, date '2026-02-10', t.id, 200,
       (select id from personas where nombre = 'Sofia')
from tamanos t join productos p on p.id = t.producto_id and p.nombre = 'Shampoo Cafe'
cross join (values ('L-OK'), ('L-DESC'), ('L-REPRO')) v(cod)
on conflict (codigo) do nothing;

select lote_planificar(id) from lotes where codigo in ('L-OK','L-DESC','L-REPRO');
select cerrar_lote(id, 'ok'::resultado_lote,        200) from lotes where codigo = 'L-OK';
select cerrar_lote(id, 'descarte'::resultado_lote,  200) from lotes where codigo = 'L-DESC';
select cerrar_lote(id, 'reproceso'::resultado_lote, 150) from lotes where codigo = 'L-REPRO';

-- ------------------------------------------------------------------- recuento
insert into recuentos (fecha, ubicacion_id, notas)
select date '2026-03-01', id, 'Recuento fisico de prueba' from ubicaciones where nombre = 'Cajon';

insert into recuento_lineas (recuento_id, tamano_id, cantidad_contada)
select r.id, t.id, 338
from recuentos r
cross join tamanos t
join productos p on p.id = t.producto_id and p.nombre = 'Shampoo Cafe'
where r.notas = 'Recuento fisico de prueba';

select recuento_confirmar(id) from recuentos where notas = 'Recuento fisico de prueba';

-- ------------------------------------------------------ ventas, pagos y gastos
insert into ventas (tipo, fecha, persona_id, estado)
select 'directa', v.f, p.id, 'borrador'
from personas p, (values (date '2026-03-01'), (date '2026-03-10'), (date '2026-03-20')) v(f)
where p.nombre = 'Sofia';

insert into venta_lineas (venta_id, tamano_id, cantidad)
select v.id, t.id,
       case v.fecha when date '2026-03-01' then 2 when date '2026-03-10' then 3 else 1 end
from ventas v
cross join tamanos t
join productos p on p.id = t.producto_id and p.nombre = 'Shampoo Cafe'
where v.persona_id = (select id from personas where nombre = 'Sofia');

select confirmar_venta(id) from ventas
where persona_id = (select id from personas where nombre = 'Sofia')
order by fecha;

-- Pago parcial: $15.000 sobre $27.000. FIFO cancela de la más vieja a la más nueva.
insert into pagos (persona_id, fecha, monto)
select id, date '2026-03-25', 15000 from personas where nombre = 'Sofia';
select imputar_pago_fifo(id) from pagos where fecha = date '2026-03-25';

-- Entrega para reventa impaga: da algo que mostrar en la banda de deuda.
insert into ventas (tipo, fecha, persona_id, estado)
select 'entrega_reventa', date '2026-04-02', id, 'borrador'
from personas where nombre = 'Sofia';

insert into venta_lineas (venta_id, tamano_id, cantidad)
select v.id, t.id, 2
from ventas v
cross join tamanos t
join productos p on p.id = t.producto_id and p.nombre = 'Shampoo Cafe'
where v.fecha = date '2026-04-02';

select confirmar_venta(id) from ventas where fecha = date '2026-04-02';

-- Gasto que alimenta el stock de insumo: 5 kg de SCI = 5000 g
insert into gastos (fecha, tipo, insumo_id, descripcion, cantidad, costo_unitario, total, proveedor_id)
select date '2026-03-05', 'materia_prima', i.id, 'Compra 5 kg SCI', 5000, 25.299, 126495,
       (select id from proveedores where nombre = 'Aromas del Sur')
from insumos i where i.nombre = 'SCI';
