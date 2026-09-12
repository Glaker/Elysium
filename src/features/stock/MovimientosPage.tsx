import { Alert, Anchor, Group, Select, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarMovimientos, type Movimiento } from '@/features/stock/api';
import { fecha as fmtFecha } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'todos' | 'producto' | 'insumo';

/**
 * El libro de movimientos: las dos tablas en una línea de tiempo.
 *
 * Es de solo lectura y no por falta de tiempo: los movimientos son inmutables
 * en la base. Esta pantalla es el registro de lo que pasó, y su valor es
 * justamente que nadie lo puede retocar.
 */
export function MovimientosPage() {
  const { datos, cargando, error } = useAsync(() => listarMovimientos(), []);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const filas = useMemo(() => {
    const todos = datos ?? [];
    return filtro === 'todos' ? todos : todos.filter((m) => m.clase === filtro);
  }, [datos, filtro]);

  const columnas: Columna<Movimiento>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 110,
      orden: (m) => m.fecha,
      render: (m) => (
        <Text size="sm" className="tabular">
          {fmtFecha(m.fecha)}
        </Text>
      ),
    },
    {
      clave: 'que',
      titulo: 'Qué',
      orden: (m) => m.que,
      render: (m) => (
        <Group gap="xs" wrap="nowrap">
          <Anchor component={Link} to={m.ruta} size="sm">
            {m.que}
          </Anchor>
          {m.clase === 'insumo' && <BadgeEstado>Insumo</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 140,
      orden: (m) => m.tipo,
      render: (m) => (
        <Text size="sm" c="dimmed">
          {m.tipo}
        </Text>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      numerica: true,
      ancho: 130,
      orden: (m) => m.cantidad,
      render: (m) => (
        <Numero
          valor={m.cantidad}
          formato={(n) => `${n > 0 ? '+' : ''}${n.toLocaleString('es-AR')}`}
          sufijo={m.unidad}
          fw={500}
          c={m.cantidad < 0 ? 'dimmed' : undefined}
        />
      ),
    },
    {
      clave: 'ubicacion',
      titulo: 'Ubicación',
      ancho: 120,
      orden: (m) => m.ubicacion,
      render: (m) => (
        <Text size="sm" c="dimmed">
          {m.ubicacion ?? ''}
        </Text>
      ),
    },
    {
      clave: 'origen',
      titulo: 'Motivo',
      render: (m) =>
        m.loteId ? (
          <Anchor component={Link} to={`/admin/lotes/${m.loteId}`} size="sm" c="dimmed">
            {m.motivo ?? `Lote ${m.loteCodigo ?? ''}`}
          </Anchor>
        ) : (
          <Text size="sm" c="dimmed">
            {m.motivo ?? ''}
          </Text>
        ),
    },
  ];

  return (
    <Pagina
      titulo="Movimientos"
      descripcion="Todo lo que entró y salió, en orden. Nada de esto se puede editar ni borrar."
      volver={{ a: '/admin/stock', texto: 'Volver a stock' }}
    >
      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar los movimientos"
        >
          {error}
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(m) => m.id}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(m) =>
          `${m.que} ${m.tipo} ${m.motivo ?? ''} ${m.loteCodigo ?? ''}`
        }
        placeholderBusqueda="Buscar por producto, insumo, motivo…  (/)"
        anchoMinimo={920}
        filtros={
          <Select
            w={180}
            aria-label="Qué movimientos"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'todos') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'todos', label: 'Todo' },
              { value: 'producto', label: 'Solo productos' },
              { value: 'insumo', label: 'Solo insumos' },
            ]}
          />
        }
        vacio={{
          titulo: 'Todavía no hay movimientos',
          descripcion:
            'Se generan solos al cerrar un lote o confirmar una venta, y a mano desde stock.',
        }}
      />
    </Pagina>
  );
}
