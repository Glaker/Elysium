import { Alert, Box, Group, Skeleton, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconBoxSeam,
  IconBuildingFactory2,
  IconChevronRight,
  IconFlask,
  type Icon,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { misLotes } from '@/features/produccion/api';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  type EstadoSolicitud,
  type TipoSolicitud,
} from '@/features/solicitudes/api';
import { diasDesde, fecha as fmtFecha } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type Pedido = {
  id: string;
  fecha: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  /** Qué se pidió, en una línea: "Shampoo 500ml ×2, Glicerina". */
  detalle: string;
};

const COLOR_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'var(--mantine-color-advertencia-4)',
  aprobada: 'var(--mantine-color-cian-4)',
  rechazada: 'var(--ely-texto-2)',
  cancelada: 'var(--ely-texto-2)',
};

type FilaTamano = {
  nombre: string | null;
  magnitud: number;
  unidad: string;
  productos: { nombre: string } | null;
} | null;

/** "Hoy" y "Ayer" antes que una fecha: un pedido se mide en días, no en calendario. */
function cuando(iso: string): string {
  const d = diasDesde(iso);
  if (d === null || d < 0 || d > 6) return fmtFecha(iso);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}

async function cargarPedidos(personaId: string | undefined): Promise<Pedido[]> {
  if (!personaId) return [];
  const { data, error } = await supabase
    .from('solicitudes')
    .select('id, fecha, tipo, estado')
    .eq('persona_id', personaId)
    .order('fecha', { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const base = (data ?? []) as Omit<Pedido, 'detalle'>[];
  if (base.length === 0) return [];

  // El renglón que faltaba: "Materia prima · 15/09" no dice qué se pidió, y esa
  // es justo la pregunta que trae a alguien a esta pantalla.
  const { data: lineas, error: e2 } = await supabase
    .from('solicitud_lineas')
    .select(
      'solicitud_id, cantidad, tamanos (nombre, magnitud, unidad, productos (nombre)), insumos (nombre)',
    )
    .in(
      'solicitud_id',
      base.map((p) => p.id),
    );
  if (e2) throw new Error(e2.message);

  const porPedido = new Map<string, string[]>();
  for (const l of (lineas ?? []) as unknown as {
    solicitud_id: string;
    cantidad: number;
    tamanos: FilaTamano;
    insumos: { nombre: string } | null;
  }[]) {
    const t = l.tamanos;
    const nombre = t
      ? `${t.productos?.nombre ?? '—'} ${t.nombre?.trim() || `${t.magnitud} ${t.unidad}`}`
      : (l.insumos?.nombre ?? '—');
    const n = Number(l.cantidad);
    const lista = porPedido.get(l.solicitud_id) ?? [];
    lista.push(n > 1 ? `${nombre} ×${n}` : nombre);
    porPedido.set(l.solicitud_id, lista);
  }

  return base.map((p) => ({
    ...p,
    detalle: porPedido.get(p.id)?.join(', ') ?? ETIQUETA_TIPO[p.tipo],
  }));
}

type Atajo = { a: string; texto: string; pie: string; icono: Icon };

/**
 * La primera pantalla de quien entra con su cuenta.
 *
 * La deuda no se repite acá: vive en la banda del shell, arriba de todo y en
 * todas las vistas (§10). Lo que queda es lo que nadie más le va a recordar:
 * una producción sin reportar —que traba el cierre del lote—, el estado de los
 * últimos pedidos, y por dónde seguir. Nada más: si esto crece a un tablero,
 * dejó de ser una app para responder tres preguntas.
 */
export function InicioPage() {
  const { perfil, persona } = useAuth();
  const produce = perfil?.rol === 'admin' || persona?.esProductor;

  const pedidos = useAsync<Pedido[]>(() => cargarPedidos(persona?.id), [persona?.id]);

  // Un lote entregado y sin resultado cargado es lo único que la app le pide a
  // la persona (además de la deuda). Si no fabrica, esta consulta no existe.
  const lotes = useAsync(async () => (produce ? misLotes() : []), [produce]);
  const sinReportar =
    lotes.datos?.filter((l) => !l.cerrado && !l.reportadoEn).length ?? 0;

  const atajos: Atajo[] = [
    {
      a: '/productos',
      texto: 'Productos',
      pie: 'El catálogo con tu precio',
      icono: IconBoxSeam,
    },
    ...(produce
      ? ([
          {
            a: '/materia-prima',
            texto: 'Materia prima',
            pie: 'Cuánto insumo pedir para fabricar',
            icono: IconFlask,
          },
          {
            a: '/produccion',
            texto: 'Producción',
            pie: 'Cargar el resultado de lo que fabricaste',
            icono: IconBuildingFactory2,
          },
        ] satisfies Atajo[])
      : []),
  ];

  return (
    <Stack gap={28}>
      <Box>
        <Text className="rotulo">Hola</Text>
        <Text className="display" fz={30} fw={800} lh={1.15} mt={2}>
          {perfil?.nombre ?? persona?.nombre ?? ''}
        </Text>
      </Box>

      {/*
        Ámbar y no rojo: un lote sin reportar no está roto, está esperando algo
        de la persona —la misma regla que la deuda (§1). Es una fila y no una
        tarjeta: la única superficie elevada de la app es la deuda (§4), y un
        segundo recuadro competía con ella. Aparece solo cuando hay algo: un
        "no tenés nada pendiente" ocupa lugar para no decir nada.
      */}
      {sinReportar > 0 && (
        <Group
          renderRoot={(props) => <Link to="/produccion" {...props} />}
          justify="space-between"
          wrap="nowrap"
          gap="md"
          className="fila-atajo"
          py={14}
          style={{
            borderTop: '1px solid var(--mantine-color-advertencia-9)',
            borderBottom: '1px solid var(--mantine-color-advertencia-9)',
            textDecoration: 'none',
          }}
        >
          <Group gap={13} wrap="nowrap">
            <IconAlertTriangle
              size={19}
              color="var(--mantine-color-advertencia-4)"
              stroke={1.7}
            />
            <Text fz={15} fw={600} c="var(--mantine-color-advertencia-4)">
              {sinReportar === 1
                ? 'Tenés una producción sin reportar'
                : `Tenés ${sinReportar} producciones sin reportar`}
            </Text>
          </Group>
          <IconChevronRight size={17} color="var(--mantine-color-advertencia-4)" />
        </Group>
      )}

      <Stack gap={0}>
        {atajos.map((s, i) => (
          // Un `Link` y no un `onClick`: se abre en otra pestaña, se copia y se
          // lee como lo que es. El ícono es el mismo de la barra lateral, así
          // que la fila y el menú se reconocen como la misma puerta.
          <Group
            key={s.a}
            renderRoot={(props) => <Link to={s.a} {...props} />}
            justify="space-between"
            wrap="nowrap"
            py={16}
            className="fila-atajo"
            style={{
              borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
              textDecoration: 'none',
            }}
          >
            <Group gap={13} wrap="nowrap">
              <s.icono size={19} stroke={1.6} color="var(--mantine-color-cian-4)" />
              <Box>
                <Text fz={16} fw={600} c="var(--ely-texto)">
                  {s.texto}
                </Text>
                <Text fz={12} c="var(--ely-texto-2)" mt={2}>
                  {s.pie}
                </Text>
              </Box>
            </Group>
            <IconChevronRight size={17} color="var(--ely-texto-3)" />
          </Group>
        ))}
      </Stack>

      <Box>
        <Text className="rotulo" mb={10}>
          Tus pedidos
        </Text>

        {pedidos.error && (
          <Alert color="error" variant="light" title="No se pudieron cargar">
            {pedidos.error}
          </Alert>
        )}

        {pedidos.cargando ? (
          <Stack gap={12}>
            {[0, 1].map((i) => (
              <Skeleton key={i} h={38} radius="sm" />
            ))}
          </Stack>
        ) : pedidos.datos?.length ? (
          <Stack gap={0}>
            {pedidos.datos.map((p, i) => (
              <Group
                key={p.id}
                justify="space-between"
                wrap="nowrap"
                gap="md"
                py={12}
                style={{
                  borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
                }}
              >
                <Box style={{ minWidth: 0 }}>
                  <Text fz={14} fw={500} lineClamp={1}>
                    {p.detalle}
                  </Text>
                  <Text fz={12} c="var(--ely-texto-2)" mt={1}>
                    {ETIQUETA_TIPO[p.tipo]} · {cuando(p.fecha)}
                  </Text>
                </Box>
                <Text
                  fz={13}
                  fw={600}
                  c={COLOR_ESTADO[p.estado]}
                  style={{ flexShrink: 0 }}
                >
                  {ETIQUETA_ESTADO[p.estado]}
                </Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text fz={13} c="var(--ely-texto-2)">
            Todavía no pediste nada. Se pide desde{' '}
            <Text component={Link} to="/productos" c="cian.4" inherit>
              Productos
            </Text>
            .
          </Text>
        )}
      </Box>
    </Stack>
  );
}
