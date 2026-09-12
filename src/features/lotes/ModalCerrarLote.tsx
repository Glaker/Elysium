import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  cerrarLote,
  ETIQUETA_RESULTADO,
  listarUbicaciones,
  type Lote,
  type ResultadoLote,
} from '@/features/lotes/api';
import { cantidad } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  resultado: ResultadoLote;
  obtenidas: number | string;
  merma: number | string;
  perdida: number | string;
  ubicacionId: string | null;
};

/**
 * Cerrar el lote: el momento en que la producción deja de ser un plan.
 *
 * Hace tres cosas de una: congela el costo de cada insumo al precio de la fecha
 * del lote, saca esos insumos del stock —con la merma efectiva que se declare
 * acá— y mete las unidades obtenidas. No hay "reabrir": los movimientos de
 * stock son inmutables, y lo que se corrige se corrige con otro movimiento.
 */
export function ModalCerrarLote({
  lote,
  onClose,
  onCerrado,
}: {
  lote: Lote;
  onClose: () => void;
  onCerrado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ubicaciones = useAsync(listarUbicaciones, []);

  const f = useFormulario<Valores>(
    {
      resultado: 'ok',
      obtenidas: lote.planificadas,
      merma: '',
      perdida: '',
      ubicacionId: null,
    },
    (v) => ({
      obtenidas:
        v.resultado !== 'descarte' && (v.obtenidas === '' || Number(v.obtenidas) < 0)
          ? 'Cuánto salió realmente del lote.'
          : undefined,
      merma:
        v.merma !== '' && Number(v.merma) < 0
          ? 'La merma no puede ser negativa.'
          : undefined,
    }),
  );

  const descarte = f.valores.resultado === 'descarte';
  const obtenidas = descarte ? 0 : Number(f.valores.obtenidas || 0);
  const porDefecto = (ubicaciones.datos ?? []).find((u) => u.esDefault);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await cerrarLote({
        loteId: lote.id,
        resultado: f.valores.resultado,
        unidadesObtenidas: obtenidas,
        mermaPct: f.valores.merma === '' ? null : Number(f.valores.merma),
        perdida: f.valores.perdida === '' ? null : Number(f.valores.perdida),
        ubicacionId: f.valores.ubicacionId,
      });
      onCerrado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Cerrar ${lote.codigo ?? 'el lote'}`}>
      <Stack gap="sm">
        <Select
          label="Cómo salió"
          data={Object.entries(ETIQUETA_RESULTADO).map(([value, label]) => ({
            value,
            label,
          }))}
          value={f.valores.resultado}
          onChange={(v) => f.set('resultado', (v ?? 'ok') as ResultadoLote)}
          allowDeselect={false}
          description={
            descarte
              ? 'Un descarte consume los insumos igual, pero no entra nada al stock.'
              : undefined
          }
        />

        <CampoNumerico
          label="Unidades obtenidas"
          description={`Se planificaron ${cantidad(lote.planificadas)} ${lote.unidad}.`}
          unidad={lote.unidad}
          min={0}
          disabled={descarte}
          value={descarte ? 0 : f.valores.obtenidas}
          onChange={(v) => f.set('obtenidas', v)}
          {...f.campo('obtenidas')}
        />

        <CampoNumerico
          label="Merma efectiva"
          description="Cuánta materia prima se perdió de verdad en este lote. Vacío usa el parámetro general. Es otro número que la merma esperada que se usa para calcular precios."
          unidad="%"
          min={0}
          value={f.valores.merma}
          onChange={(v) => f.set('merma', v)}
          {...f.campo('merma')}
        />

        <CampoNumerico
          label="Pérdida de unidades"
          description="Opcional. Vacío toma la diferencia entre lo planificado y lo obtenido."
          unidad={lote.unidad}
          min={0}
          value={f.valores.perdida}
          onChange={(v) => f.set('perdida', v)}
          {...f.campo('perdida')}
        />

        {lote.destino === 'producto' && obtenidas > 0 && (
          <Select
            label="Ubicación destino"
            placeholder={
              porDefecto ? `${porDefecto.nombre} (por defecto)` : 'Elegí dónde entra'
            }
            clearable
            data={(ubicaciones.datos ?? [])
              .filter((u) => u.activo)
              .map((u) => ({ value: u.id, label: u.nombre }))}
            value={f.valores.ubicacionId}
            onChange={(v) => f.set('ubicacionId', v)}
            description="Dónde queda lo producido. Vacío usa la ubicación por defecto."
          />
        )}

        <Alert color="advertencia" variant="light" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm">Cerrar no se deshace.</Text>
          <Text size="xs" c="dimmed" mt={2}>
            Salen del stock los insumos consumidos, entran{' '}
            {obtenidas > 0
              ? `${cantidad(obtenidas)} ${lote.unidad} de ${lote.produce}`
              : 'cero unidades'}
            , y el costo queda congelado a los precios del {lote.fecha}. Para corregir
            después hay que hacer un ajuste de stock.
          </Text>
        </Alert>

        {error && (
          <Alert color="error" variant="light" title="No se pudo cerrar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Cerrar el lote
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
