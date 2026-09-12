import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCurrencyDollar,
  IconDots,
  IconEdit,
  IconFlask,
  IconPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { ParPrecio } from '@/components/ui/ParPrecio';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  medida,
  numerosDe,
  obtenerProducto,
  type Numeros,
  type Tamano,
  type Variante,
} from '@/features/productos/api';
import { CostoResumen, EstadoFormula } from '@/features/productos/celdas';
import { ModalPrecioVenta } from '@/features/productos/ModalPrecioVenta';
import { ModalTamano } from '@/features/productos/ModalTamano';
import { useAsync } from '@/lib/useAsync';

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

export function ProductoPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [variante, setVariante] = useState<Variante>('elysium');
  // `undefined` = cerrado, `null` = alta, un tamaño = edición.
  const [editandoTamano, setEditandoTamano] = useState<Tamano | null | undefined>(
    undefined,
  );
  const [precioDe, setPrecioDe] = useState<Tamano | null>(null);

  const producto = useAsync(() => obtenerProducto(id), [id]);
  const tamanos = producto.datos?.tamanos ?? [];

  /**
   * Costo, recomendado y precio de venta de cada tamaño para la variante
   * elegida. Son dos llamadas por tamaño y se rehacen al cambiar de variante:
   * la marca blanca no lleva la etiqueta Elysium, así que su costo y su precio
   * recomendado son otros números, no los mismos con un descuento.
   */
  const numeros = useAsync(async () => {
    const pares = await Promise.all(
      tamanos.map(async (t) => [t.id, await numerosDe(t, variante)] as const),
    );
    return new Map<string, Numeros>(pares);
  }, [id, variante, tamanos]);

  const p = producto.datos;

  if (producto.error) {
    return (
      <Pagina
        titulo="Producto"
        volver={{ a: '/admin/productos', texto: 'Volver a productos' }}
      >
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {producto.error}
        </Alert>
      </Pagina>
    );
  }

  const columnas: Columna<Tamano>[] = [
    {
      clave: 'tamano',
      titulo: 'Tamaño',
      orden: (t) => t.magnitud,
      render: (t) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={t.activo ? undefined : 'dimmed'}>
            {etiquetaTamano(t)}
          </Text>
          {t.nombre?.trim() && t.nombre.trim() !== medida(t) && (
            <Text size="xs" c="dimmed">
              {medida(t)}
            </Text>
          )}
          {!t.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'formula',
      titulo: 'Fórmula',
      ancho: 160,
      orden: (t) => t.lineasFormula,
      render: (t) => <EstadoFormula t={t} />,
    },
    {
      clave: 'productividad',
      titulo: 'Productividad',
      numerica: true,
      ancho: 140,
      orden: (t) => t.productividad,
      render: (t) => (
        <Numero
          valor={t.productividad}
          sufijo="u / h"
          size="sm"
          c="dimmed"
          titulo="Sin productividad cargada"
          faltantes={['sin unidades por hora no hay costo de mano de obra']}
        />
      ),
    },
    {
      clave: 'costo',
      titulo: 'Costo unitario',
      numerica: true,
      ancho: 140,
      orden: (t) => numeros.datos?.get(t.id)?.desglose.conEtiqueta ?? null,
      render: (t) => <CostoResumen d={numeros.datos?.get(t.id)?.desglose} />,
    },
    {
      clave: 'precio',
      titulo: 'Precio de venta',
      numerica: true,
      ancho: 220,
      orden: (t) => t.precio[variante],
      render: (t) => {
        const n = numeros.datos?.get(t.id);
        return (
          <ParPrecio
            venta={t.precio[variante]}
            recomendado={
              n?.recomendado ?? { costo: null, completo: false, faltantes: [] }
            }
          />
        );
      },
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {p?.nombre ?? '…'}
          {p && !p.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      }
      descripcion={p?.descripcion ?? undefined}
      volver={{ a: '/admin/productos', texto: 'Volver a productos' }}
      acciones={
        <>
          <Button
            variant="default"
            leftSection={<IconPlus size={15} />}
            onClick={() => setEditandoTamano(null)}
          >
            Nuevo tamaño
          </Button>
          <Button
            component={Link}
            to={`/admin/productos/${id}/editar`}
            leftSection={<IconEdit size={15} />}
          >
            Editar
          </Button>
        </>
      }
    >
      <Paper withBorder p="md" bg="noche.8">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Dato etiqueta="Línea de negocio">
            {!p ? null : p.linea ? (
              <Text size="sm">{p.linea}</Text>
            ) : (
              <DatoIncompleto titulo="Sin línea de negocio asignada" />
            )}
          </Dato>
          <Dato etiqueta="Margen">
            {!p ? null : p.margenPct != null ? (
              <Numero valor={p.margenPct} sufijo="%" />
            ) : (
              <Text size="sm" c="dimmed">
                el global
              </Text>
            )}
          </Dato>
          <Dato etiqueta="Tamaños">
            <Numero valor={p ? p.tamanos.length : null} />
          </Dato>
          <Dato etiqueta="Variante">
            <SegmentedControl
              size="xs"
              value={variante}
              onChange={(v) => setVariante(v as Variante)}
              data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Dato>
        </SimpleGrid>

        {variante === 'marca_blanca' && (
          <>
            <Divider my="sm" />
            <Text size="xs" c="dimmed">
              En marca blanca el cálculo saltea las líneas marcadas como solo Elysium — la
              etiqueta, típicamente — y suma las que sean solo de marca blanca. Es la
              misma fórmula, no otro producto.
            </Text>
          </>
        )}
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Tamaños
          </Text>
          <Text size="xs" c="dimmed">
            El tamaño es lo que se stockea, se vende y tiene precio.
          </Text>
        </Group>

        <Tabla
          filas={p ? tamanos : null}
          idDe={(t) => t.id}
          columnas={columnas}
          cargando={producto.cargando}
          alto={420}
          anchoMinimo={820}
          onFila={(t) => navigate(`/admin/productos/tamanos/${t.id}`)}
          vacio={{
            titulo: 'Este producto todavía no tiene tamaños',
            descripcion:
              'Sin un tamaño no hay nada que costear, stockear ni vender: el producto es solo el agrupador.',
            accion: (
              <Button
                leftSection={<IconPlus size={15} />}
                onClick={() => setEditandoTamano(null)}
              >
                Cargar el primero
              </Button>
            ),
          }}
          acciones={(t) => (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Acciones de ${etiquetaTamano(t)}`}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconFlask size={14} />}
                  onClick={() => navigate(`/admin/productos/tamanos/${t.id}`)}
                >
                  Ver fórmula y costo
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCurrencyDollar size={14} />}
                  onClick={() => setPrecioDe(t)}
                >
                  Cargar precio
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => setEditandoTamano(t)}
                >
                  Editar tamaño
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        />
      </Stack>

      {p && editandoTamano !== undefined && (
        <ModalTamano
          productoId={p.id}
          producto={p.nombre}
          tamano={editandoTamano}
          onClose={() => setEditandoTamano(undefined)}
          onGuardado={(nuevo) => {
            setEditandoTamano(undefined);
            // Un tamaño recién creado no tiene fórmula: el paso siguiente es
            // cargarla, así que la pantalla lleva sola hasta ahí.
            if (!editandoTamano) navigate(`/admin/productos/tamanos/${nuevo}`);
            else producto.recargar();
          }}
        />
      )}

      {precioDe && (
        <ModalPrecioVenta
          tamano={precioDe}
          varianteInicial={variante}
          onClose={() => setPrecioDe(null)}
          onGuardado={() => producto.recargar()}
        />
      )}
    </Pagina>
  );
}
