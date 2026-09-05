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
  IconCheck,
  IconCurrencyDollar,
  IconDots,
  IconEdit,
  IconEye,
  IconPlus,
  IconTruck,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  ETIQUETA_TIPO,
  factorUnidad,
  listarInsumos,
  type Insumo,
} from '@/features/insumos/api';
import {
  DIAS_ALERTA,
  PrecioVigente,
  ProveedorCelda,
  UltimaVerificacion,
} from '@/features/insumos/celdas';
import { ModalPrecio } from '@/features/insumos/ModalPrecio';
import { useAsync } from '@/lib/useAsync';

type FiltroPrecio = 'todos' | 'sin_precio' | 'vencido' | 'al_dia';

/**
 * El número con el que ordena y filtra la columna de precio: el de lista
 * convertido a pesos, o el costo calculado de una MP intermedia. Nunca el
 * precio en su moneda, que no es comparable entre filas.
 */
function precioComparable(i: Insumo): number | null {
  if (i.origen === 'producido') {
    return i.costo?.costo == null ? null : Number(i.costo.costo) * factorUnidad(i.unidad);
  }
  return i.precioARS;
}

export function InsumosPage() {
  const navigate = useNavigate();
  const { datos, cargando, error, recargar } = useAsync(listarInsumos, []);
  const [filtro, setFiltro] = useState<FiltroPrecio>('todos');
  const [precioDe, setPrecioDe] = useState<Insumo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const filas = useMemo(() => {
    const todos = datos ?? [];
    if (filtro === 'todos') return todos;
    return todos.filter((i) => {
      const dias = i.diasSinVerificar;
      if (filtro === 'sin_precio') return precioComparable(i) == null;
      if (i.origen === 'producido' || dias == null) return false;
      return filtro === 'vencido' ? dias > DIAS_ALERTA : dias <= DIAS_ALERTA;
    });
  }, [datos, filtro]);

  const pendientes = useMemo(
    () =>
      // Solo los que TIENEN precio y quedó viejo. Un insumo sin precio no está
      // "vencido": es un problema distinto, y tiene su propio filtro.
      (datos ?? []).filter(
        (i) =>
          i.origen === 'comprado' &&
          i.precio != null &&
          (i.diasSinVerificar ?? 0) > DIAS_ALERTA,
      ).length,
    [datos],
  );

  const columnas: Columna<Insumo>[] = [
    {
      clave: 'nombre',
      titulo: 'Insumo',
      orden: (i) => i.nombre,
      render: (i) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={i.activo ? undefined : 'dimmed'}>
            {i.nombre}
          </Text>
          {i.origen === 'producido' && (
            <BadgeEstado ayuda="Materia prima intermedia: Elysium la fabrica, no la compra. Su costo sale de la composición.">
              Producido
            </BadgeEstado>
          )}
          {!i.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 130,
      orden: (i) => ETIQUETA_TIPO[i.tipo],
      render: (i) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO[i.tipo]}
        </Text>
      ),
    },
    {
      clave: 'unidad',
      titulo: 'Unidad',
      ancho: 80,
      orden: (i) => i.unidad,
      render: (i) => (
        <Text size="sm" c="dimmed">
          {i.unidad}
        </Text>
      ),
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      ancho: 200,
      orden: (i) => i.proveedor,
      render: (i) => <ProveedorCelda insumo={i} />,
    },
    {
      clave: 'precio',
      titulo: 'Precio vigente',
      numerica: true,
      ancho: 190,
      orden: precioComparable,
      render: (i) => <PrecioVigente insumo={i} />,
    },
    {
      clave: 'verificacion',
      titulo: 'Última verificación',
      numerica: true,
      ancho: 160,
      orden: (i) => i.verificadoEn,
      render: (i) => <UltimaVerificacion insumo={i} />,
    },
  ];

  return (
    <Pagina
      titulo="Insumos y precios"
      descripcion="Lo que se compra y lo que Elysium fabrica para usar como materia prima."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/insumos/proveedores"
            leftSection={<IconTruck size={15} />}
          >
            Proveedores
          </Button>
          <Button
            component={Link}
            to="/admin/insumos/nuevo"
            leftSection={<IconPlus size={15} />}
          >
            Nuevo insumo
          </Button>
        </>
      }
    >
      {aviso && (
        <Alert
          color="exito"
          variant="light"
          icon={<IconCheck size={16} />}
          onClose={() => setAviso(null)}
          withCloseButton
          py={6}
        >
          {aviso}
        </Alert>
      )}

      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar los insumos"
        >
          {error}
        </Alert>
      )}

      {pendientes > 0 && filtro !== 'vencido' && (
        <Alert color="advertencia" variant="light" py={6}>
          <Group gap={6}>
            <Text size="sm">
              {pendientes} {pendientes === 1 ? 'insumo tiene' : 'insumos tienen'} el
              precio sin verificar hace más de {DIAS_ALERTA} días.
            </Text>
            <Anchor size="sm" onClick={() => setFiltro('vencido')}>
              Ver cuáles
            </Anchor>
          </Group>
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(i) => i.id}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(i) =>
          `${i.nombre} ${i.proveedor ?? ''} ${ETIQUETA_TIPO[i.tipo]} ${i.unidad}`
        }
        placeholderBusqueda="Buscar insumo, proveedor…  (/)"
        onFila={(i) => navigate(`/admin/insumos/${i.id}`)}
        filtros={
          <Select
            w={200}
            aria-label="Estado del precio"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'todos') as FiltroPrecio)}
            allowDeselect={false}
            data={[
              { value: 'todos', label: 'Todos los precios' },
              { value: 'sin_precio', label: 'Sin precio' },
              { value: 'vencido', label: `Vencidos (+${DIAS_ALERTA} días)` },
              { value: 'al_dia', label: 'Al día' },
            ]}
          />
        }
        vacio={{
          titulo: 'Todavía no hay insumos',
          descripcion:
            'El catálogo de insumos es lo primero: sin él no hay costo de producto.',
          accion: (
            <Button
              component={Link}
              to="/admin/insumos/nuevo"
              leftSection={<IconPlus size={15} />}
            >
              Cargar el primero
            </Button>
          ),
        }}
        acciones={(i) => (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Acciones de ${i.nombre}`}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEye size={14} />}
                onClick={() => navigate(`/admin/insumos/${i.id}`)}
              >
                Ver ficha
              </Menu.Item>
              {i.origen === 'comprado' && (
                <Menu.Item
                  leftSection={<IconCurrencyDollar size={14} />}
                  onClick={() => setPrecioDe(i)}
                >
                  Cargar precio
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => navigate(`/admin/insumos/${i.id}/editar`)}
              >
                Editar insumo
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />

      {precioDe && (
        <ModalPrecio
          insumo={precioDe}
          onClose={() => setPrecioDe(null)}
          onGuardado={() => {
            setAviso('Precio registrado.');
            recargar();
          }}
        />
      )}
    </Pagina>
  );
}
