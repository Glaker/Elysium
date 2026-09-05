import { Anchor, Group, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangleFilled, IconExternalLink, IconMath } from '@tabler/icons-react';

import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { esCiclo, factorUnidad, type Insumo } from '@/features/insumos/api';
import { fecha as fmtFecha, importe } from '@/lib/formato';

/** A los 30 días sin verificar, el precio deja de ser confiable (§5). */
export const DIAS_ALERTA = 30;

/**
 * El precio vigente de un insumo, en su unidad de compra.
 *
 * Un insumo comprado muestra el precio de lista; una MP intermedia muestra el
 * costo que sale de bajar por su composición, convertido a la misma unidad para
 * que la columna siga siendo comparable. En los dos casos, si el número no se
 * sabe, sale `DatoIncompleto` con el detalle — nunca un cero.
 */
export function PrecioVigente({ insumo }: { insumo: Insumo }) {
  const sufijo = `/ ${insumo.unidad}`;

  if (insumo.origen === 'producido') {
    const c = insumo.costo;
    const valor = c?.costo == null ? null : Number(c.costo) * factorUnidad(insumo.unidad);
    const ciclo = esCiclo(c?.faltantes);

    return (
      <Group gap={4} wrap="nowrap" justify="flex-end">
        <Numero
          valor={valor}
          formato={(n) => importe(n, 'ARS')}
          sufijo={valor == null ? undefined : sufijo}
          titulo={ciclo ? 'Composición con ciclo' : 'Costo incompleto'}
          faltantes={c?.faltantes}
          tono={ciclo ? 'error' : 'advertencia'}
        />
        {valor != null && (
          <Tooltip label="Costo calculado a partir de la composición, no un precio de lista.">
            <IconMath
              size={12}
              style={{ color: 'var(--mantine-color-dimmed)', display: 'block' }}
            />
          </Tooltip>
        )}
      </Group>
    );
  }

  const numero = (
    <Numero
      valor={insumo.precio}
      formato={(n) => importe(n, insumo.moneda ?? 'ARS')}
      sufijo={insumo.precio == null ? undefined : sufijo}
      titulo="Sin precio cargado"
      faltantes={[`nunca se cargó un precio para ${insumo.nombre}`]}
    />
  );

  // Un precio en dólares se muestra en dólares (es lo que se guarda), pero la
  // columna ordena por su equivalente en pesos, así que el equivalente tiene
  // que estar a la vista o el orden parece roto.
  if (insumo.moneda === 'USD' && insumo.precio != null) {
    return (
      <Tooltip
        label={
          insumo.precioARS == null
            ? 'No hay tipo de cambio cargado: no se puede convertir a pesos.'
            : `≈ ${importe(insumo.precioARS, 'ARS')} ${sufijo} al cambio de hoy`
        }
      >
        <span>{numero}</span>
      </Tooltip>
    );
  }

  return numero;
}

/** Fecha de la última verificación, con la advertencia de 30 días de §5. */
export function UltimaVerificacion({ insumo }: { insumo: Insumo }) {
  if (insumo.origen === 'producido') {
    return (
      <Text size="sm" c="dimmed">
        no aplica
      </Text>
    );
  }

  if (!insumo.verificadoEn) {
    return <DatoIncompleto titulo="Nunca se verificó el precio de este insumo" />;
  }

  const dias = insumo.diasSinVerificar ?? 0;
  const vencido = dias > DIAS_ALERTA;

  return (
    <Group gap={5} wrap="nowrap" justify="flex-end">
      <Text size="sm" className="tabular" c={vencido ? undefined : 'dimmed'}>
        {fmtFecha(insumo.verificadoEn)}
      </Text>
      {vencido && (
        <Tooltip
          label={`Sin verificar hace ${dias} días. Johanna pidió avisar a los ${DIAS_ALERTA}.`}
        >
          <IconAlertTriangleFilled
            size={13}
            style={{ color: 'var(--mantine-color-advertencia-5)', display: 'block' }}
          />
        </Tooltip>
      )}
    </Group>
  );
}

/**
 * El proveedor y su link. §5 pone el link como requisito, no como extra: un
 * proveedor sin link se marca igual que un dato que falta.
 */
export function ProveedorCelda({ insumo }: { insumo: Insumo }) {
  if (insumo.origen === 'producido') {
    return (
      <Text size="sm" c="dimmed">
        Producción propia
      </Text>
    );
  }

  if (!insumo.proveedor) {
    return <DatoIncompleto titulo="Sin proveedor cargado" />;
  }

  if (!insumo.proveedorLink) {
    return (
      <Group gap={5} wrap="nowrap">
        <Text size="sm">{insumo.proveedor}</Text>
        <Tooltip label="Este proveedor no tiene link cargado. El link es un requisito (§5).">
          <IconAlertTriangleFilled
            size={13}
            style={{ color: 'var(--mantine-color-advertencia-5)', display: 'block' }}
          />
        </Tooltip>
      </Group>
    );
  }

  return (
    <Anchor
      href={insumo.proveedorLink}
      target="_blank"
      rel="noreferrer noopener"
      size="sm"
      onClick={(e) => e.stopPropagation()}
    >
      <Group gap={4} wrap="nowrap">
        {insumo.proveedor}
        <IconExternalLink size={12} />
      </Group>
    </Anchor>
  );
}
