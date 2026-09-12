import { Group, Stack, Text, Tooltip } from '@mantine/core';

import { Numero } from '@/components/ui/Numero';
import { importe, plata } from '@/lib/formato';

type Costo = { costo: number | null; completo: boolean; faltantes: string[] };

type Props = {
  /** Lo que se cobra. Nulo = todavía no se le puso precio. */
  venta: number | null;
  /** Lo que el sistema calcula (§7.1). No se guarda: es una función. */
  recomendado: Costo;
  /** `fila` para una celda de tabla, `destacado` para el panel de una ficha. */
  tamano?: 'fila' | 'destacado';
};

/**
 * El par precio de venta / precio recomendado, con el desvío entre los dos.
 *
 * Es la implementación de DISENIO §3: de los cuatro números que se parecen
 * (costo s/etiqueta, costo c/etiqueta, recomendado y venta) estos dos son los
 * únicos que pueden convivir en una fila, y **no al mismo nivel**. El precio de
 * venta es el número; el recomendado es una referencia en gris al lado.
 *
 * El desvío es información, no alarma: vender por debajo del recomendado puede
 * ser una decisión. Por eso no va en rojo ni en verde, va en gris.
 */
export function ParPrecio({ venta, recomendado, tamano = 'fila' }: Props) {
  const destacado = tamano === 'destacado';
  const rec = recomendado.costo;

  const desvio =
    venta != null && rec != null && rec > 0 ? ((venta - rec) / rec) * 100 : null;

  const referencia = (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" c="dimmed">
        rec.
      </Text>
      <Numero
        valor={rec}
        formato={(n) => plata(n)}
        size="xs"
        c="dimmed"
        titulo="Precio recomendado incompleto"
        faltantes={recomendado.faltantes}
      />
      {desvio != null && Math.abs(desvio) >= 0.5 && (
        <Tooltip
          label={`El precio de venta está un ${Math.abs(desvio).toFixed(0)}% ${
            desvio > 0 ? 'por encima' : 'por debajo'
          } del recomendado.`}
        >
          <Text size="xs" c="dimmed" className="tabular" style={{ cursor: 'help' }}>
            ({desvio > 0 ? '+' : '−'}
            {Math.abs(desvio).toFixed(0)}%)
          </Text>
        </Tooltip>
      )}
    </Group>
  );

  const principal = (
    <Numero
      valor={venta}
      formato={(n) => importe(n, 'ARS')}
      size={destacado ? 'lg' : 'sm'}
      fw={destacado ? 700 : 600}
      titulo="Sin precio de venta"
      faltantes={['nunca se cargó un precio para esta variante']}
    />
  );

  return destacado ? (
    <Stack gap={2}>
      {principal}
      {referencia}
    </Stack>
  ) : (
    <Group gap={8} wrap="nowrap" justify="flex-end">
      {principal}
      {referencia}
    </Group>
  );
}
