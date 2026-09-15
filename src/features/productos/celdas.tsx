import { Divider, Group, HoverCard, Stack, Text } from '@mantine/core';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { esCiclo } from '@/features/insumos/api';
import type { Desglose, Tamano } from '@/features/productos/api';
import { importe } from '@/lib/formato';

/** Las filas del desglose de §3.1 + §3.2, en el orden en que se suman. */
const FILAS: { clave: keyof Desglose; etiqueta: string; ayuda?: string }[] = [
  { clave: 'materiasPrimas', etiqueta: 'Materias primas' },
  {
    clave: 'merma',
    etiqueta: 'Merma esperada',
    ayuda:
      'Pérdida de materia prima por lote. Es la merma teórica del parámetro, no la medida en un lote real.',
  },
  { clave: 'envases', etiqueta: 'Envases' },
  { clave: 'otros', etiqueta: 'Otros insumos' },
  {
    clave: 'manoObra',
    etiqueta: 'Mano de obra',
    ayuda: 'Valor hora ÷ unidades por hora.',
  },
  { clave: 'regalias', etiqueta: 'Regalías' },
  { clave: 'energia', etiqueta: 'Energía' },
];

/**
 * El desglose completo del costo de una unidad.
 *
 * La etiqueta va separada del resto y después del subtotal porque esa es la
 * división que le importa al negocio: la marca blanca sale sin ella, y el costo
 * s/etiqueta es el número con el que se comparan las dos versiones (§3.2).
 */
export function DesgloseCosto({ d }: { d: Desglose }) {
  const fila = (
    etiqueta: string,
    valor: number | null,
    ayuda?: string,
    fuerte = false,
  ) => (
    <Group key={etiqueta} justify="space-between" gap="lg" wrap="nowrap">
      <Text size="xs" c={fuerte ? undefined : 'dimmed'} fw={fuerte ? 600 : undefined}>
        {etiqueta}
        {ayuda && (
          <Text component="span" size="xs" c="dimmed" title={ayuda}>
            {' '}
            ⓘ
          </Text>
        )}
      </Text>
      <Numero
        valor={valor}
        formato={(n) => importe(n, 'ARS')}
        size="xs"
        fw={fuerte ? 600 : undefined}
      />
    </Group>
  );

  if (!d.completo) {
    return (
      <Stack gap={4}>
        <Text size="xs" fw={600} c={esCiclo(d.faltantes) ? 'error.4' : 'advertencia.4'}>
          {esCiclo(d.faltantes) ? 'Composición con ciclo' : 'Costo incompleto'}
        </Text>
        {d.faltantes.map((f) => (
          <Text key={f} size="xs" c="dimmed">
            · {f}
          </Text>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap={3} miw={240}>
      {FILAS.map((f) => fila(f.etiqueta, d[f.clave] as number | null, f.ayuda))}
      <Divider my={2} />
      {fila('Costo sin etiqueta', d.sinEtiqueta, undefined, true)}
      {fila('Etiquetas', d.etiquetas)}
      {fila('Costo con etiqueta', d.conEtiqueta, undefined, true)}
    </Stack>
  );
}

/**
 * El costo de una unidad en una celda: el número en gris y chico, con el
 * desglose completo al pasar el mouse.
 *
 * Va deliberadamente por debajo del precio en jerarquía visual (DISENIO §3):
 * costo y precio se parecen y significan cosas distintas, y el que se mira para
 * decidir es el precio.
 */
export function CostoResumen({ d }: { d: Desglose | undefined }) {
  if (!d)
    return (
      <Text size="xs" c="dimmed">
        …
      </Text>
    );

  return (
    <HoverCard position="left" withArrow shadow="md" openDelay={120}>
      <HoverCard.Target>
        <span style={{ cursor: 'help' }}>
          <Numero
            valor={d.conEtiqueta}
            formato={(n) => importe(n, 'ARS')}
            size="xs"
            c="dimmed"
            titulo={esCiclo(d.faltantes) ? 'Composición con ciclo' : 'Costo incompleto'}
            faltantes={d.faltantes}
            tono={esCiclo(d.faltantes) ? 'error' : 'advertencia'}
          />
        </span>
      </HoverCard.Target>
      <HoverCard.Dropdown bg="noche.6">
        <DesgloseCosto d={d} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

/**
 * El estado de la fórmula de un tamaño. Los porcentajes no tienen que sumar
 * 100 — §3.1 documenta el Shampoo Café al 101% y aclara que no es error de
 * tipeo — así que esto avisa, no acusa.
 */
export function EstadoFormula({ t }: { t: Tamano }) {
  if (!t.lineasFormula)
    return (
      <BadgeEstado
        tono="advertencia"
        ayuda="Sin fórmula no hay costo, y sin costo no hay precio recomendado."
      >
        Sin fórmula
      </BadgeEstado>
    );

  const suma = t.sumaPorcentaje == null ? null : Number(t.sumaPorcentaje);

  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm" c="dimmed">
        {t.lineasFormula} {t.lineasFormula === 1 ? 'línea' : 'líneas'}
      </Text>
      {suma != null && suma !== 100 && (
        <BadgeEstado
          tono="advertencia"
          ayuda="Los porcentajes no suman 100. Puede ser a propósito, pero conviene mirarlo."
        >
          {suma}%
        </BadgeEstado>
      )}
    </Group>
  );
}
