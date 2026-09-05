import { Group, Table, Text, type MantineSize } from '@mantine/core';

import { DatoIncompleto, type TonoIncompleto } from '@/components/ui/DatoIncompleto';
import { cantidad } from '@/lib/formato';

type Props = {
  /** `null` o `undefined` significan **desconocido**, nunca cero. */
  valor: number | string | null | undefined;
  /** Cómo se escribe. Por defecto, número con separador de miles. */
  formato?: (n: number) => string;
  /** Unidad, en gris, después del número. Ej: `g`, `$/kg`. */
  sufijo?: string;
  /** Título del tooltip cuando el valor es desconocido. */
  titulo?: string;
  /** Detalle de por qué el valor es desconocido. */
  faltantes?: string[] | null;
  tono?: TonoIncompleto;
  size?: MantineSize;
  fw?: number;
  c?: string;
};

/**
 * Toda cifra de la app pasa por acá. Dos motivos:
 *
 *  1. **Tabular.** Sin `tabular-nums` una columna de precios queda desalineada.
 *  2. **Un solo camino para el desconocido.** Si el valor es nulo, sale
 *     `DatoIncompleto` con su tooltip. Ninguna pantalla decide por su cuenta
 *     mostrar un `0` o un `-` cuando no sabe.
 */
export function Numero({
  valor,
  formato = cantidad,
  sufijo,
  titulo = 'Dato incompleto',
  faltantes,
  tono,
  size,
  fw,
  c,
}: Props) {
  const n = valor == null ? null : Number(valor);

  if (n == null || Number.isNaN(n)) {
    return <DatoIncompleto titulo={titulo} faltantes={faltantes} tono={tono} />;
  }

  return (
    <Group gap={4} wrap="nowrap" component="span" display="inline-flex" w="fit-content">
      <Text component="span" className="tabular" size={size} fw={fw} c={c}>
        {formato(n)}
      </Text>
      {sufijo && (
        <Text component="span" size="xs" c="dimmed">
          {sufijo}
        </Text>
      )}
    </Group>
  );
}

/**
 * Celda de tabla para una cifra: alineada a la derecha, siempre.
 * Números a la derecha y texto a la izquierda es lo que hace comparable una
 * columna de un vistazo.
 */
export function CeldaNumero({ children, ...props }: Table.Td.Props) {
  return (
    <Table.Td ta="right" {...props}>
      <Group gap={0} justify="flex-end" wrap="nowrap">
        {children}
      </Group>
    </Table.Td>
  );
}
