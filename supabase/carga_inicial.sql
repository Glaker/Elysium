-- =============================================================================
-- Elysium — carga inicial del catálogo (una sola vez)
--
-- Sale del Excel `Producción.xlsx` vía los CSV de `CARGA-INICIAL.md`, que
-- documenta qué quedó afuera y por qué. Esto NO es una migración: es el dato de
-- arranque de Johanna, y por eso vive aparte y se corre a mano.
--
-- Es idempotente: cada bloque inserta solo lo que falta, comparando por nombre.
-- Correrlo dos veces no duplica nada y no pisa lo que se haya editado desde la
-- app.
--
-- Lo que NO trae, a propósito (ver CARGA-INICIAL.md):
--   * Envases y etiquetas: en el Excel están hardcodeados por producto y con
--     valores distintos entre hojas. Decidir si son un insumo por producto o uno
--     genérico es una pregunta para Johanna.
--   * Seis insumos sin precio: tres estaban en 0 (que no es un precio) y tres
--     son MP producidas cuyo costo lo resuelve `costo_insumo` con su composición.
--   * Ocho productos sin fórmula: sus hojas están rotas o mezclan el producto con
--     su MP intermedia. El producto y su tamaño sí se cargan: existe, con el
--     costo incompleto.
-- =============================================================================

begin;

-- ------------------------------------------------------------ proveedores
insert into proveedores (nombre, link) select 'ALKIAROM', null
where not exists (select 1 from proveedores where nombre = 'ALKIAROM');
insert into proveedores (nombre, link) select 'BAZARLATAM', null
where not exists (select 1 from proveedores where nombre = 'BAZARLATAM');
insert into proveedores (nombre, link) select 'BELVEDERE TIENDA', null
where not exists (select 1 from proveedores where nombre = 'BELVEDERE TIENDA');
insert into proveedores (nombre, link) select 'ECOMODICO', null
where not exists (select 1 from proveedores where nombre = 'ECOMODICO');
insert into proveedores (nombre, link) select 'EIFFEL QUIMICA', 'https://www.eiffelquimica.com'
where not exists (select 1 from proveedores where nombre = 'EIFFEL QUIMICA');
insert into proveedores (nombre, link) select 'FARMACIA FOREST', null
where not exists (select 1 from proveedores where nombre = 'FARMACIA FOREST');
insert into proveedores (nombre, link) select 'HOPEMAX', null
where not exists (select 1 from proveedores where nombre = 'HOPEMAX');
insert into proveedores (nombre, link) select 'JERONIMO', null
where not exists (select 1 from proveedores where nombre = 'JERONIMO');
insert into proveedores (nombre, link) select 'LUVIK', null
where not exists (select 1 from proveedores where nombre = 'LUVIK');
insert into proveedores (nombre, link) select 'NAMECO', 'https://tienda.nameco.com.ar'
where not exists (select 1 from proveedores where nombre = 'NAMECO');
insert into proveedores (nombre, link) select 'NATURAL WHEY SUPLEMENTOS', 'https://naturalwheysuplementos.com'
where not exists (select 1 from proveedores where nombre = 'NATURAL WHEY SUPLEMENTOS');
insert into proveedores (nombre, link) select 'PARVATI', 'https://www.psyn.com.ar'
where not exists (select 1 from proveedores where nombre = 'PARVATI');
insert into proveedores (nombre, link) select 'PURA QUÍMICA', 'https://puraquimica.com.ar'
where not exists (select 1 from proveedores where nombre = 'PURA QUÍMICA');
insert into proveedores (nombre, link) select 'QUIMICA KYMEL', null
where not exists (select 1 from proveedores where nombre = 'QUIMICA KYMEL');

-- ---------------------------------------------------------------- insumos
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite de almendras', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/aceite-de-almendras-prens-frio-1-litro-uso-cosmetico/p/MLA37873292?pdp_filters=item_id%3AMLA1434538259&matt_tool=89488245&ua=8OTmD0hnr6-cXoez9I75LnW4l9p4JCHSoUffg1NDRGJ8Yg#origin=share&sid=share&wid=MLA1434538259&action=copy'
where not exists (select 1 from insumos where nombre = 'Aceite de almendras');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite de almendras c/ cannabis', 'l'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Aceite de almendras c/ cannabis');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite de coco', 'l'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/aceite-de-coco-neutro-1-litro/p/MLA60734981?pdp_filters=item_id%3AMLA2481005726&matt_tool=89488245#origin=share&sid=share&wid=MLA2481005726&action=copy'
where not exists (select 1 from insumos where nombre = 'Aceite de coco');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial Alcanfor', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'EIFFEL QUIMICA'), 'https://www.eiffelquimica.com/productos/esencia-de-alcanfor-grado-cosmetico/'
where not exists (select 1 from insumos where nombre = 'Aceite esencial Alcanfor');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial de castaña', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Aceite esencial de castaña');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial de romero', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://tienda.nameco.com.ar/productos/Aceite-Esencial-Romero-Puro/'
where not exists (select 1 from insumos where nombre = 'Aceite esencial de romero');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial Eucalipto', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://tienda.nameco.com.ar/productos/Esencia-Eucalipto/'
where not exists (select 1 from insumos where nombre = 'Aceite esencial Eucalipto');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial Mandarina', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://tienda.nameco.com.ar/productos/Esencia-Mandarina/'
where not exists (select 1 from insumos where nombre = 'Aceite esencial Mandarina');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial Mentol', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://tienda.nameco.com.ar/productos/Esencia-Menta/'
where not exists (select 1 from insumos where nombre = 'Aceite esencial Mentol');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite esencial Tomillo', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/aceite-esencial-tomillo-puro--100-ml/up/MLAU239897782?pdp_filters=item_id%3AMLA1312476392#origin%3Dshare%26sid%3Dshare%26wid%3DMLA1312476392'
where not exists (select 1 from insumos where nombre = 'Aceite esencial Tomillo');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Acido cítrico', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Acido cítrico');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Acido hialurónico APM', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Acido hialurónico APM');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Acido hialurónico BPM', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Acido hialurónico BPM');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Agua destilada', 'l'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'QUIMICA KYMEL'), 'https://www.mercadolibre.com.ar/up/MLAU238817283?matt_tool=89488245&pdp_filters=item_id:MLA1401333155&ua=1c2UxC8U61BEFkh2grGtQdeCkAvm1SjGgOXkvGwZi2tERQ#origin=share&sid=share&wid=MLA1401333155&action=copy'
where not exists (select 1 from insumos where nombre = 'Agua destilada');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Alcohol cetílico', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/alcohol-cetilico--emulsionante-natural--1-kg/up/MLAU264171215?pdp_filters=item_id%3AMLA926183058&matt_tool=89488245#origin=share&sid=share&wid=MLA926183058&action=copy'
where not exists (select 1 from insumos where nombre = 'Alcohol cetílico');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Alcohol etílico', 'l'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'HOPEMAX'), 'https://www.mercadolibre.com.ar/up/MLAU238737183?matt_tool=89488245&pdp_filters=item_id:MLA1315362086&ua=jXH_Sf5gqu9TKKI-ycDNNAdItyxgw_Iq6SwUu5VndDojXA#origin=share&sid=share&wid=MLA1315362086&action=copy'
where not exists (select 1 from insumos where nombre = 'Alcohol etílico');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Almidón', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'LUVIK'), 'https://www.mercadolibre.com.ar/almidon-de-maiz-maizena-clasica-sin-tacc-500-g/p/MLA30481730?pdp_filters=item_id%3AMLA2066174074&matt_tool=89488245#origin=share&sid=share&wid=MLA2066174074&action=copy'
where not exists (select 1 from insumos where nombre = 'Almidón');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Arcilla Bentonita', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'PURA QUÍMICA'), 'https://puraquimica.com.ar/producto/bentonita-arcilla-beige-x-kg/'
where not exists (select 1 from insumos where nombre = 'Arcilla Bentonita');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Arcilla Blanca', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/arcilla-blanca-caolin-1-kg-uso-cosmetico/p/MLA37680992?pdp_filters=item_id%3AMLA1852412406&matt_tool=89488245#origin=share&sid=share&wid=MLA1852412406&action=copy'
where not exists (select 1 from insumos where nombre = 'Arcilla Blanca');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Benzoato de sodio', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/benzoato-de-sodio--conservante--1-kg/up/MLAU2747861897?pdp_filters=item_id%3AMLA1957737570&matt_tool=89488245#origin=share&sid=share&wid=MLA1957737570&action=copy'
where not exists (select 1 from insumos where nombre = 'Benzoato de sodio');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Betaina de coco', 'l'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/betaina-de-coco-1-litro/p/MLA40991076?pdp_filters=item_id%3AMLA1451182531&matt_tool=89488245#origin=share&sid=share&wid=MLA1451182531&action=copy'
where not exists (select 1 from insumos where nombre = 'Betaina de coco');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Café molido', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'ECOMODICO'), 'https://www.mercadolibre.com.ar/p/MLA19979553?matt_tool=89488245&pdp_filters=item_id:MLA1286549834&ua=PTssJc4TeJzNT_QFX3jVMzNtrCVU12Ir-h5etfJkNxcKig#origin=share&sid=share&wid=MLA1286549834&action=copy'
where not exists (select 1 from insumos where nombre = 'Café molido');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Cafeína anhidra', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'PARVATI'), 'https://www.psyn.com.ar/productos/cafeina-anhidra/'
where not exists (select 1 from insumos where nombre = 'Cafeína anhidra');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Cera de abeja', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/cera-de-abejas-virgen-1-kg/p/MLA40376820?pdp_filters=item_id%3AMLA1448440637&matt_tool=89488245#origin=share&sid=share&wid=MLA1448440637&action=copy'
where not exists (select 1 from insumos where nombre = 'Cera de abeja');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'CMC', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/cmc-carboximetilcelulosa--espesante--1-kg/up/MLAU217635306?pdp_filters=item_id%3AMLA1133754137&matt_tool=89488245#origin=share&sid=share&wid=MLA1133754137&action=copy'
where not exists (select 1 from insumos where nombre = 'CMC');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Euxyl PE 9010', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/euxyl-pe-9010--conservante--1-litro/up/MLAU410782956?pdp_filters=item_id%3AMLA1851141446&matt_tool=89488245#origin=share&sid=share&wid=MLA1851141446&action=copy'
where not exists (select 1 from insumos where nombre = 'Euxyl PE 9010');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Filtro de café', 'kg'::unidad_insumo, 'otro'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'BAZARLATAM'), 'https://www.mercadolibre.com.ar/filtros-papel-cafe-n4-pack-x100-cafetera-electrica-domestic/p/MLA36622557?pdp_filters=item_id%3AMLA2899581554&matt_tool=89488245#origin=share&sid=share&wid=MLA2899581554&action=copy'
where not exists (select 1 from insumos where nombre = 'Filtro de café');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Flores de Jeronimo', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'JERONIMO'), null
where not exists (select 1 from insumos where nombre = 'Flores de Jeronimo');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Gel aloe vera', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'EIFFEL QUIMICA'), 'https://www.mercadolibre.com.ar/gel-aloe-vera-puro-1-litro-mat-prima-cosmetica/p/MLA53962096?pdp_filters=item_id%3AMLA2260501332&matt_tool=89488245#origin=share&sid=share&wid=MLA2260501332&action=copy'
where not exists (select 1 from insumos where nombre = 'Gel aloe vera');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Glicerina líquida vegetal', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/glicerina-liquida-vegetal-1-litro-uso-cosmetico/p/MLA37677600?pdp_filters=item_id%3AMLA1433638801&matt_tool=89488245#origin=share&sid=share&wid=MLA1433638801&action=copy'
where not exists (select 1 from insumos where nombre = 'Glicerina líquida vegetal');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Goma Xántica', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/goma-xantica-espesante-500-gr/p/MLA42239194?pdp_filters=item_id%3AMLA1456803903&matt_tool=89488245#origin=share&sid=share&wid=MLA1456803903&action=copy'
where not exists (select 1 from insumos where nombre = 'Goma Xántica');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Harina de avena', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'BELVEDERE TIENDA'), 'https://www.mercadolibre.com.ar/harina-de-avena-x-1-kg/up/MLAU226143962?pdp_filters=item_id%3AMLA1215455553#origin%3Dshare%26sid%3Dshare%26wid%3DMLA1215455553'
where not exists (select 1 from insumos where nombre = 'Harina de avena');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Hidrolato de CBD', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Hidrolato de CBD');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Jeringa 10ml', 'unidad'::unidad_insumo, 'otro'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'FARMACIA FOREST'), 'https://www.mercadolibre.com.ar/coronet-jeringa-10-ml-100-pack-100-1/p/MLA26365072?product_trigger_id=MLA28298992&pdp_filters=item_id%3AMLA1394764567&applied_product_filters=MLA26365072&from=gshop&picker=true&matt_tool=38087446&quantity=1'
where not exists (select 1 from insumos where nombre = 'Jeringa 10ml');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Jugo de Aloe Vera', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Jugo de Aloe Vera');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Lecitina de soja granulada', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NATURAL WHEY SUPLEMENTOS'), 'https://naturalwheysuplementos.com/producto/lecitina-de-soja-granular-premium/'
where not exists (select 1 from insumos where nombre = 'Lecitina de soja granulada');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Manteca de karite', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/manteca-de-karite-pura-1-kg-uso-cosmetico/p/MLA37680011?pdp_filters=item_id%3AMLA1435379849&matt_tool=89488245#origin=share&sid=share&wid=MLA1435379849&action=copy'
where not exists (select 1 from insumos where nombre = 'Manteca de karite');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Niacinamida', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://tienda.nameco.com.ar/productos/Niacinamida/'
where not exists (select 1 from insumos where nombre = 'Niacinamida');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Pantenol', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'PURA QUÍMICA'), 'https://puraquimica.com.ar/producto/pantenol-d-liquido-98-x-kg/'
where not exists (select 1 from insumos where nombre = 'Pantenol');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Q10', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Q10');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Resina', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'producido'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Resina');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Sal de mesa', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'LUVIK'), 'https://www.mercadolibre.com.ar/celusal-sal-fina-paquete-500-grs/p/MLA19940626#polycard_client=search_best-seller-categories&tracking_id=79b1f7d2-0aee-4333-80f9-5ee3b607bba4&wid=MLA1559008726&sid=search'
where not exists (select 1 from insumos where nombre = 'Sal de mesa');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'SCI', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/tensioactivo-sci-polvo-1-kg-formulacion-shampu-solido/p/MLA20017504?pdp_filters=item_id%3AMLA1372003230&matt_tool=89488245#origin=share&sid=share&wid=MLA1372003230&action=copy'
where not exists (select 1 from insumos where nombre = 'SCI');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'SCS', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/tensioactivo-scs-1-kg/p/MLA54837137?pdp_filters=item_id%3AMLA2325992978&matt_tool=89488245#origin=share&sid=share&wid=MLA2325992978&action=copy'
where not exists (select 1 from insumos where nombre = 'SCS');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Sericina', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Sericina');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Sorbato de potasio', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Sorbato de potasio');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Vitamina E', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/vitamina-e-alfa-tocoferol-1-litro/p/MLA56993701?pdp_filters=item_id%3AMLA2380232572&matt_tool=89488245#origin=share&sid=share&wid=MLA2380232572&action=copy'
where not exists (select 1 from insumos where nombre = 'Vitamina E');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'BTMS', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'NAMECO'), 'https://www.mercadolibre.com.ar/btms-80--1-kg--formulacion-acondicionador-solido/up/MLAU263263333?pdp_filters=item_id%3AMLA926182664&matt_tool=89488245#origin=share&sid=share&wid=MLA926182664&action=copy'
where not exists (select 1 from insumos where nombre = 'BTMS');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Alcohol Ceto Estearilico', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'PURA QUÍMICA'), 'https://www.mercadolibre.com.ar/alcohol-ceto-estearilico--emulsionante--1-kg/up/MLAU295428937?pdp_filters=item_id%3AMLA926979590&matt_tool=89488245#origin=share&sid=share&wid=MLA926979590&action=copy'
where not exists (select 1 from insumos where nombre = 'Alcohol Ceto Estearilico');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Oleato de jarilla', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'producido'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Oleato de jarilla');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Extracto alcoglicerinado de jarilla', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'producido'::origen_insumo, null, null
where not exists (select 1 from insumos where nombre = 'Extracto alcoglicerinado de jarilla');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Jarilla', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'ALKIAROM'), null
where not exists (select 1 from insumos where nombre = 'Jarilla');
insert into insumos (nombre, unidad, tipo, origen, proveedor_id, link)
select 'Aceite de jojoba', 'kg'::unidad_insumo, 'materia_prima'::tipo_insumo,
       'comprado'::origen_insumo, (select id from proveedores where nombre = 'PURA QUÍMICA'), 'https://puraquimica.com.ar/producto/aceite-jojoba-golden-organico-x-kg-cosmetica-natural-2/'
where not exists (select 1 from insumos where nombre = 'Aceite de jojoba');

-- ---------------------------------------------------------------- precios
-- Un insumo sin precio NO lleva fila: es la diferencia entre "no sé" y "sale
-- nada" (§4). Los tres en dólares se guardan en dólares — el tipo de cambio es
-- el parámetro `tipo_cambio_usd`, y guardar el peso derivado congelaría una
-- conversión que después nadie podría rehacer.
-- `verificado_en` nulo = el Excel nunca registró cuándo se verificó.
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 20760, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite de almendras'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 72212.14, 'ARS'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite de almendras c/ cannabis'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 17300, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite de coco'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 76860, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial Alcanfor'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 2475100, 'ARS'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial de castaña'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 275040.6, 'ARS'::moneda, '2025-11-13', '2025-11-13', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial de romero'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 47111.35, 'ARS'::moneda, '2025-11-13', '2025-11-13', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial Eucalipto'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 76000, 'ARS'::moneda, '2026-03-25', '2026-03-25', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial Mandarina'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 76000, 'ARS'::moneda, '2026-03-25', '2026-03-25', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial Mentol'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 213411.4, 'ARS'::moneda, '2026-03-25', '2026-03-25', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite esencial Tomillo'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 1.55, 'USD'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Acido cítrico'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 1035, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Agua destilada'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 14830, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Alcohol cetílico'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 3400, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Alcohol etílico'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 8398, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Almidón'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 2222, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Arcilla Bentonita'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 4530, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Arcilla Blanca'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 16999, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Benzoato de sodio'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 7830, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Betaina de coco'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 26235, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Café molido'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 99700, 'ARS'::moneda, '2026-09-01', '2026-09-01', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Cafeína anhidra'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 29299, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Cera de abeja'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 39999, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'CMC'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 86999, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Euxyl PE 9010'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 216.35, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Filtro de café'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 3000, 'ARS'::moneda, '2025-10-12', '2025-10-12', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Flores de Jeronimo'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 39659.65, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Gel aloe vera'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 8099, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Glicerina líquida vegetal'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 20798, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Goma Xántica'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 4799, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Harina de avena'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 68, 'USD'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Hidrolato de CBD'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 152.32, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Jeringa 10ml'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 104919, 'ARS'::moneda, '2025-10-12', '2025-10-12', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Lecitina de soja granulada'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 26299, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Manteca de karite'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 122419.76, 'ARS'::moneda, '2025-10-10', '2025-10-10', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Niacinamida'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 61033.45, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Pantenol'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 3107700, 'ARS'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Q10'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 2998, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Sal de mesa'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 25299, 'ARS'::moneda, '2026-06-29', '2026-06-29', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'SCI'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 22899, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'SCS'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 275000, 'ARS'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Sericina'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 4.8, 'USD'::moneda, current_date, null, 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Sorbato de potasio'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 153499, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Vitamina E'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 81899, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'BTMS'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 15199, 'ARS'::moneda, '2026-05-27', '2026-05-27', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Alcohol Ceto Estearilico'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 48420, 'ARS'::moneda, '2025-10-23', '2025-10-23', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Jarilla'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);
insert into insumo_precios (insumo_id, precio, moneda, vigente_desde, verificado_en, fuente)
select i.id, 62259.89, 'ARS'::moneda, '2025-11-17', '2025-11-17', 'Carga inicial desde el Excel'
from insumos i where i.nombre = 'Aceite de jojoba'
  and not exists (select 1 from insumo_precios p where p.insumo_id = i.id);

-- ------------------------------------------------------- productos y tamaños
-- Un producto agrupa; el tamaño es lo que se stockea, se vende y tiene precio.
-- Cada producto del Excel tiene un solo tamaño.
insert into productos (nombre) select 'Balsamos'
where not exists (select 1 from productos where nombre = 'Balsamos');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 30, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Balsamos'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 30 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Descongestivo'
where not exists (select 1 from productos where nombre = 'Descongestivo');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 30, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Descongestivo'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 30 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Contorno de ojos'
where not exists (select 1 from productos where nombre = 'Contorno de ojos');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 10, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Contorno de ojos'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 10 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Hialuronico'
where not exists (select 1 from productos where nombre = 'Hialuronico');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 20, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Hialuronico'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Niacinamida'
where not exists (select 1 from productos where nombre = 'Niacinamida');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 20, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Niacinamida'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Repelentes'
where not exists (select 1 from productos where nombre = 'Repelentes');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 100, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Repelentes'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 100 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'S bentonita'
where not exists (select 1 from productos where nombre = 'S bentonita');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 75, 'g'::unidad_tamano from productos pr
where pr.nombre = 'S bentonita'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 75 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'S cafe'
where not exists (select 1 from productos where nombre = 'S cafe');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 75, 'g'::unidad_tamano from productos pr
where pr.nombre = 'S cafe'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 75 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'S coco'
where not exists (select 1 from productos where nombre = 'S coco');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 75, 'g'::unidad_tamano from productos pr
where pr.nombre = 'S coco'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 75 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Crema Sericina'
where not exists (select 1 from productos where nombre = 'Crema Sericina');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 50, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Crema Sericina'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Crema Q10'
where not exists (select 1 from productos where nombre = 'Crema Q10');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 125, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Crema Q10'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Espuma facial'
where not exists (select 1 from productos where nombre = 'Espuma facial');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 15, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Espuma facial'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 15 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Acondicionador'
where not exists (select 1 from productos where nombre = 'Acondicionador');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 30, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Acondicionador'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 30 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Tonico capilar'
where not exists (select 1 from productos where nombre = 'Tonico capilar');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 20, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Tonico capilar'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Jabon Liquido'
where not exists (select 1 from productos where nombre = 'Jabon Liquido');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 20, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Jabon Liquido'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 20 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Gel post solar'
where not exists (select 1 from productos where nombre = 'Gel post solar');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 125, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Gel post solar'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano);
insert into productos (nombre) select 'Espuma de afeitar'
where not exists (select 1 from productos where nombre = 'Espuma de afeitar');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 30, 'g'::unidad_tamano from productos pr
where pr.nombre = 'Espuma de afeitar'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 30 and t.unidad = 'g'::unidad_tamano);
insert into productos (nombre) select 'Aceite masaje'
where not exists (select 1 from productos where nombre = 'Aceite masaje');
insert into tamanos (producto_id, magnitud, unidad)
select pr.id, 125, 'ml'::unidad_tamano from productos pr
where pr.nombre = 'Aceite masaje'
  and not exists (select 1 from tamanos t where t.producto_id = pr.id
                  and t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano);

-- ---------------------------------------------------------------- fórmulas
-- En porcentaje del contenido del tamaño (§3.1). Los porcentajes se cargan tal
-- cual: el Shampoo Café suma 101% y no es un error de tipeo — la app avisa, no
-- corrige. Corregirlos es decisión de Johanna.
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 75.5, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Aceite de almendras'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 13.5, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Cera de abeja'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 6.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Manteca de karite'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Vitamina E'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Aceite esencial Eucalipto'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 2.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Aceite esencial Alcanfor'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Aceite esencial Mentol'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Descongestivo'
join insumos i on i.nombre = 'Aceite esencial Tomillo'
where t.magnitud = 30 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 86.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Contorno de ojos'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 10 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Contorno de ojos'
join insumos i on i.nombre = 'Hidrolato de CBD'
where t.magnitud = 10 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 3.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Contorno de ojos'
join insumos i on i.nombre = 'Cafeína anhidra'
where t.magnitud = 10 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Contorno de ojos'
join insumos i on i.nombre = 'Euxyl PE 9010'
where t.magnitud = 10 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 80.5, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Hidrolato de CBD'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Niacinamida'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 3.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Glicerina líquida vegetal'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Euxyl PE 9010'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Goma Xántica'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.05, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Niacinamida'
join insumos i on i.nombre = 'Aceite esencial de romero'
where t.magnitud = 20 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 30.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'SCI'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 30.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'SCS'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Betaina de coco'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Cafeína anhidra'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Arcilla Blanca'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Café molido'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Aceite de almendras c/ cannabis'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S cafe'
join insumos i on i.nombre = 'Alcohol cetílico'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 60.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'SCI'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'Betaina de coco'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 8.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'Aceite de coco'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 8.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'Arcilla Blanca'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 7.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'Alcohol cetílico'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 7.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'S coco'
join insumos i on i.nombre = 'Almidón'
where t.magnitud = 75 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 34.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'SCI'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 16.5, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Arcilla Blanca'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 16.5, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Alcohol cetílico'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 16.5, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Manteca de karite'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 10.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Harina de avena'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 6.7, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Betaina de coco'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.1, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Aceite de almendras c/ cannabis'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.1, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Espuma facial'
join insumos i on i.nombre = 'Aceite esencial Mandarina'
where t.magnitud = 15 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Vitamina E'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Goma Xántica'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 65.5, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Glicerina líquida vegetal'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 12.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Aceite de almendras'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 13.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Alcohol cetílico'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Euxyl PE 9010'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Aceite esencial de castaña'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 9
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Sericina'
join insumos i on i.nombre = 'Sericina'
where t.magnitud = 50 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Vitamina E'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Goma Xántica'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 66.4, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Glicerina líquida vegetal'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 12.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Aceite de almendras'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 13.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Alcohol cetílico'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Euxyl PE 9010'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Aceite esencial de romero'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.1, 9
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Crema Q10'
join insumos i on i.nombre = 'Q10'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 58.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 25.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Betaina de coco'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 14.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Glicerina líquida vegetal'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Goma Xántica'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Sorbato de potasio'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Acido cítrico'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Jabon Liquido'
join insumos i on i.nombre = 'Aceite esencial de romero'
where t.magnitud = 20 and t.unidad = 'g'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 60.0, 1
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Gel aloe vera'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 30.0, 2
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Agua destilada'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 5.0, 3
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Glicerina líquida vegetal'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 4
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Euxyl PE 9010'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 5
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Pantenol'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 6
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Niacinamida'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 7
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Aceite esencial Mentol'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 1.0, 8
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Vitamina E'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);
insert into formula_lineas (tamano_id, insumo_id, modo, porcentaje, orden)
select t.id, i.id, 'porcentaje', 0.5, 9
from tamanos t join productos pr on pr.id = t.producto_id and pr.nombre = 'Gel post solar'
join insumos i on i.nombre = 'Goma Xántica'
where t.magnitud = 125 and t.unidad = 'ml'::unidad_tamano
  and not exists (select 1 from formula_lineas fl where fl.tamano_id = t.id and fl.insumo_id = i.id);

commit;
