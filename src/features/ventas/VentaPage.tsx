import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBan,
  IconCheck,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { ETIQUETA_VARIANTE, listarProductos } from '@/features/productos/api';
import { listarUbicaciones } from '@/features/stock/api';
import {
  anularVenta,
  borrarLineaVenta,
  borrarVenta,
  confirmarVenta,
  ETIQUETA_ORIGEN,
  ETIQUETA_TIPO_VENTA,
  imputacionesDeVenta,
  importePrevisto,
  lineasDeVenta,
  obtenerVenta,
  type Imputacion,
  type LineaVenta,
} from '@/features/ventas/api';
import { EstadoVentaBadge } from '@/features/ventas/VentasPage';
import { fecha as fmtFecha, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { ModalLineaVenta } from '@/features/ventas/ModalLineaVenta';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {etiqueta}
      </Text>
      <Group gap={4} wrap="nowrap" mih={22}>
        {children}
      </Group>
    </Stack>
  );
}

/**
 * La ficha de una venta.
 *
 * Mientras es borrador se le agregan líneas y no pasó nada: ni stock, ni deuda.
 * Confirmar es el hecho: congela el importe de cada línea según el tipo de
 * venta y descuenta la mercadería.
 */
export function VentaPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [editandoLinea, setEditandoLinea] = useState<LineaVenta | null | undefined>(
    undefined,
  );
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [ubicacionId, setUbicacionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const venta = useAsync(() => obtenerVenta(id), [id]);
  const lineas = useAsync(() => lineasDeVenta(id), [id, venta.datos?.estado]);
  const productos = useAsync(listarProductos, []);
  const ubicaciones = useAsync(listarUbicaciones, []);
  const imputaciones = useAsync(
    async () => (venta.datos?.estado === 'confirmada' ? imputacionesDeVenta(id) : null),
    [id, venta.datos?.estado, venta.datos?.pagado],
  );

  const v = venta.datos;
  const borrador = v?.estado === 'borrador';
  const tamanos = (productos.datos ?? []).flatMap((p) => p.tamanos);

  async function correr(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (venta.error) {
    return (
      <Pagina titulo="Venta" volver={{ a: '/admin/ventas', texto: 'Volver a ventas' }}>
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {venta.error}
        </Alert>
      </Pagina>
    );
  }

  /** Lo que va a costar la línea si se confirma así como está. */
  const previsionDe = (l: LineaVenta) =>
    importePrevisto(
      v?.tipo ?? 'directa',
      tamanos.find((t) => t.id === l.tamanoId),
      l.variante,
      null,
    );

  const sinResolver = borrador
    ? (lineas.datos ?? []).filter(
        (l) => l.importeUnitario == null && previsionDe(l).valor == null,
      )
    : [];

  const columnas: Columna<LineaVenta>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      orden: (l) => l.producto,
      render: (l) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500}>
            {l.producto}
          </Text>
          <Text size="xs" c="dimmed">
            {l.tamano}
          </Text>
          {l.variante === 'marca_blanca' && (
            <BadgeEstado ayuda="Sale sin la etiqueta Elysium.">
              {ETIQUETA_VARIANTE[l.variante]}
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      numerica: true,
      ancho: 110,
      orden: (l) => l.cantidad,
      render: (l) => <Numero valor={l.cantidad} sufijo="u" />,
    },
    {
      clave: 'unitario',
      titulo: 'Importe unitario',
      numerica: true,
      ancho: 190,
      orden: (l) => l.importeUnitario,
      render: (l) => {
        if (l.importeUnitario != null)
          return (
            <Group gap={6} wrap="nowrap" justify="flex-end">
              <Numero valor={l.importeUnitario} formato={(n) => importe(n, 'ARS')} />
              {l.origen && <BadgeEstado>{ETIQUETA_ORIGEN[l.origen]}</BadgeEstado>}
            </Group>
          );

        const p = previsionDe(l);
        return p.valor == null ? (
          <DatoIncompleto titulo="No se va a poder confirmar" faltantes={[p.motivo]} />
        ) : (
          <Group gap={6} wrap="nowrap" justify="flex-end">
            <Numero
              valor={p.valor}
              formato={(n) => importe(n, 'ARS')}
              size="sm"
              c="dimmed"
            />
            <BadgeEstado
              ayuda={`Todavía no congelado: ${p.motivo}. Se fija al confirmar.`}
            >
              previsto
            </BadgeEstado>
          </Group>
        );
      },
    },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      ancho: 140,
      orden: (l) => l.total,
      render: (l) => {
        const unitario = l.importeUnitario ?? previsionDe(l).valor;
        return (
          <Numero
            valor={unitario == null ? null : unitario * l.cantidad}
            formato={(n) => importe(n, 'ARS')}
            fw={500}
            c={l.importeUnitario == null ? 'dimmed' : undefined}
            titulo="Sin importe resoluble"
          />
        );
      },
    },
  ];

  const columnasImputacion: Columna<Imputacion>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha del pago',
      ancho: 150,
      orden: (i) => i.fecha,
      render: (i) => (
        <Text size="sm" className="tabular">
          {fmtFecha(i.fecha)}
        </Text>
      ),
    },
    {
      clave: 'forma',
      titulo: 'Forma',
      render: (i) => (
        <Text size="sm" c="dimmed">
          {i.formaPago ?? ''}
        </Text>
      ),
    },
    {
      clave: 'monto',
      titulo: 'Imputado',
      numerica: true,
      ancho: 150,
      orden: (i) => i.monto,
      render: (i) => (
        <Numero valor={i.monto} formato={(n) => importe(n, 'ARS')} fw={500} />
      ),
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {v ? `Venta del ${fmtFecha(v.fecha)}` : '…'}
          {v && <EstadoVentaBadge v={v} />}
        </Group>
      }
      descripcion={
        v
          ? `${ETIQUETA_TIPO_VENTA[v.tipo]}${v.persona ? ` · ${v.persona}` : ' · sin nombre'}${
              v.aNombreDe ? ` (a nombre de ${v.aNombreDe})` : ''
            }`
          : undefined
      }
      volver={{ a: '/admin/ventas', texto: 'Volver a ventas' }}
      acciones={
        borrador ? (
          <>
            <Button
              variant="default"
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditandoLinea(null)}
            >
              Agregar producto
            </Button>
            <Button
              leftSection={<IconCheck size={15} />}
              disabled={!lineas.datos?.length}
              onClick={() => setConfirmando(true)}
            >
              Confirmar venta
            </Button>
          </>
        ) : v?.estado === 'confirmada' ? (
          <Button
            variant="default"
            color="error"
            leftSection={<IconBan size={15} />}
            onClick={() => setAnulando(true)}
          >
            Anular
          </Button>
        ) : null
      }
    >
      {error && (
        <Alert color="error" variant="light" title="No se pudo completar">
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Dato etiqueta="Total">
            {v && <Numero valor={v.total} formato={(n) => importe(n, 'ARS')} fw={700} />}
          </Dato>
          <Dato etiqueta="Pagado">
            {!v ? null : v.estado === 'confirmada' ? (
              <Numero valor={v.pagado} formato={(n) => importe(n, 'ARS')} />
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Dato>
          <Dato etiqueta="Saldo">
            {!v ? null : v.estado !== 'confirmada' ? (
              <Text size="sm" c="dimmed">
                sin confirmar
              </Text>
            ) : (
              <Numero
                valor={v.saldo}
                formato={(n) => importe(n, 'ARS')}
                fw={600}
                c={v.saldo > 0 ? 'advertencia.4' : undefined}
              />
            )}
          </Dato>
          <Dato etiqueta="Cobro">
            <Text size="sm" c="dimmed">
              {[v?.formaPago, v?.cuenta].filter(Boolean).join(' · ') || 'sin registrar'}
            </Text>
          </Dato>
        </SimpleGrid>

        {v?.notas && (
          <>
            <Divider my="sm" />
            <Text size="sm" c="dimmed">
              {v.notas}
            </Text>
          </>
        )}
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Productos
          </Text>
          <Text size="xs" c="dimmed">
            {borrador
              ? 'Los importes se congelan al confirmar, según el tipo de venta.'
              : 'Importes congelados el día que se confirmó la venta.'}
          </Text>
        </Group>

        <Tabla
          filas={lineas.datos ?? null}
          idDe={(l) => l.id}
          columnas={columnas}
          cargando={lineas.cargando}
          alto={360}
          anchoMinimo={760}
          vacio={{
            titulo: 'La venta no tiene productos',
            descripcion: 'Agregá al menos uno para poder confirmarla.',
            accion: borrador ? (
              <Button
                leftSection={<IconPlus size={15} />}
                onClick={() => setEditandoLinea(null)}
              >
                Agregar el primero
              </Button>
            ) : undefined,
          }}
          acciones={
            borrador
              ? (l) => (
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`Editar ${l.producto}`}
                      onClick={() => setEditandoLinea(l)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="error"
                      aria-label={`Quitar ${l.producto}`}
                      onClick={() =>
                        void correr(() => borrarLineaVenta(l.id).then(lineas.recargar))
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                )
              : undefined
          }
        />
      </Stack>

      {v?.estado === 'confirmada' && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Pagos imputados
          </Text>
          <Text size="xs" c="dimmed" mt={-8}>
            Los pagos se cargan en deudores y se imputan de la deuda más vieja a la más
            nueva. Acá se ve qué parte de cada uno cayó en esta venta.
          </Text>
          <Tabla
            filas={imputaciones.datos ?? null}
            idDe={(i) => i.id}
            columnas={columnasImputacion}
            cargando={imputaciones.cargando}
            alto={260}
            anchoMinimo={520}
            vacio={{
              titulo: 'Todavía no se cobró nada de esta venta',
              descripcion: 'Cuando se registre un pago de esta persona, se imputa solo.',
            }}
          />
        </Stack>
      )}

      {borrador && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color="error"
            leftSection={<IconTrash size={15} />}
            onClick={() => setBorrando(true)}
          >
            Eliminar la venta
          </Button>
        </Group>
      )}

      {v && editandoLinea !== undefined && (
        <ModalLineaVenta
          ventaId={id}
          tipo={v.tipo}
          productos={productos.datos ?? []}
          linea={editandoLinea}
          onClose={() => setEditandoLinea(undefined)}
          onGuardado={() => {
            lineas.recargar();
            venta.recargar();
          }}
        />
      )}

      <Modal
        opened={confirmando}
        onClose={() => setConfirmando(false)}
        title="Confirmar la venta"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se congela el importe de cada línea y sale la mercadería del stock. A partir
            de ahí la venta genera deuda hasta que se cobre.
          </Text>

          <Select
            label="Ubicación de salida"
            placeholder="La de la venta, o la de por defecto"
            clearable
            data={(ubicaciones.datos ?? [])
              .filter((u) => u.activo)
              .map((u) => ({ value: u.id, label: u.nombre }))}
            value={ubicacionId}
            onChange={setUbicacionId}
          />

          {sinResolver.length > 0 && (
            <Alert color="advertencia" variant="light" py={8}>
              <Text size="sm">La confirmación va a fallar.</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {sinResolver
                  .map((l) => `${l.producto} ${l.tamano}: ${previsionDe(l).motivo}`)
                  .join(' · ')}
              </Text>
            </Alert>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                void correr(async () => {
                  await confirmarVenta(id, ubicacionId);
                  setConfirmando(false);
                  venta.recargar();
                  lineas.recargar();
                })
              }
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={anulando} onClose={() => setAnulando(false)} title="Anular la venta">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            La venta deja de contar para la deuda: el saldo desaparece.
          </Text>
          <Alert color="advertencia" variant="light" py={8}>
            <Text size="sm">La mercadería no vuelve sola al stock.</Text>
            <Text size="xs" c="dimmed" mt={2}>
              Los movimientos que emitió la confirmación son inmutables. Si la mercadería
              volvió de verdad, registrá la entrada desde stock.
            </Text>
          </Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setAnulando(false)}>
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={() =>
                void correr(async () => {
                  await anularVenta(id);
                  setAnulando(false);
                  venta.recargar();
                })
              }
            >
              Anular
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={borrando}
        onClose={() => setBorrando(false)}
        title="Eliminar la venta"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se borra la venta y sus líneas. Se puede porque todavía es un borrador: no
            descontó stock ni generó deuda.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setBorrando(false)}>
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={() =>
                void correr(async () => {
                  await borrarVenta(id);
                  navigate('/admin/ventas');
                })
              }
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Pagina>
  );
}
