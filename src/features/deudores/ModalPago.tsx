import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  imputarAMano,
  imputarFifo,
  registrarPago,
  type Pago,
  type VentaConSaldo,
} from '@/features/deudores/api';
import { ETIQUETA_TIPO_VENTA, listarCuentas } from '@/features/ventas/api';
import { fecha as fmtFecha, hoyISO, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  monto: number | string;
  fecha: string;
  cuentaId: string | null;
  formaPago: string;
  notas: string;
  fifo: boolean;
};

/**
 * Registrar un pago.
 *
 * Por defecto se imputa solo, de la deuda más vieja a la más nueva (§7). Lo que
 * sobra **no** se fuerza contra nada: queda a favor de la persona hasta que haya
 * una venta donde aplicarlo. Inventar una venta para cuadrar sería mentir.
 */
export function ModalPago({
  personaId,
  nombre,
  deuda,
  onClose,
  onGuardado,
}: {
  personaId: string;
  nombre: string;
  deuda: number;
  onClose: () => void;
  onGuardado: (resumen: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cuentas = useAsync(listarCuentas, []);

  const f = useFormulario<Valores>(
    {
      monto: deuda > 0 ? deuda : '',
      fecha: hoyISO(),
      cuentaId: null,
      formaPago: '',
      notas: '',
      fifo: true,
    },
    (v) => ({
      monto:
        v.monto === '' || Number(v.monto) <= 0
          ? 'Cuánto pagó. Tiene que ser mayor que cero.'
          : undefined,
      fecha: v.fecha ? undefined : 'Falta la fecha.',
    }),
  );

  const monto = Number(f.valores.monto || 0);
  const sobrara = f.valores.fifo && monto > deuda && deuda >= 0;

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const id = await registrarPago({
        persona_id: personaId,
        fecha: f.valores.fecha,
        monto,
        cuenta_id: f.valores.cuentaId,
        forma_pago: f.valores.formaPago.trim() || null,
        notas: f.valores.notas.trim() || null,
      });

      let resumen = `Pago de ${importe(monto, 'ARS')} registrado.`;
      if (f.valores.fifo) {
        const sobrante = await imputarFifo(id);
        resumen =
          sobrante > 0
            ? `Se imputaron ${importe(monto - sobrante, 'ARS')} y quedaron ${importe(sobrante, 'ARS')} a favor.`
            : `Pago de ${importe(monto, 'ARS')} imputado completo.`;
      }
      onGuardado(resumen);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Registrar pago de ${nombre}`}>
      <Stack gap="sm">
        {deuda > 0 && (
          <Group gap="xs" justify="space-between">
            <Text size="sm" c="dimmed">
              Debe hoy
            </Text>
            <Text size="sm" className="tabular" fw={600}>
              {importe(deuda, 'ARS')}
            </Text>
          </Group>
        )}

        <CampoNumerico
          label="Monto"
          moneda="ARS"
          min={0}
          withAsterisk
          value={f.valores.monto}
          onChange={(v) => f.set('monto', v)}
          {...f.campo('monto')}
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        <Select
          label="Cuenta"
          placeholder={cuentas.cargando ? 'Cargando…' : 'A dónde entró'}
          searchable
          clearable
          data={(cuentas.datos ?? [])
            .filter((c) => c.activo)
            .map((c) => ({
              value: c.id,
              label: c.alias ? `${c.nombre} · ${c.alias}` : c.nombre,
            }))}
          value={f.valores.cuentaId}
          onChange={(v) => f.set('cuentaId', v)}
        />

        <TextInput
          label="Forma de pago"
          placeholder="Transferencia, efectivo…"
          {...f.texto('formaPago')}
        />

        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />

        <Switch
          label="Imputar automáticamente"
          description="De la deuda más vieja a la más nueva. Si lo apagás, el pago queda entero sin aplicar y lo imputás a mano."
          checked={f.valores.fifo}
          onChange={(e) => f.set('fifo', e.currentTarget.checked)}
        />

        {sobrara && (
          <Alert
            color="advertencia"
            variant="light"
            icon={<IconInfoCircle size={16} />}
            py={8}
          >
            <Text size="xs">
              Paga {importe(monto - deuda, 'ARS')} más de lo que debe. Ese sobrante queda
              a favor y se puede imputar cuando haya una venta nueva.
            </Text>
          </Alert>
        )}

        {error && (
          <Alert color="error" variant="light" title="No se pudo registrar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Registrar pago
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Aplicar a mano parte de un pago a una venta puntual.
 *
 * Existe porque el FIFO es una regla, no una ley: a veces alguien paga algo
 * concreto. Las imputaciones son filas guardadas, así que corregirlas es
 * agregar o borrar una fila, no recalcular nada.
 */
export function ModalImputar({
  pago,
  ventas,
  onClose,
  onGuardado,
}: {
  pago: Pago;
  ventas: VentaConSaldo[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidatas = ventas.filter(
    (v) => v.saldo > 0 && !pago.imputaciones.some((i) => i.ventaId === v.ventaId),
  );

  const f = useFormulario<{ ventaId: string | null; monto: number | string }>(
    { ventaId: null, monto: '' },
    (v) => ({
      ventaId: v.ventaId ? undefined : 'Elegí a qué venta aplicarlo.',
      monto: v.monto === '' || Number(v.monto) <= 0 ? 'Cuánto aplicar.' : undefined,
    }),
  );

  const elegida = candidatas.find((v) => v.ventaId === f.valores.ventaId);
  const tope = elegida ? Math.min(pago.sobrante, elegida.saldo) : pago.sobrante;

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await imputarAMano(pago.id, f.valores.ventaId!, Number(f.valores.monto));
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title="Imputar a mano" size="sm">
      <Stack gap="sm">
        <Group gap="xs" justify="space-between">
          <Text size="sm" c="dimmed">
            Sin aplicar de este pago
          </Text>
          <Text size="sm" className="tabular" fw={600}>
            {importe(pago.sobrante, 'ARS')}
          </Text>
        </Group>

        {candidatas.length === 0 ? (
          <Alert color="advertencia" variant="light" py={8}>
            <Text size="xs">
              No hay ventas con saldo a las que aplicarlo. El sobrante queda a favor hasta
              que haya una.
            </Text>
          </Alert>
        ) : (
          <>
            <Select
              label="Venta"
              placeholder="Cuál querés saldar"
              withAsterisk
              data={candidatas.map((v) => ({
                value: v.ventaId,
                label: `${fmtFecha(v.fecha)} · ${ETIQUETA_TIPO_VENTA[v.tipo]} · debe ${importe(v.saldo, 'ARS')}`,
              }))}
              value={f.valores.ventaId}
              onChange={(v) => f.set('ventaId', v)}
              {...f.campo('ventaId')}
            />

            <CampoNumerico
              label="Monto"
              description={`Como mucho ${importe(tope, 'ARS')}.`}
              moneda="ARS"
              min={0}
              max={tope}
              withAsterisk
              value={f.valores.monto}
              onChange={(v) => f.set('monto', v)}
              {...f.campo('monto')}
            />
          </>
        )}

        {error && (
          <Alert color="error" variant="light" title="No se pudo imputar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={guardando}
            disabled={candidatas.length === 0}
            onClick={() => void guardar()}
          >
            Imputar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
