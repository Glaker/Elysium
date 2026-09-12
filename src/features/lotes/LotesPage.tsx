import { ActionIcon, Alert, Button, Group, Menu, Select, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconDots,
  IconEye,
  IconPlus,
  IconLock,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarLotes, type Lote } from '@/features/lotes/api';
import { fecha as fmtFecha, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'todos' | 'abiertos' | 'cerrados';

/** El estado del lote en una sola marca: abierto, o cómo terminó. */
export function EstadoLoteBadge({ l }: { l: Lote }) {
  if (l.estado === 'abierto')
    return (
      <BadgeEstado ayuda="Todavía no se cerró: no consumió insumos ni generó stock.">
        Abierto
      </BadgeEstado>
    );

  if (l.resultado === 'descarte')
    return (
      <BadgeEstado
        tono="error"
        ayuda="Se consumieron los insumos y no entró nada al stock (§3.4)."
      >
        Descarte
      </BadgeEstado>
    );

  if (l.resultado === 'reproceso')
    return (
      <BadgeEstado
        tono="advertencia"
        ayuda="Hubo que reprocesarlo: entró menos de lo planificado."
      >
        Reproceso
      </BadgeEstado>
    );

  return <BadgeEstado>Cerrado</BadgeEstado>;
}

export function LotesPage() {
  const navigate = useNavigate();
  const { datos, cargando, error } = useAsync(listarLotes, []);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const filas = useMemo(() => {
    const todos = datos ?? [];
    if (filtro === 'todos') return todos;
    return todos.filter((l) =>
      filtro === 'abiertos' ? l.estado === 'abierto' : l.estado === 'cerrado',
    );
  }, [datos, filtro]);

  const abiertos = (datos ?? []).filter((l) => l.estado === 'abierto').length;

  const columnas: Columna<Lote>[] = [
    {
      clave: 'lote',
      titulo: 'Lote',
      ancho: 150,
      orden: (l) => l.fecha,
      render: (l) => (
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={500} className="tabular">
            {l.codigo ?? fmtFecha(l.fecha)}
          </Text>
          {l.codigo && (
            <Text size="xs" c="dimmed" className="tabular">
              {fmtFecha(l.fecha)}
            </Text>
          )}
        </Group>
      ),
    },
    {
      clave: 'produce',
      titulo: 'Produce',
      orden: (l) => l.produce,
      render: (l) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{l.produce}</Text>
          {l.destino === 'producto' && l.variante === 'marca_blanca' && (
            <BadgeEstado ayuda="Sale sin la etiqueta Elysium: ni se costea ni se consume del stock.">
              Marca blanca
            </BadgeEstado>
          )}
          {l.destino === 'mp' && (
            <BadgeEstado ayuda="Este lote produce una materia prima intermedia, no un producto terminado.">
              MP intermedia
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 120,
      orden: (l) => `${l.estado}${l.resultado ?? ''}`,
      render: (l) => <EstadoLoteBadge l={l} />,
    },
    {
      clave: 'planificadas',
      titulo: 'Planificado',
      numerica: true,
      ancho: 120,
      orden: (l) => l.planificadas,
      render: (l) => (
        <Numero valor={l.planificadas} sufijo={l.unidad} size="sm" c="dimmed" />
      ),
    },
    {
      clave: 'obtenidas',
      titulo: 'Obtenido',
      numerica: true,
      ancho: 120,
      orden: (l) => l.obtenidas,
      render: (l) =>
        l.estado === 'abierto' ? (
          <Text size="sm" c="dimmed">
            sin cerrar
          </Text>
        ) : (
          <Numero valor={l.obtenidas} sufijo={l.unidad} />
        ),
    },
    {
      clave: 'costo',
      titulo: 'Costo unitario real',
      numerica: true,
      ancho: 170,
      orden: (l) => l.costoUnitario,
      render: (l) =>
        l.estado === 'abierto' ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Numero
            valor={l.costoUnitario}
            formato={(n) => importe(n, 'ARS')}
            titulo="Costo del lote incompleto"
            faltantes={l.costoFaltantes}
          />
        ),
    },
    {
      clave: 'responsable',
      titulo: 'Responsable',
      ancho: 160,
      orden: (l) => l.responsable,
      render: (l) => (
        <Text size="sm" c="dimmed">
          {l.responsable ?? ''}
        </Text>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Lotes de producción"
      descripcion="Cada lote consume insumos, genera stock y congela su propio costo."
      acciones={
        <Button
          component={Link}
          to="/admin/lotes/nuevo"
          leftSection={<IconPlus size={15} />}
        >
          Nuevo lote
        </Button>
      }
    >
      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar los lotes"
        >
          {error}
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(l) => l.id}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(l) => `${l.codigo ?? ''} ${l.produce} ${l.responsable ?? ''}`}
        placeholderBusqueda="Buscar lote, producto, responsable…  (/)"
        onFila={(l) => navigate(`/admin/lotes/${l.id}`)}
        anchoMinimo={900}
        filtros={
          <Select
            w={190}
            aria-label="Estado del lote"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'todos') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'todos', label: 'Todos los lotes' },
              { value: 'abiertos', label: `Abiertos${abiertos ? ` (${abiertos})` : ''}` },
              { value: 'cerrados', label: 'Cerrados' },
            ]}
          />
        }
        vacio={{
          titulo: 'Todavía no hay lotes',
          descripcion:
            'Un lote es lo que convierte insumos en producto: consume del stock, genera unidades y calcula lo que costó de verdad.',
          accion: (
            <Button
              component={Link}
              to="/admin/lotes/nuevo"
              leftSection={<IconPlus size={15} />}
            >
              Planificar el primero
            </Button>
          ),
        }}
        acciones={(l) => (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Acciones del lote ${l.codigo ?? ''}`}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEye size={14} />}
                onClick={() => navigate(`/admin/lotes/${l.id}`)}
              >
                Ver el lote
              </Menu.Item>
              {l.estado === 'abierto' && (
                <Menu.Item
                  leftSection={<IconLock size={14} />}
                  onClick={() => navigate(`/admin/lotes/${l.id}?cerrar=1`)}
                >
                  Cerrar lote
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      />
    </Pagina>
  );
}
