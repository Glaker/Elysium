import {
  Box,
  Collapse,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';

import { useAuth } from '@/app/useAuth';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';
import { plata } from '@/lib/formato';

type Deuda = {
  total: number;
  ventas: number;
  detalle: { fecha: string; saldo: number }[];
};

/**
 * §10: ver lo que debe es uno de los dos motivos por los que existe la cuenta.
 * Por eso es una banda fija visible desde todas las vistas, no una pantalla
 * aparte. Si no debe nada, no ocupa lugar.
 */
export function BandaDeuda() {
  const { persona } = useAuth();
  const [abierto, setAbierto] = useState(false);

  const { datos, cargando } = useAsync<Deuda | null>(async () => {
    if (!persona) return null;
    const [{ data: total }, { data: detalle }] = await Promise.all([
      supabase
        .from('v_deuda_persona')
        .select('deuda_total, ventas_impagas')
        .eq('persona_id', persona.id)
        .maybeSingle(),
      supabase
        .from('v_deuda_venta')
        .select('fecha, saldo')
        .eq('persona_id', persona.id)
        .gt('saldo', 0)
        .order('fecha', { ascending: true }),
    ]);
    return {
      total: Number(total?.deuda_total ?? 0),
      ventas: Number(total?.ventas_impagas ?? 0),
      detalle: (detalle ?? []).map((d) => ({
        fecha: String(d.fecha),
        saldo: Number(d.saldo),
      })),
    };
  }, [persona?.id]);

  if (cargando) return <Skeleton h={44} radius={0} />;
  if (!datos || datos.total <= 0) return null;

  return (
    <Box
      style={{
        borderBottom: '1px solid var(--mantine-color-dark-4)',
        background: 'var(--mantine-color-dark-7)',
      }}
    >
      <Container size={520} px={0}>
        <UnstyledButton w="100%" px="md" py="xs" onClick={() => setAbierto((a) => !a)}>
          <Group justify="space-between" wrap="nowrap">
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={600}
              style={{ letterSpacing: 0.6 }}
            >
              Debés
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Text fw={700} size="lg" c="cian.4">
                {plata(datos.total)}
              </Text>
              <Text size="xs" c="dimmed">
                {abierto ? '▲' : '▼'}
              </Text>
            </Group>
          </Group>
        </UnstyledButton>

        <Collapse expanded={abierto}>
          <Stack gap={2} px="md" pb="sm">
            {datos.detalle.map((d) => (
              <Group key={d.fecha + d.saldo} justify="space-between">
                <Text size="sm" c="dimmed">
                  {d.fecha}
                </Text>
                <Text size="sm">{plata(d.saldo)}</Text>
              </Group>
            ))}
            <Text size="xs" c="dimmed" mt={4}>
              {datos.ventas} {datos.ventas === 1 ? 'entrega impaga' : 'entregas impagas'}.
              Los pagos se aplican de la más vieja a la más nueva.
            </Text>
          </Stack>
        </Collapse>
      </Container>
    </Box>
  );
}
