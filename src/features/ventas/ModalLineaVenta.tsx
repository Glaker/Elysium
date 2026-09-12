import { Alert, Button, Group, Modal, Select, Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  type Producto,
  type Variante,
} from '@/features/productos/api';
import {
  guardarLineaVenta,
  importePrevisto,
  type LineaVenta,
  type TipoVenta,
} from '@/features/ventas/api';
import { importe } from '@/lib/formato';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  tamanoId: string | null;
  variante: Variante;
  cantidad: number | string;
  aMano: boolean;
  importeUnitario: number | string;
};

/**
 * Una línea de venta.
 *
 * El importe no se pide: sale del tipo de venta al confirmar. Lo que sí se
 * ofrece es pisarlo a mano —un descuento, un precio pactado— y en ese caso
 * queda marcado como manual, para que después se sepa que ese número no salió
 * de ninguna lista.
 */
export function ModalLineaVenta({
  ventaId,
  tipo,
  productos,
  linea,
  onClose,
  onGuardado,
}: {
  ventaId: string;
  tipo: TipoVenta;
  productos: Producto[];
  linea: LineaVenta | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    linea
      ? {
          tamanoId: linea.tamanoId,
          variante: linea.variante,
          cantidad: linea.cantidad,
          aMano: linea.origen === 'manual' || linea.importeUnitario != null,
          importeUnitario: linea.importeUnitario ?? '',
        }
      : {
          tamanoId: null,
          variante: 'elysium',
          cantidad: 1,
          aMano: false,
          importeUnitario: '',
        },
    (v) => ({
      tamanoId: v.tamanoId ? undefined : 'Elegí el producto.',
      cantidad:
        v.cantidad === '' || Number(v.cantidad) <= 0
          ? 'Cuántas unidades se llevan.'
          : undefined,
      importeUnitario:
        v.aMano && (v.importeUnitario === '' || Number(v.importeUnitario) < 0)
          ? 'Poné el importe por unidad.'
          : undefined,
    }),
  );

  const tamanos = productos.flatMap((p) => p.tamanos);
  const elegido = tamanos.find((t) => t.id === f.valores.tamanoId);
  // La previsualización del costo solo la puede dar el servidor; acá alcanza
  // con el precio, que ya viene en el catálogo.
  const previsto = importePrevisto(tipo, elegido, f.valores.variante, null);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarLineaVenta(
        {
          venta_id: ventaId,
          tamano_id: f.valores.tamanoId!,
          variante: f.valores.variante,
          cantidad: Number(f.valores.cantidad),
          importe_unitario: f.valores.aMano ? Number(f.valores.importeUnitario) : null,
          origen_importe: f.valores.aMano ? 'manual' : null,
        },
        linea?.id,
      );
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={linea ? 'Editar línea' : 'Agregar producto'}>
      <Stack gap="sm">
        <Select
          label="Producto"
          placeholder="Buscá el tamaño"
          searchable
          withAsterisk
          data={productos.flatMap((p) =>
            p.tamanos
              .filter((t) => t.activo)
              .map((t) => ({ value: t.id, label: `${p.nombre} · ${etiquetaTamano(t)}` })),
          )}
          value={f.valores.tamanoId}
          onChange={(v) => f.set('tamanoId', v)}
          {...f.campo('tamanoId')}
        />

        <Select
          label="Variante"
          data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
            value,
            label,
          }))}
          value={f.valores.variante}
          onChange={(v) => f.set('variante', (v ?? 'elysium') as Variante)}
          allowDeselect={false}
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

        {tipo === 'directa' && elegido && !f.valores.aMano && (
          <Text size="xs" c={previsto.valor == null ? 'advertencia.4' : 'dimmed'}>
            {previsto.valor == null
              ? `Al confirmar va a fallar: ${previsto.motivo}.`
              : `Al confirmar se congela en ${importe(previsto.valor, 'ARS')} por unidad (${previsto.motivo}).`}
          </Text>
        )}

        {tipo === 'entrega_reventa' && !f.valores.aMano && (
          <Text size="xs" c="dimmed">
            Al confirmar se congela el costo con etiqueta vigente a la fecha de la venta.
          </Text>
        )}

        <Switch
          label="Poner el importe a mano"
          description="Para un descuento o un precio pactado. Queda marcado como manual."
          checked={f.valores.aMano}
          onChange={(e) => f.set('aMano', e.currentTarget.checked)}
        />

        {f.valores.aMano && (
          <CampoNumerico
            label="Importe por unidad"
            moneda="ARS"
            min={0}
            withAsterisk
            value={f.valores.importeUnitario}
            onChange={(v) => f.set('importeUnitario', v)}
            {...f.campo('importeUnitario')}
          />
        )}

        {error && (
          <Alert color="error" variant="light" title="No se pudo guardar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            {linea ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
