import { Group, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangleFilled } from '@tabler/icons-react';

export type TonoIncompleto = 'advertencia' | 'error';

type Props = {
  /** Qué es lo que falta. Ej: "Costo incompleto". */
  titulo: string;
  /** Detalle de por qué falta. Se lista en el tooltip. */
  faltantes?: string[] | null;
  /** `error` para lo que está roto (un ciclo), `advertencia` para lo que falta. */
  tono?: TonoIncompleto;
};

/**
 * La única representación de un valor desconocido en toda la app.
 *
 * Un desconocido **nunca** es un cero ni una raya suelta: es una raya gris con
 * ícono de advertencia y un tooltip que dice qué falta. El backend está
 * construido para propagar desconocidos en vez de anularlos
 * (MODELO §3: nada de `COALESCE(precio, 0)`), y esta es la contraparte visual
 * de esa decisión.
 */
export function DatoIncompleto({ titulo, faltantes, tono = 'advertencia' }: Props) {
  const detalle = faltantes?.length ? `${titulo}: ${faltantes.join(', ')}` : titulo;

  return (
    <Tooltip label={detalle} multiline maw={320} position="top-start">
      <Group
        component="span"
        display="inline-flex"
        gap={5}
        wrap="nowrap"
        w="fit-content"
        style={{ cursor: 'help', verticalAlign: 'middle' }}
      >
        <Text c="dimmed" span aria-label={detalle}>
          —
        </Text>
        <IconAlertTriangleFilled
          size={13}
          style={{ color: `var(--mantine-color-${tono}-5)`, display: 'block' }}
        />
      </Group>
    </Tooltip>
  );
}
