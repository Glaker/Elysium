import {
  Alert,
  Button,
  Divider,
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
import { listarInsumos, listarProveedores } from '@/features/insumos/api';
import {
  actualizarGasto,
  crearGasto,
  ETIQUETA_TIPO_GASTO,
  TIPOS_DE_INSUMO,
  type Gasto,
  type TipoGasto,
} from '@/features/gastos/api';
import { listarCuentas } from '@/features/ventas/api';
import { cantidad as fmtCantidad, hoyISO, importe, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  fecha: string;
  tipo: TipoGasto;
  descripcion: string;
  esCompraDeInsumo: boolean;
  insumoId: string | null;
  cantidad: number | string;
  costoUnitario: number | string;
  total: number | string;
  proveedorId: string | null;
  formaPago: string;
  cuentaId: string | null;
  comentario: string;
};

/**
 * Cargar un gasto.
 *
 * Si es la compra de un insumo, la base emite sola la entrada de stock: comprar
 * y dar de alta son el mismo hecho (§9 + MODELO §Comercial). Lo que no toca es
 * el precio de lista del insumo — una compra puntual puede ser a precio
 * atípico, y pisarlo en silencio rompería el costo de todo lo que lo use.
 */
export function ModalGasto({
  gasto,
  onClose,
  onGuardado,
}: {
  gasto: Gasto | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insumos = useAsync(listarInsumos, []);
  const proveedores = useAsync(listarProveedores, []);
  const cuentas = useAsync(listarCuentas, []);

  const f = useFormulario<Valores>(
    gasto
      ? {
          fecha: gasto.fecha,
          tipo: gasto.tipo,
          descripcion: gasto.descripcion ?? '',
          esCompraDeInsumo: gasto.insumoId != null,
          insumoId: gasto.insumoId,
          cantidad: gasto.cantidad ?? '',
          costoUnitario: gasto.costoUnitario ?? '',
          total: gasto.total,
          proveedorId: gasto.proveedorId,
          formaPago: gasto.formaPago ?? '',
          cuentaId: gasto.cuentaId,
          comentario: gasto.comentario ?? '',
        }
      : {
          fecha: hoyISO(),
          tipo: 'materia_prima',
          descripcion: '',
          esCompraDeInsumo: true,
          insumoId: null,
          cantidad: '',
          costoUnitario: '',
          total: '',
          proveedorId: null,
          formaPago: '',
          cuentaId: null,
          comentario: '',
        },
    (v) => ({
      fecha: v.fecha ? undefined : 'Falta la fecha.',
      total:
        v.total === '' || Number(v.total) < 0 ? 'Cuánto se gastó en total.' : undefined,
      insumoId:
        v.esCompraDeInsumo && !v.insumoId ? 'Elegí qué insumo se compró.' : undefined,
      cantidad:
        v.esCompraDeInsumo && (v.cantidad === '' || Number(v.cantidad) <= 0)
          ? 'Cuánto entró. Es lo que va a sumar al stock.'
          : undefined,
    }),
  );

  const editando = Boolean(gasto);
  const compra = f.valores.esCompraDeInsumo && !editando;
  const insumo = (insumos.datos ?? []).find((i) => i.id === f.valores.insumoId);
  const unidadChica = insumo ? UNIDAD_CHICA[insumo.unidad] : '';

  /** Cerrar el triángulo cantidad × unitario = total sin pisar lo que se tipeó. */
  function alCambiarCantidad(v: number | string) {
    f.set('cantidad', v);
    if (f.valores.costoUnitario !== '' && v !== '')
      f.set('total', Number(v) * Number(f.valores.costoUnitario));
  }

  function alCambiarUnitario(v: number | string) {
    f.set('costoUnitario', v);
    if (f.valores.cantidad !== '' && v !== '')
      f.set('total', Number(f.valores.cantidad) * Number(v));
  }

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);

    const comunes = {
      fecha: f.valores.fecha,
      tipo: f.valores.tipo,
      descripcion: f.valores.descripcion.trim() || null,
      costo_unitario:
        f.valores.costoUnitario === '' ? null : Number(f.valores.costoUnitario),
      total: Number(f.valores.total),
      proveedor_id: f.valores.proveedorId,
      forma_pago: f.valores.formaPago.trim() || null,
      cuenta_id: f.valores.cuentaId,
      comentario: f.valores.comentario.trim() || null,
    };

    try {
      if (gasto) {
        await actualizarGasto(gasto.id, comunes);
      } else {
        await crearGasto({
          ...comunes,
          insumo_id: compra ? f.valores.insumoId : null,
          cantidad: compra ? Number(f.valores.cantidad) : null,
        });
      }
      onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={gasto ? 'Editar gasto' : 'Nuevo gasto'}>
      <Stack gap="sm">
        <Select
          label="Tipo"
          data={Object.entries(ETIQUETA_TIPO_GASTO).map(([value, label]) => ({
            value,
            label,
          }))}
          value={f.valores.tipo}
          onChange={(v) => f.set('tipo', (v ?? 'otros') as TipoGasto)}
          allowDeselect={false}
          description={
            TIPOS_DE_INSUMO.includes(f.valores.tipo)
              ? 'Si es la compra de un insumo del catálogo, marcá la opción de abajo y entra al stock solo.'
              : undefined
          }
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        {editando ? (
          gasto?.insumoId && (
            <Alert
              color="advertencia"
              variant="light"
              icon={<IconInfoCircle size={16} />}
              py={8}
            >
              <Text size="xs">
                Este gasto dio de alta {fmtCantidad(gasto.cantidad ?? 0)}{' '}
                {gasto.unidadChica} de {gasto.insumo} en el stock. El insumo y la cantidad
                no se editan: el movimiento que generó es inmutable. Si el dato está mal,
                corregilo con un ajuste de stock.
              </Text>
            </Alert>
          )
        ) : (
          <Switch
            label="Es la compra de un insumo del catálogo"
            description="Si lo marcás, la cantidad entra al stock automáticamente. No cambia el precio de lista del insumo."
            checked={f.valores.esCompraDeInsumo}
            onChange={(e) => f.set('esCompraDeInsumo', e.currentTarget.checked)}
          />
        )}

        {compra && (
          <>
            <Select
              label="Insumo"
              placeholder={insumos.cargando ? 'Cargando…' : 'Buscá el insumo'}
              searchable
              withAsterisk
              data={(insumos.datos ?? [])
                .filter((i) => i.activo)
                .map((i) => ({ value: i.id, label: i.nombre }))}
              value={f.valores.insumoId}
              onChange={(v) => f.set('insumoId', v)}
              {...f.campo('insumoId')}
            />

            <Group grow align="flex-start">
              <CampoNumerico
                label="Cantidad"
                description={insumo ? `En ${unidadChica}.` : 'Elegí el insumo primero.'}
                unidad={unidadChica}
                min={0}
                withAsterisk
                value={f.valores.cantidad}
                onChange={alCambiarCantidad}
                {...f.campo('cantidad')}
              />
              <CampoNumerico
                label="Costo unitario"
                description={unidadChica ? `Por ${unidadChica}.` : undefined}
                moneda="ARS"
                min={0}
                value={f.valores.costoUnitario}
                onChange={alCambiarUnitario}
                {...f.campo('costoUnitario')}
              />
            </Group>
          </>
        )}

        <TextInput
          label="Descripción"
          placeholder={
            compra ? 'Queda como motivo del movimiento de stock' : 'Qué se compró'
          }
          {...f.texto('descripcion')}
        />

        <CampoNumerico
          label="Total"
          description="Lo que efectivamente se pagó. Si cargaste cantidad y costo unitario se calcula solo, pero manda este número."
          moneda="ARS"
          min={0}
          withAsterisk
          value={f.valores.total}
          onChange={(v) => f.set('total', v)}
          {...f.campo('total')}
        />

        <Divider label="Cómo se pagó" />

        <Select
          label="Proveedor"
          placeholder={proveedores.cargando ? 'Cargando…' : 'Opcional'}
          searchable
          clearable
          data={(proveedores.datos ?? []).map((p) => ({ value: p.id, label: p.nombre }))}
          value={f.valores.proveedorId}
          onChange={(v) => f.set('proveedorId', v)}
        />

        <Select
          label="Cuenta"
          placeholder="De dónde salió la plata"
          searchable
          clearable
          data={(cuentas.datos ?? [])
            .filter((c) => c.activo)
            .map((c) => ({ value: c.id, label: c.nombre }))}
          value={f.valores.cuentaId}
          onChange={(v) => f.set('cuentaId', v)}
        />

        <TextInput
          label="Forma de pago"
          placeholder="Transferencia, efectivo…"
          {...f.texto('formaPago')}
        />

        <Textarea label="Comentario" autosize minRows={2} {...f.texto('comentario')} />

        {compra && f.valores.cantidad !== '' && insumo && (
          <Text size="xs" c="dimmed">
            Al guardar entran{' '}
            <Text component="span" className="tabular" c="bright">
              {fmtCantidad(Number(f.valores.cantidad))} {unidadChica}
            </Text>{' '}
            de {insumo.nombre} al stock
            {f.valores.total !== '' && `, por ${importe(Number(f.valores.total), 'ARS')}`}
            .
          </Text>
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
            {gasto ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
