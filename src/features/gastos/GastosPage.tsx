import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconDots,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  borrarGasto,
  ETIQUETA_TIPO_GASTO,
  listarGastos,
  resumirPorTipo,
  type Gasto,
  type TipoGasto,
} from '@/features/gastos/api';
import { ModalGasto } from '@/features/gastos/ModalGasto';
import { fecha as fmtFecha, hoyISO, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

/** El primero del mes en curso: el período que se mira por defecto. */
function primeroDelMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Los gastos, con el resumen por tipo y por período que pide §9.
 *
 * El resumen se calcula sobre lo que está filtrado, no sobre todo: si se está
 * mirando marzo, los totales son los de marzo. Un resumen que no coincide con
 * la tabla que tiene debajo es un resumen que confunde.
 */
export function GastosPage() {
  const gastos = useAsync(listarGastos, []);
  const [desde, setDesde] = useState(primeroDelMes());
  const [hasta, setHasta] = useState(hoyISO());
  const [tipo, setTipo] = useState<TipoGasto | 'todos'>('todos');
  const [editando, setEditando] = useState<Gasto | null | undefined>(undefined);
  const [borrando, setBorrando] = useState<Gasto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const delPeriodo = useMemo(
    () =>
      (gastos.datos ?? []).filter(
        (g) => (!desde || g.fecha >= desde) && (!hasta || g.fecha <= hasta),
      ),
    [gastos.datos, desde, hasta],
  );

  const filas = useMemo(
    () => (tipo === 'todos' ? delPeriodo : delPeriodo.filter((g) => g.tipo === tipo)),
    [delPeriodo, tipo],
  );

  const resumen = useMemo(() => resumirPorTipo(delPeriodo), [delPeriodo]);
  const total = delPeriodo.reduce((n, g) => n + g.total, 0);

  const columnas: Columna<Gasto>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 110,
      orden: (g) => g.fecha,
      render: (g) => (
        <Text size="sm" className="tabular">
          {fmtFecha(g.fecha)}
        </Text>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 150,
      orden: (g) => ETIQUETA_TIPO_GASTO[g.tipo],
      render: (g) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO_GASTO[g.tipo]}
        </Text>
      ),
    },
    {
      clave: 'que',
      titulo: 'Qué',
      orden: (g) => g.insumo ?? g.descripcion,
      render: (g) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{g.insumo ?? g.descripcion ?? '—'}</Text>
          {g.insumoId && (
            <BadgeEstado ayuda="Entró al stock cuando se cargó este gasto.">
              al stock
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      numerica: true,
      ancho: 130,
      orden: (g) => g.cantidad,
      render: (g) =>
        g.cantidad == null ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Numero valor={g.cantidad} sufijo={g.unidadChica ?? ''} size="sm" c="dimmed" />
        ),
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      ancho: 170,
      orden: (g) => g.proveedor,
      render: (g) => (
        <Text size="sm" c="dimmed">
          {g.proveedor ?? ''}
        </Text>
      ),
    },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      ancho: 150,
      orden: (g) => g.total,
      render: (g) => (
        <Numero valor={g.total} formato={(n) => importe(n, 'ARS')} fw={600} />
      ),
    },
  ];

  return (
    <Pagina
      titulo="Gastos"
      descripcion="Lo que sale. Si el gasto es la compra de un insumo, entra al stock en el mismo acto."
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
          Nuevo gasto
        </Button>
      }
    >
      {(gastos.error || error) && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudo completar"
        >
          {gastos.error ?? error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Group gap="sm" align="flex-end">
            <TextInput
              type="date"
              label="Desde"
              size="xs"
              value={desde}
              onChange={(e) => setDesde(e.currentTarget.value)}
            />
            <TextInput
              type="date"
              label="Hasta"
              size="xs"
              value={hasta}
              onChange={(e) => setHasta(e.currentTarget.value)}
            />
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                setDesde('');
                setHasta('');
              }}
            >
              Todo
            </Button>
          </Group>

          <Stack gap={2} align="flex-end">
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Total del período
            </Text>
            <Numero valor={total} formato={(n) => importe(n, 'ARS')} size="lg" fw={700} />
          </Stack>
        </Group>

        {resumen.length > 0 && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm" mt="md">
            {resumen.map((r) => (
              <Stack key={r.tipo} gap={0}>
                <Text size="xs" c="dimmed">
                  {ETIQUETA_TIPO_GASTO[r.tipo]}
                </Text>
                <Group gap={6} wrap="nowrap">
                  <Numero valor={r.total} formato={(n) => importe(n, 'ARS')} fw={600} />
                  <Text size="xs" c="dimmed">
                    {Math.round((r.total / total) * 100)}%
                  </Text>
                </Group>
              </Stack>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      <Tabla
        filas={filas}
        idDe={(g) => g.id}
        columnas={columnas}
        cargando={gastos.cargando}
        textoBusqueda={(g) =>
          `${g.insumo ?? ''} ${g.descripcion ?? ''} ${g.proveedor ?? ''} ${g.comentario ?? ''}`
        }
        placeholderBusqueda="Buscar por insumo, descripción, proveedor…  (/)"
        anchoMinimo={880}
        alto="calc(100vh - 400px)"
        filtros={
          <Select
            w={190}
            aria-label="Tipo de gasto"
            value={tipo}
            onChange={(v) => setTipo((v ?? 'todos') as TipoGasto | 'todos')}
            allowDeselect={false}
            data={[
              { value: 'todos', label: 'Todos los tipos' },
              ...Object.entries(ETIQUETA_TIPO_GASTO).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        }
        vacio={{
          titulo:
            delPeriodo.length === 0 && (gastos.datos?.length ?? 0) > 0
              ? 'No hay gastos en este período'
              : 'Todavía no hay gastos',
          descripcion:
            'Cargá las compras de insumos acá y el stock se actualiza solo, sin cargarlo dos veces.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar el primero
            </Button>
          ),
        }}
        acciones={(g) => (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Acciones del gasto">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => setEditando(g)}
              >
                Editar
              </Menu.Item>
              <Menu.Item
                color="error"
                leftSection={<IconTrash size={14} />}
                onClick={() => setBorrando(g)}
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />

      {editando !== undefined && (
        <ModalGasto
          gasto={editando}
          onClose={() => setEditando(undefined)}
          onGuardado={() => gastos.recargar()}
        />
      )}

      <Modal
        opened={Boolean(borrando)}
        onClose={() => setBorrando(null)}
        title="Eliminar el gasto"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se borra el registro del gasto.
          </Text>
          {borrando?.insumoId && (
            <Alert color="advertencia" variant="light" py={8}>
              <Text size="xs">
                La entrada de stock que generó no se borra: los movimientos son
                inmutables. Si el insumo no entró de verdad, sacalo con un ajuste desde
                stock.
              </Text>
            </Alert>
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setBorrando(null)}>
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={() =>
                void (async () => {
                  setError(null);
                  try {
                    await borrarGasto(borrando!.id);
                    setBorrando(null);
                    gastos.recargar();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                })()
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
