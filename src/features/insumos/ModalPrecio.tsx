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
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  registrarPrecio,
  type Insumo,
  type Moneda as MonedaInsumo,
} from '@/features/insumos/api';
import { fecha as fmtFecha, hoyISO, importe } from '@/lib/formato';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  precio: number | string;
  moneda: MonedaInsumo;
  vigenteDesde: string;
  fuente: string;
};

/**
 * Cargar un precio de insumo.
 *
 * La decisión de diseño de esta pantalla es el botón de arriba: **verificar un
 * precio que no cambió también es una fila nueva** (§5, MODELO §Insumos), y
 * obligar a retipear $25.299 para decir "sigue igual" es la clase de fricción
 * que hace que la verificación no se registre nunca. Por eso "sin cambios" es
 * un solo click, y el formulario de abajo es para cuando el precio sí cambió.
 *
 * Es un modal y no una ruta porque son cuatro campos: la regla que prohíbe
 * modales es para formularios largos.
 */
export function ModalPrecio({
  insumo,
  onClose,
  onGuardado,
}: {
  insumo: Insumo;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState<'igual' | 'nuevo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El estado arranca del insumo y no se sincroniza después: el modal se monta
  // recién al abrirse, así que "abrir" y "montar" son el mismo momento.
  const f = useFormulario<Valores>(
    {
      precio: insumo.precio ?? '',
      moneda: insumo.moneda ?? 'ARS',
      vigenteDesde: hoyISO(),
      fuente: '',
    },
    (v) => ({
      precio:
        v.precio === '' || Number(v.precio) < 0
          ? 'Poné el precio, en la unidad de compra.'
          : undefined,
      vigenteDesde: v.vigenteDesde ? undefined : 'Falta la fecha.',
    }),
  );

  async function correr(
    modo: 'igual' | 'nuevo',
    datos: () => Parameters<typeof registrarPrecio>[0],
  ) {
    setGuardando(modo);
    setError(null);
    try {
      await registrarPrecio(datos());
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(null);
    }
  }

  const actual = insumo.precio;

  return (
    <Modal opened onClose={onClose} title={`Precio de ${insumo.nombre}`}>
      <Stack gap="md">
        {actual != null ? (
          <Stack gap={6}>
            <Group gap="xs" justify="space-between">
              <Text size="sm" c="dimmed">
                Precio vigente
              </Text>
              <Text size="sm" className="tabular" fw={600}>
                {importe(actual, insumo.moneda ?? 'ARS')} / {insumo.unidad}
              </Text>
            </Group>
            <Group gap="xs" justify="space-between">
              <Text size="sm" c="dimmed">
                Última verificación
              </Text>
              <Text size="sm" className="tabular">
                {fmtFecha(insumo.verificadoEn)}
                {insumo.diasSinVerificar != null &&
                  ` · hace ${insumo.diasSinVerificar} días`}
              </Text>
            </Group>
            <Button
              mt={4}
              leftSection={<IconCheck size={16} />}
              loading={guardando === 'igual'}
              onClick={() =>
                void correr('igual', () => ({
                  insumo_id: insumo.id,
                  precio: actual,
                  moneda: insumo.moneda ?? 'ARS',
                  fuente: 'verificado sin cambios',
                }))
              }
            >
              Verificado, sin cambios
            </Button>
            <Text size="xs" c="dimmed">
              Deja una fila nueva con la fecha de hoy y el mismo monto. Es lo que apaga la
              alerta de 30 días.
            </Text>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Este insumo todavía no tiene ningún precio. Hasta que se cargue uno, su costo
            y el de todo lo que lo use aparecen como incompletos.
          </Text>
        )}

        <Divider label={actual != null ? 'o cargá el precio nuevo' : undefined} />

        <CampoNumerico
          label="Precio"
          description={`En la unidad de compra: por ${insumo.unidad}.`}
          moneda={f.valores.moneda}
          min={0}
          value={f.valores.precio}
          onChange={(v) => f.set('precio', v)}
          {...f.campo('precio')}
        />

        <Select
          label="Moneda"
          data={[
            { value: 'ARS', label: 'Pesos' },
            { value: 'USD', label: 'Dólares' },
          ]}
          value={f.valores.moneda}
          onChange={(v) => f.set('moneda', (v ?? 'ARS') as MonedaInsumo)}
          description="Los precios en dólares se guardan en dólares y se convierten al calcular."
          allowDeselect={false}
        />

        <TextInput
          type="date"
          label="Vigente desde"
          description="Hoy, salvo que estés cargando un precio que regía desde antes."
          value={f.valores.vigenteDesde}
          onChange={(e) => f.set('vigenteDesde', e.currentTarget.value)}
          {...f.campo('vigenteDesde')}
        />

        <TextInput
          label="Fuente"
          placeholder="Lista del proveedor, mail, web…"
          {...f.texto('fuente')}
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
          <Button
            loading={guardando === 'nuevo'}
            onClick={() => {
              if (!f.intentar()) return;
              void correr('nuevo', () => ({
                insumo_id: insumo.id,
                precio: Number(f.valores.precio),
                moneda: f.valores.moneda,
                vigente_desde: f.valores.vigenteDesde,
                fuente: f.valores.fuente || null,
              }));
            }}
          >
            Guardar precio
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
