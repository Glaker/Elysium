import { Box, Group, Stack, Text } from '@mantine/core';

import type { Deuda } from '@/components/deuda';
import { fecha as fmtFecha, plata } from '@/lib/formato';

/**
 * §10: ver lo que debe es uno de los dos motivos por los que existe la cuenta.
 * Por eso está arriba de todo y visible desde todas las vistas, no en una
 * pantalla aparte. Si no debe nada, no ocupa lugar.
 *
 * El detalle va desplegado y no plegado: son dos o tres líneas, y esconderlas
 * detrás de un toque convertía la respuesta ("¿cuánto debo y de cuándo?") en
 * otra pregunta. El número va en ámbar porque es lo que espera acción, no en
 * cian, que en esta app es el color de lo que se toca.
 *
 * No trae contenedor propio: la banda es la misma en el teléfono y en el
 * escritorio, pero el ancho de la columna lo decide el shell, que en pc es una
 * barra lateral y no una columna angosta centrada.
 */
export function BandaDeuda({ deuda }: { deuda: Deuda | null }) {
  if (!deuda || deuda.total <= 0) return null;

  return (
    <Box
      p="md"
      style={{
        position: 'relative',
        borderRadius: 14,
        background: 'var(--ely-superficie-alta)',
        border: '1px solid var(--ely-borde)',
      }}
    >
      <Group justify="space-between" align="baseline" wrap="nowrap">
        <Text className="rotulo" c="advertencia.4">
          Debés
        </Text>
        <Text fz={11} c="var(--ely-texto-2)">
          {deuda.ventas} {deuda.ventas === 1 ? 'entrega impaga' : 'entregas impagas'}
        </Text>
      </Group>

      <Text className="display" fz={38} fw={800} lh={1.1} mt={4} c="advertencia.2">
        {plata(deuda.total)}
      </Text>

      <Stack gap={6} mt={12} pt={11} style={{ borderTop: '1px solid var(--ely-borde)' }}>
        {deuda.detalle.map((d) => (
          <Group key={d.fecha + d.saldo} justify="space-between" wrap="nowrap">
            <Text fz={13} c="var(--ely-texto-2)">
              {fmtFecha(d.fecha)}
            </Text>
            <Text fz={13} className="tabular" c="#cbc5d6">
              {plata(d.saldo)}
            </Text>
          </Group>
        ))}
        <Text fz={11} c="var(--ely-texto-3)" mt={3}>
          Lo que pagues se aplica primero a la más vieja.
        </Text>
      </Stack>
    </Box>
  );
}
