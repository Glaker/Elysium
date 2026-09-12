import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  listarUbicaciones,
  registrarMovimientoInsumo,
  registrarMovimientoProducto,
  trasladar,
  TIPOS_INSUMO_MANUAL,
  TIPOS_PRODUCTO_MANUAL,
  type StockInsumo,
  type StockProducto,
  type TipoMovInsumo,
  type TipoMovProducto,
} from '@/features/stock/api';
import { cantidad, hoyISO } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Sentido = 'entra' | 'sale';

/**
 * El aviso que aparece en todos los modales de movimiento.
 *
 * No es decorativo: es la diferencia entre esta app y la planilla que reemplaza.
 * Acá un número no se pisa nunca, y quien carga tiene que saberlo antes de
 * apretar guardar, no después.
 */
function AvisoInmutable() {
  return (
    <Alert color="advertencia" variant="light" icon={<IconInfoCircle size={16} />} py={8}>
      <Text size="xs">
        Un movimiento no se edita ni se borra: si te equivocás, se corrige cargando otro
        de signo contrario. Queda el rastro de los dos.
      </Text>
    </Alert>
  );
}

type ValoresProducto = {
  sentido: Sentido;
  tipo: TipoMovProducto;
  ubicacionId: string | null;
  cantidad: number | string;
  fecha: string;
  motivo: string;
};

/** Registrar a mano una entrada o salida de producto terminado. */
export function ModalMovimientoProducto({
  item,
  onClose,
  onGuardado,
}: {
  item: StockProducto;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ubicaciones = useAsync(listarUbicaciones, []);

  const f = useFormulario<ValoresProducto>(
    {
      sentido: 'sale',
      tipo: 'ajuste',
      ubicacionId: item.porUbicacion[0]?.ubicacionId ?? null,
      cantidad: '',
      fecha: hoyISO(),
      motivo: '',
    },
    (v) => ({
      ubicacionId: v.ubicacionId ? undefined : 'Elegí la ubicación.',
      cantidad:
        v.cantidad === '' || Number(v.cantidad) <= 0
          ? 'Cuántas unidades. El signo lo pone el sentido de arriba.'
          : undefined,
      fecha: v.fecha ? undefined : 'Falta la fecha.',
    }),
  );

  const ayuda = TIPOS_PRODUCTO_MANUAL.find((t) => t.value === f.valores.tipo)?.ayuda;
  const sale = f.valores.sentido === 'sale';

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const n = Math.abs(Number(f.valores.cantidad));
      await registrarMovimientoProducto({
        tamano_id: item.tamanoId,
        ubicacion_id: f.valores.ubicacionId!,
        cantidad: sale ? -n : n,
        tipo: f.valores.tipo,
        fecha: f.valores.fecha,
        motivo: f.valores.motivo.trim() || null,
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
    <Modal
      opened
      onClose={onClose}
      title={`Movimiento · ${item.producto} ${item.tamano}`}
    >
      <Stack gap="sm">
        <SegmentedControl
          fullWidth
          value={f.valores.sentido}
          onChange={(v) => f.set('sentido', v as Sentido)}
          data={[
            { value: 'sale', label: 'Sale del stock' },
            { value: 'entra', label: 'Entra al stock' },
          ]}
        />

        <Select
          label="Tipo"
          data={TIPOS_PRODUCTO_MANUAL.map((t) => ({ value: t.value, label: t.label }))}
          value={f.valores.tipo}
          onChange={(v) => f.set('tipo', (v ?? 'ajuste') as TipoMovProducto)}
          allowDeselect={false}
          description={ayuda}
        />

        <Select
          label="Ubicación"
          placeholder={ubicaciones.cargando ? 'Cargando…' : 'Elegí la ubicación'}
          withAsterisk
          data={(ubicaciones.datos ?? [])
            .filter((u) => u.activo)
            .map((u) => ({ value: u.id, label: u.nombre }))}
          value={f.valores.ubicacionId}
          onChange={(v) => f.set('ubicacionId', v)}
          {...f.campo('ubicacionId')}
        />

        <CampoNumerico
          label="Cantidad"
          unidad="u"
          min={0}
          withAsterisk
          value={f.valores.cantidad}
          onChange={(v) => f.set('cantidad', v)}
          {...f.campo('cantidad')}
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        <TextInput
          label="Motivo"
          placeholder="Se rompió en el traslado, regalo a clienta…"
          {...f.texto('motivo')}
        />

        <AvisoInmutable />

        {error && (
          <Alert color="error" variant="light" title="No se pudo registrar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Registrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

type ValoresInsumo = {
  sentido: Sentido;
  tipo: TipoMovInsumo;
  cantidad: number | string;
  fecha: string;
  motivo: string;
};

/** Lo mismo para un insumo. Sin ubicación: el insumo no se lleva por estante. */
export function ModalMovimientoInsumo({
  item,
  onClose,
  onGuardado,
}: {
  item: StockInsumo;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<ValoresInsumo>(
    { sentido: 'entra', tipo: 'compra', cantidad: '', fecha: hoyISO(), motivo: '' },
    (v) => ({
      cantidad:
        v.cantidad === '' || Number(v.cantidad) <= 0
          ? `Cuánto, en ${item.unidadChica}. El signo lo pone el sentido de arriba.`
          : undefined,
      fecha: v.fecha ? undefined : 'Falta la fecha.',
    }),
  );

  const ayuda = TIPOS_INSUMO_MANUAL.find((t) => t.value === f.valores.tipo)?.ayuda;
  const sale = f.valores.sentido === 'sale';

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const n = Math.abs(Number(f.valores.cantidad));
      await registrarMovimientoInsumo({
        insumo_id: item.insumoId,
        cantidad: sale ? -n : n,
        tipo: f.valores.tipo,
        fecha: f.valores.fecha,
        motivo: f.valores.motivo.trim() || null,
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
    <Modal opened onClose={onClose} title={`Movimiento · ${item.nombre}`}>
      <Stack gap="sm">
        <SegmentedControl
          fullWidth
          value={f.valores.sentido}
          onChange={(v) => f.set('sentido', v as Sentido)}
          data={[
            { value: 'entra', label: 'Entra al stock' },
            { value: 'sale', label: 'Sale del stock' },
          ]}
        />

        <Select
          label="Tipo"
          data={TIPOS_INSUMO_MANUAL.map((t) => ({ value: t.value, label: t.label }))}
          value={f.valores.tipo}
          onChange={(v) => f.set('tipo', (v ?? 'ajuste') as TipoMovInsumo)}
          allowDeselect={false}
          description={ayuda}
        />

        <CampoNumerico
          label="Cantidad"
          description={`En ${item.unidadChica}, la misma unidad en la que se escriben las fórmulas.`}
          unidad={item.unidadChica}
          min={0}
          withAsterisk
          value={f.valores.cantidad}
          onChange={(v) => f.set('cantidad', v)}
          {...f.campo('cantidad')}
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        <TextInput
          label="Motivo"
          placeholder="Compra a proveedor, se derramó…"
          {...f.texto('motivo')}
        />

        <AvisoInmutable />

        {error && (
          <Alert color="error" variant="light" title="No se pudo registrar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Registrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

type ValoresTraslado = {
  origenId: string | null;
  destinoId: string | null;
  cantidad: number | string;
  fecha: string;
  motivo: string;
};

/**
 * Mover producto de una ubicación a otra. Son dos movimientos y el stock total
 * no cambia: lo que cambia es dónde está.
 */
export function ModalTraslado({
  item,
  onClose,
  onGuardado,
}: {
  item: StockProducto;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ubicaciones = useAsync(listarUbicaciones, []);

  const f = useFormulario<ValoresTraslado>(
    {
      origenId: item.porUbicacion[0]?.ubicacionId ?? null,
      destinoId: null,
      cantidad: '',
      fecha: hoyISO(),
      motivo: '',
    },
    (v) => ({
      origenId: v.origenId ? undefined : 'De dónde sale.',
      destinoId: !v.destinoId
        ? 'A dónde va.'
        : v.destinoId === v.origenId
          ? 'El destino tiene que ser otra ubicación.'
          : undefined,
      cantidad:
        v.cantidad === '' || Number(v.cantidad) <= 0
          ? 'Cuántas unidades se mueven.'
          : undefined,
    }),
  );

  const enOrigen = item.porUbicacion.find((u) => u.ubicacionId === f.valores.origenId);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await trasladar({
        tamano_id: item.tamanoId,
        origen_id: f.valores.origenId!,
        destino_id: f.valores.destinoId!,
        cantidad: Number(f.valores.cantidad),
        fecha: f.valores.fecha,
        motivo: f.valores.motivo.trim() || null,
      });
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  const opciones = (ubicaciones.datos ?? [])
    .filter((u) => u.activo)
    .map((u) => ({ value: u.id, label: u.nombre }));

  return (
    <Modal opened onClose={onClose} title={`Trasladar ${item.producto} ${item.tamano}`}>
      <Stack gap="sm">
        <Select
          label="Desde"
          data={opciones}
          value={f.valores.origenId}
          onChange={(v) => f.set('origenId', v)}
          withAsterisk
          description={
            enOrigen ? `Hay ${cantidad(enOrigen.stock)} u en esta ubicación.` : undefined
          }
          {...f.campo('origenId')}
        />

        <Select
          label="Hacia"
          data={opciones}
          value={f.valores.destinoId}
          onChange={(v) => f.set('destinoId', v)}
          withAsterisk
          {...f.campo('destinoId')}
        />

        <CampoNumerico
          label="Cantidad"
          unidad="u"
          min={0}
          withAsterisk
          value={f.valores.cantidad}
          onChange={(v) => f.set('cantidad', v)}
          {...f.campo('cantidad')}
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        <TextInput
          label="Motivo"
          placeholder="Reposición de vitrina…"
          {...f.texto('motivo')}
        />

        <Text size="xs" c="dimmed">
          Se registran dos movimientos: una salida en el origen y una entrada en el
          destino. El stock total no cambia.
        </Text>

        {error && (
          <Alert color="error" variant="light" title="No se pudo trasladar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Trasladar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
