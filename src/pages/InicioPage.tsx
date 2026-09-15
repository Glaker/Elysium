import { Alert, Box, Group, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/app/useAuth';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  type EstadoSolicitud,
  type TipoSolicitud,
} from '@/features/solicitudes/api';
import { fecha as fmtFecha } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type Pedido = { id: string; fecha: string; tipo: TipoSolicitud; estado: EstadoSolicitud };

const COLOR_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'var(--mantine-color-advertencia-4)',
  aprobada: 'var(--mantine-color-cian-4)',
  rechazada: 'var(--ely-texto-2)',
  cancelada: 'var(--ely-texto-2)',
};

/**
 * La primera pantalla de quien entra con su cuenta.
 *
 * La deuda no se repite acá: vive en la banda del shell, arriba de todo y en
 * todas las vistas (§10). Lo que falta cuando ya la vio es "¿y mi pedido?" —la
 * única pregunta que antes no tenía pantalla— y por dónde seguir. Nada más: si
 * esto crece a un tablero, dejó de ser una app para responder tres preguntas.
 */
export function InicioPage() {
  const { perfil, persona } = useAuth();
  const navigate = useNavigate();

  const pedidos = useAsync<Pedido[]>(async () => {
    if (!persona) return [];
    const { data, error } = await supabase
      .from('solicitudes')
      .select('id, fecha, tipo, estado')
      .eq('persona_id', persona.id)
      .order('fecha', { ascending: false })
      .limit(4);
    if (error) throw new Error(error.message);
    return (data ?? []) as Pedido[];
  }, [persona?.id]);

  const secciones = [
    { a: '/productos', texto: 'Productos', pie: 'El catálogo con tu precio' },
    ...(perfil?.rol === 'admin' || persona?.esProductor
      ? [
          {
            a: '/materia-prima',
            texto: 'Materia prima',
            pie: 'Cuánto insumo pedir para fabricar',
          },
        ]
      : []),
  ];

  return (
    <Stack gap={28}>
      <Box>
        <Text className="rotulo">Hola</Text>
        <Text className="display" fz={30} fw={800} lh={1.15} mt={2}>
          {perfil?.nombre ?? 'Hola'}
        </Text>
      </Box>

      <Stack gap={0}>
        {secciones.map((s, i) => (
          <UnstyledButton
            key={s.a}
            onClick={() => navigate(s.a)}
            py={16}
            style={{
              borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Box>
                <Text fz={16} fw={600}>
                  {s.texto}
                </Text>
                <Text fz={12} c="var(--ely-texto-2)" mt={2}>
                  {s.pie}
                </Text>
              </Box>
              <IconChevronRight size={17} color="var(--ely-texto-3)" />
            </Group>
          </UnstyledButton>
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
              <Skeleton key={i} h={30} radius="sm" />
            ))}
          </Stack>
        ) : pedidos.datos?.length ? (
          <Stack gap={0}>
            {pedidos.datos.map((p, i) => (
              <Group
                key={p.id}
                justify="space-between"
                wrap="nowrap"
                py={12}
                style={{
                  borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
                }}
              >
                <Box>
                  <Text fz={14} fw={500}>
                    {ETIQUETA_TIPO[p.tipo]}
                  </Text>
                  <Text fz={12} c="var(--ely-texto-2)" mt={1}>
                    {fmtFecha(p.fecha)}
                  </Text>
                </Box>
                <Text fz={13} fw={600} c={COLOR_ESTADO[p.estado]}>
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
