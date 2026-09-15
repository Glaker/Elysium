import { ActionIcon, Alert, Button, Group, Menu, Text } from '@mantine/core';
import {
  IconAdjustments,
  IconAlertTriangle,
  IconArrowsExchange,
  IconClipboardList,
  IconDots,
  IconHistory,
  IconMapPin,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarProductos } from '@/features/productos/api';
import { stockProductos, type StockProducto } from '@/features/stock/api';
import { ModalMovimientoProducto, ModalTraslado } from '@/features/stock/ModalMovimiento';
import { useAsync } from '@/lib/useAsync';

/**
 * El stock de producto terminado.
 *
 * Lo que se ve acá no está guardado en ninguna columna: es la suma de los
 * movimientos (§14.1). Por eso no hay forma de "editar" un stock — se corrige
 * con un ajuste, que queda registrado como lo que es.
 */
export function StockPage() {
  const productos = useAsync(listarProductos, []);
  const tamanos = (productos.datos ?? []).flatMap((p) => p.tamanos);
  const stock = useAsync(
    async () => (productos.datos ? stockProductos(tamanos) : null),
    ['stock', tamanos],
  );

  const [ajustando, setAjustando] = useState<StockProducto | null>(null);
  const [trasladando, setTrasladando] = useState<StockProducto | null>(null);

  const columnas: Columna<StockProducto>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      orden: (s) => s.producto,
      render: (s) => (
        <Text size="sm" fw={500}>
          {s.producto}
        </Text>
      ),
    },
    {
      clave: 'tamano',
      titulo: 'Tamaño',
      ancho: 140,
      orden: (s) => s.tamano,
      render: (s) => (
        <Text size="sm" c="dimmed">
          {s.tamano}
        </Text>
      ),
    },
    {
      clave: 'ubicaciones',
      titulo: 'Dónde está',
      orden: (s) => s.porUbicacion.length,
      render: (s) =>
        s.porUbicacion.length ? (
          <Group gap={10} wrap="wrap">
            {s.porUbicacion.map((u) => (
              <Text key={u.ubicacionId} size="sm" c="dimmed">
                {u.ubicacion}{' '}
                <Text
                  component="span"
                  className="tabular"
                  c={u.stock < 0 ? 'error.4' : 'bright'}
                >
                  {u.stock}
                </Text>
              </Text>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            sin movimientos
          </Text>
        ),
    },
    {
      clave: 'total',
      titulo: 'Stock',
      numerica: true,
      ancho: 120,
      orden: (s) => s.total,
      render: (s) => (
        <Numero
          valor={s.total}
          sufijo="u"
          fw={600}
          c={s.total < 0 ? 'error.4' : undefined}
        />
      ),
    },
  ];

  const negativos = (stock.datos ?? []).filter((s) => s.total < 0);

  return (
    <Pagina
      titulo="Stock de productos"
      descripcion="La suma de los movimientos, no un número que se pisa. Para cambiarlo se registra un movimiento."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/stock/movimientos"
            leftSection={<IconHistory size={15} />}
          >
            Movimientos
          </Button>
          <Button
            component={Link}
            to="/admin/stock/recuentos"
            leftSection={<IconClipboardList size={15} />}
          >
            Recuentos
          </Button>
        </>
      }
    >
      {(productos.error || stock.error) && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudo cargar el stock"
        >
          {productos.error ?? stock.error}
        </Alert>
      )}

      {negativos.length > 0 && (
        <Alert color="error" variant="light" py={6}>
          <Text size="sm">
            {negativos.length === 1
              ? 'Un tamaño tiene stock negativo'
              : `${negativos.length} tamaños tienen stock negativo`}
            : salió más de lo que había registrado. Se arregla con un ajuste o con un
            recuento.
          </Text>
        </Alert>
      )}

      <Tabla
        filas={stock.datos ?? null}
        idDe={(s) => s.tamanoId}
        columnas={columnas}
        cargando={productos.cargando || stock.cargando}
        textoBusqueda={(s) => `${s.producto} ${s.tamano}`}
        placeholderBusqueda="Buscar producto, tamaño…  (/)"
        anchoMinimo={760}
        vacio={{
          titulo: 'Todavía no hay tamaños',
          descripcion:
            'El stock se lleva por tamaño. Cargá productos y sus tamaños para empezar a moverlo.',
          accion: (
            <Button component={Link} to="/admin/productos">
              Ir a productos
            </Button>
          ),
        }}
        herramientas={
          <Button
            variant="default"
            component={Link}
            to="/admin/stock/ubicaciones"
            leftSection={<IconMapPin size={15} />}
          >
            Ubicaciones
          </Button>
        }
        acciones={(s) => (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Acciones de ${s.tamano}`}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconAdjustments size={14} />}
                onClick={() => setAjustando(s)}
              >
                Registrar movimiento
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArrowsExchange size={14} />}
                onClick={() => setTrasladando(s)}
              >
                Trasladar entre ubicaciones
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />

      {ajustando && (
        <ModalMovimientoProducto
          item={ajustando}
          onClose={() => setAjustando(null)}
          onGuardado={() => stock.recargar()}
        />
      )}

      {trasladando && (
        <ModalTraslado
          item={trasladando}
          onClose={() => setTrasladando(null)}
          onGuardado={() => stock.recargar()}
        />
      )}
    </Pagina>
  );
}
