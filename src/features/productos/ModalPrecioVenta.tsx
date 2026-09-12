import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconWand } from '@tabler/icons-react';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Numero } from '@/components/ui/Numero';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  precioRecomendado,
  registrarPrecioVenta,
  type Tamano,
  type Variante,
} from '@/features/productos/api';
import { hoyISO, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = { precio: number | string; vigenteDesde: string };

/**
 * Cargar el precio de venta de un tamaño.
 *
 * El recomendado se muestra arriba y se puede copiar de un click, pero es una
 * sugerencia: §7.1 dice que el precio de venta lo decide Johanna y que el
 * recomendado **no se guarda**. Copiarlo guarda el número, no el vínculo: si
 * después cambia el costo, este precio no se mueve solo.
 */
export function ModalPrecioVenta({
  tamano,
  varianteInicial = 'elysium',
  onClose,
  onGuardado,
}: {
  tamano: Tamano;
  varianteInicial?: Variante;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [variante, setVariante] = useState<Variante>(varianteInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recomendado = useAsync(
    () => precioRecomendado(tamano.id, variante),
    [tamano.id, variante],
  );

  const f = useFormulario<Valores>(
    { precio: tamano.precio[varianteInicial] ?? '', vigenteDesde: hoyISO() },
    (v) => ({
      precio:
        v.precio === '' || Number(v.precio) < 0
          ? 'Poné el precio de venta de una unidad.'
          : undefined,
      vigenteDesde: v.vigenteDesde ? undefined : 'Falta la fecha.',
    }),
  );

  const vigente = tamano.precio[variante];
  const sugerido = recomendado.datos?.costo ?? null;

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await registrarPrecioVenta({
        tamano_id: tamano.id,
        precio: Number(f.valores.precio),
        variante,
        vigente_desde: f.valores.vigenteDesde,
      });
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Precio de ${etiquetaTamano(tamano)}`}>
      <Stack gap="md">
        <Select
          label="Variante"
          description="La marca blanca puede valer distinto: no lleva la etiqueta Elysium."
          data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
            value,
            label,
          }))}
          value={variante}
          onChange={(v) => setVariante((v ?? 'elysium') as Variante)}
          allowDeselect={false}
        />

        <Stack gap={6}>
          <Group gap="xs" justify="space-between">
            <Text size="sm" c="dimmed">
              Precio vigente
            </Text>
            <Numero
              valor={vigente}
              formato={(n) => importe(n, 'ARS')}
              fw={600}
              titulo="Sin precio de venta para esta variante"
              faltantes={['nunca se cargó uno']}
            />
          </Group>
          <Group gap="xs" justify="space-between">
            <Text size="sm" c="dimmed">
              Recomendado
            </Text>
            {recomendado.cargando ? (
              <Text size="sm" c="dimmed">
                calculando…
              </Text>
            ) : (
              <Numero
                valor={sugerido}
                formato={(n) => importe(n, 'ARS')}
                titulo="Precio recomendado incompleto"
                faltantes={recomendado.datos?.faltantes}
              />
            )}
          </Group>
          {sugerido != null && (
            <Button
              mt={4}
              variant="default"
              leftSection={<IconWand size={16} />}
              onClick={() => f.set('precio', Math.round(sugerido))}
            >
              Usar el recomendado
            </Button>
          )}
        </Stack>

        <Divider />

        <CampoNumerico
          label="Precio de venta"
          description="Lo que se cobra por una unidad de este tamaño."
          moneda="ARS"
          min={0}
          withAsterisk
          value={f.valores.precio}
          onChange={(v) => f.set('precio', v)}
          {...f.campo('precio')}
        />

        <TextInput
          type="date"
          label="Vigente desde"
          description="El precio anterior queda en el historial con su fecha."
          value={f.valores.vigenteDesde}
          onChange={(e) => f.set('vigenteDesde', e.currentTarget.value)}
          {...f.campo('vigenteDesde')}
        />

        {error && (
          <Alert color="error" variant="light" title="No se pudo guardar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Guardar precio
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
