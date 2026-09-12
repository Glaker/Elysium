import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Group,
  Menu,
  Select,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCategory,
  IconDots,
  IconEdit,
  IconEye,
  IconPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarProductos, medida, type Producto } from '@/features/productos/api';
import { plata } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'todos' | 'sin_formula' | 'no_cierra' | 'sin_precio';

/** Los tres estados que hacen que un producto no se pueda costear ni vender. */
function pendientes(p: Producto) {
  const sinFormula = p.tamanos.filter((t) => t.lineasFormula === 0);
  const noCierra = p.tamanos.filter(
    (t) => t.sumaPorcentaje != null && Number(t.sumaPorcentaje) !== 100,
  );
  const sinPrecio = p.tamanos.filter((t) => t.precio.elysium == null);
  return { sinFormula, noCierra, sinPrecio };
}

/** El rango de precios de venta del producto: de su tamaño más barato al más caro. */
function rangoPrecio(p: Producto): [number, number] | null {
  const precios = p.tamanos
    .map((t) => t.precio.elysium)
    .filter((n): n is number => n != null);
  if (!precios.length) return null;
  return [Math.min(...precios), Math.max(...precios)];
}

export function ProductosPage() {
  const navigate = useNavigate();
  const { datos, cargando, error } = useAsync(listarProductos, []);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const filas = useMemo(() => {
    const todos = datos ?? [];
    if (filtro === 'todos') return todos;
    return todos.filter((p) => {
      const { sinFormula, noCierra, sinPrecio } = pendientes(p);
      if (filtro === 'sin_formula') return sinFormula.length > 0 || !p.tamanos.length;
      if (filtro === 'no_cierra') return noCierra.length > 0;
      return sinPrecio.length > 0 || !p.tamanos.length;
    });
  }, [datos, filtro]);

  const tamanosSinPrecio = useMemo(
    () => (datos ?? []).reduce((n, p) => n + pendientes(p).sinPrecio.length, 0),
    [datos],
  );

  const columnas: Columna<Producto>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      orden: (p) => p.nombre,
      render: (p) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={p.activo ? undefined : 'dimmed'}>
            {p.nombre}
          </Text>
          {!p.activo && <BadgeEstado>Inactivo</BadgeEstado>}
          {p.margenPct != null && (
            <BadgeEstado ayuda="Este producto tiene margen propio: pisa el margen global al calcular el precio recomendado.">
              Margen {p.margenPct}%
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'linea',
      titulo: 'Línea',
      ancho: 170,
      orden: (p) => p.linea,
      render: (p) =>
        p.linea ? (
          <Text size="sm" c="dimmed">
            {p.linea}
          </Text>
        ) : (
          <DatoIncompleto titulo="Sin línea de negocio asignada" />
        ),
    },
    {
      clave: 'tamanos',
      titulo: 'Tamaños',
      ancho: 200,
      orden: (p) => p.tamanos.length,
      render: (p) =>
        p.tamanos.length ? (
          <Text size="sm" c="dimmed">
            {p.tamanos.map((t) => medida(t)).join(' · ')}
          </Text>
        ) : (
          <DatoIncompleto
            titulo="Sin tamaños"
            faltantes={['el tamaño es lo que se stockea, se vende y tiene precio']}
          />
        ),
    },
    {
      clave: 'formula',
      titulo: 'Fórmula',
      ancho: 170,
      orden: (p) => pendientes(p).sinFormula.length,
      render: (p) => {
        const { sinFormula, noCierra } = pendientes(p);
        if (!p.tamanos.length) return null;
        if (sinFormula.length)
          return (
            <BadgeEstado
              tono="advertencia"
              ayuda="Sin fórmula no hay costo, y sin costo no hay precio recomendado."
            >
              {sinFormula.length} sin fórmula
            </BadgeEstado>
          );
        if (noCierra.length)
          return (
            <BadgeEstado
              tono="advertencia"
              ayuda="Los porcentajes no suman 100. Puede ser a propósito (§3.1 documenta el Shampoo Café al 101%), pero conviene mirarlo."
            >
              No suma 100
            </BadgeEstado>
          );
        return (
          <Text size="sm" c="dimmed">
            completa
          </Text>
        );
      },
    },
    {
      clave: 'precio',
      titulo: 'Precio de venta',
      numerica: true,
      ancho: 180,
      orden: (p) => rangoPrecio(p)?.[0] ?? null,
      render: (p) => {
        const rango = rangoPrecio(p);
        if (!rango)
          return (
            <DatoIncompleto
              titulo="Sin precio de venta"
              faltantes={['ningún tamaño tiene precio cargado']}
            />
          );
        const [min, max] = rango;
        return min === max ? (
          <Numero valor={min} formato={plata} />
        ) : (
          <Text size="sm" className="tabular">
            {plata(min)} – {plata(max)}
          </Text>
        );
      },
    },
  ];

  return (
    <Pagina
      titulo="Productos y fórmulas"
      descripcion="El producto agrupa; el tamaño es lo que se stockea, se vende y tiene precio."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/productos/lineas"
            leftSection={<IconCategory size={15} />}
          >
            Líneas de negocio
          </Button>
          <Button
            component={Link}
            to="/admin/productos/nuevo"
            leftSection={<IconPlus size={15} />}
          >
            Nuevo producto
          </Button>
        </>
      }
    >
      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar los productos"
        >
          {error}
        </Alert>
      )}

      {tamanosSinPrecio > 0 && filtro !== 'sin_precio' && (
        <Alert color="advertencia" variant="light" py={6}>
          <Group gap={6}>
            <Text size="sm">
              {tamanosSinPrecio} {tamanosSinPrecio === 1 ? 'tamaño' : 'tamaños'} sin
              precio de venta cargado.
            </Text>
            <Anchor size="sm" onClick={() => setFiltro('sin_precio')}>
              Ver cuáles
            </Anchor>
          </Group>
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(p) => p.id}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(p) => `${p.nombre} ${p.linea ?? ''} ${p.descripcion ?? ''}`}
        placeholderBusqueda="Buscar producto, línea…  (/)"
        onFila={(p) => navigate(`/admin/productos/${p.id}`)}
        filtros={
          <Select
            w={210}
            aria-label="Qué falta"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'todos') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'todos', label: 'Todos los productos' },
              { value: 'sin_formula', label: 'Sin fórmula' },
              { value: 'no_cierra', label: 'Fórmula que no suma 100' },
              { value: 'sin_precio', label: 'Sin precio de venta' },
            ]}
          />
        }
        vacio={{
          titulo: 'Todavía no hay productos',
          descripcion:
            'Un producto agrupa tamaños. El costo y el precio viven en el tamaño, no acá.',
          accion: (
            <Button
              component={Link}
              to="/admin/productos/nuevo"
              leftSection={<IconPlus size={15} />}
            >
              Cargar el primero
            </Button>
          ),
        }}
        acciones={(p) => (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Acciones de ${p.nombre}`}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEye size={14} />}
                onClick={() => navigate(`/admin/productos/${p.id}`)}
              >
                Ver ficha
              </Menu.Item>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => navigate(`/admin/productos/${p.id}/editar`)}
              >
                Editar producto
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />
    </Pagina>
  );
}
