import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { ETIQUETA_VARIANTE } from '@/features/productos/api';
import {
  aprobarComoVenta,
  ETIQUETA_TIPO,
  insumosDelPedido,
  resolverSolicitud,
  type Solicitud,
} from '@/features/solicitudes/api';
import { ETIQUETA_TIPO_VENTA, type TipoVenta } from '@/features/ventas/api';
import { cantidad as fmtCantidad, fecha as fmtFecha, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Props = {
  solicitud: Solicitud;
  onClose: () => void;
  onResuelta: () => void;
};

/**
 * El detalle de un pedido y lo único que se puede hacer con él.
 *
 * Los dos tipos terminan distinto y por eso el pie del modal cambia: un pedido
 * de producto se convierte en una venta en borrador, y uno de materia prima se
 * marca entregado — no hay venta detrás, es material que sale para producir.
 */
export function ModalSolicitud({ solicitud: s, onClose, onResuelta }: Props) {
  const navigate = useNavigate();
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>(
    s.esRevendedor ? 'entrega_reventa' : 'directa',
  );
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esMP = s.tipo === 'materia_prima';

  const insumos = useAsync(
    () =>
      esMP && s.tamanoObjetivoId && s.unidadesObjetivo
        ? insumosDelPedido(s.tamanoObjetivoId, s.unidadesObjetivo)
        : Promise.resolve(null),
    [s.id],
  );

  async function correr(fn: () => Promise<void>) {
    setTrabajando(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrabajando(false);
    }
  }

  const aprobar = () =>
    correr(async () => {
      const ventaId = await aprobarComoVenta(s.id, tipoVenta);
      onResuelta();
      navigate(`/admin/ventas/${ventaId}`);
    });

  const resolver = (estado: 'aprobada' | 'rechazada' | 'pendiente') =>
    correr(async () => {
      await resolverSolicitud(s.id, estado);
      onResuelta();
    });

  return (
    <Modal
      opened
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <Text fw={600}>{s.persona}</Text>
          <Text size="sm" c="dimmed">
            pidió {ETIQUETA_TIPO[s.tipo].toLowerCase()} el {fmtFecha(s.fecha)}
          </Text>
          {s.estado !== 'pendiente' && (
            <BadgeEstado>
              {s.estado === 'aprobada' ? 'Ya resuelto' : 'Rechazado'}
            </BadgeEstado>
          )}
        </Group>
      }
    >
      <Stack gap="sm">
        {esMP ? (
          <Stack gap="xs">
            <Text size="sm">
              Va a producir{' '}
              <strong>
                {fmtCantidad(s.unidadesObjetivo ?? 0)} u de {s.tamanoObjetivo}
              </strong>
              .
            </Text>

            {insumos.cargando && <Skeleton h={120} />}
            {insumos.error && (
              <Alert color="error" variant="light" title="No se pudo calcular">
                {insumos.error}
              </Alert>
            )}
            {insumos.datos && insumos.datos.length > 0 && (
              <Table striped={false} withRowBorders={false} verticalSpacing={4}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Insumo</Table.Th>
                    <Table.Th ta="right">Hay que entregar</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {insumos.datos.map((x) => {
                    const u = UNIDAD_CHICA[x.unidad] ?? x.unidad;
                    return (
                      <Table.Tr key={x.insumo}>
                        <Table.Td>
                          <Text size="sm">{x.insumo}</Text>
                          {x.lleva_merma && Number(x.merma) > 0 && (
                            <Text size="xs" c="dimmed">
                              {fmtCantidad(Number(x.cantidad_formula))} {u} de fórmula +{' '}
                              {fmtCantidad(Number(x.merma))} {u} de merma
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={600}>
                            {fmtCantidad(Number(x.cantidad_necesaria))} {u}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
            {insumos.datos?.length === 0 && (
              <Text size="sm" c="dimmed">
                Ese tamaño no tiene fórmula cargada, así que no hay lista de insumos.
              </Text>
            )}

            <Text size="xs" c="dimmed">
              Las cantidades salen de la fórmula de hoy e incluyen la merma esperada. La
              salida del insumo se registra en Stock: marcar el pedido no mueve nada.
            </Text>
          </Stack>
        ) : (
          <Table striped={false} withRowBorders={false} verticalSpacing={4}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th ta="right">Cantidad</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {s.lineas.map((l) => (
                <Table.Tr key={l.id}>
                  <Table.Td>
                    <Text size="sm">{l.descripcion}</Text>
                    {l.variante !== 'elysium' && (
                      <Text size="xs" c="dimmed">
                        {ETIQUETA_VARIANTE[l.variante]}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" fw={600}>
                      {fmtCantidad(l.cantidad)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {s.notas && (
          <Text size="sm" c="dimmed">
            “{s.notas}”
          </Text>
        )}

        {s.estado === 'pendiente' && !esMP && (
          <>
            <Divider />
            <Select
              label="Qué tipo de venta se crea"
              description={
                s.esRevendedor
                  ? 'Está marcada como revendedora, así que por defecto paga el costo.'
                  : 'Por defecto paga el precio de venta de lista.'
              }
              data={Object.entries(ETIQUETA_TIPO_VENTA).map(([value, label]) => ({
                value,
                label,
              }))}
              value={tipoVenta}
              onChange={(v) => setTipoVenta((v ?? 'directa') as TipoVenta)}
              allowDeselect={false}
            />
            <Alert
              color="advertencia"
              variant="light"
              icon={<IconInfoCircle size={16} />}
              py={8}
            >
              <Text size="xs">
                La venta nace en <strong>borrador</strong>: el pedido no apartó stock, así
                que los importes se congelan y la mercadería sale recién cuando la
                confirmes.
              </Text>
            </Alert>
          </>
        )}

        {error && (
          <Alert color="error" variant="light" title="No se pudo">
            {error}
          </Alert>
        )}

        <Group justify="space-between" mt="xs">
          {s.estado === 'pendiente' ? (
            <>
              <Button
                variant="subtle"
                color="gray"
                disabled={trabajando}
                onClick={() => void resolver('rechazada')}
              >
                Rechazar
              </Button>
              {esMP ? (
                <Button loading={trabajando} onClick={() => void resolver('aprobada')}>
                  Marcar como entregado
                </Button>
              ) : (
                <Button
                  loading={trabajando}
                  disabled={s.lineas.length === 0}
                  onClick={() => void aprobar()}
                >
                  Crear la venta
                </Button>
              )}
            </>
          ) : (
            <>
              <Text size="xs" c="dimmed">
                Resuelto el {fmtFecha(s.resueltaEn)}.
              </Text>
              <Button
                variant="default"
                loading={trabajando}
                onClick={() => void resolver('pendiente')}
              >
                Volver a pendiente
              </Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
