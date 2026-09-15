import { ActionIcon, Alert, Anchor, Button, Group, Text } from '@mantine/core';
import { IconAdjustments, IconAlertTriangle, IconHistory } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarInsumos } from '@/features/insumos/api';
import { stockInsumos, type StockInsumo } from '@/features/stock/api';
import { ModalMovimientoInsumo } from '@/features/stock/ModalMovimiento';
import { useAsync } from '@/lib/useAsync';

/**
 * El stock de insumos. Sin ubicaciones: el modelo no las lleva para insumos, y
 * en el depósito de Johanna no hacen falta — lo que importa es si alcanza para
 * el próximo lote.
 */
export function StockInsumosPage() {
  const insumos = useAsync(listarInsumos, []);
  const stock = useAsync(
    async () =>
      insumos.datos
        ? stockInsumos(
            insumos.datos.map((i) => ({ id: i.id, nombre: i.nombre, unidad: i.unidad })),
          )
        : null,
    ['stock-insumos', insumos.datos?.length],
  );
  const [ajustando, setAjustando] = useState<StockInsumo | null>(null);

  const columnas: Columna<StockInsumo>[] = [
    {
      clave: 'nombre',
      titulo: 'Insumo',
      orden: (s) => s.nombre,
      render: (s) => (
        <Anchor component={Link} to={`/admin/insumos/${s.insumoId}`} size="sm">
          {s.nombre}
        </Anchor>
      ),
    },
    {
      clave: 'unidad',
      titulo: 'Unidad',
      ancho: 110,
      orden: (s) => s.unidadChica,
      render: (s) => (
        <Text size="sm" c="dimmed">
          {s.unidadChica}
        </Text>
      ),
    },
    {
      clave: 'stock',
      titulo: 'Stock',
      numerica: true,
      ancho: 160,
      orden: (s) => s.stock,
      render: (s) => (
        <Group gap={6} wrap="nowrap" justify="flex-end">
          <Numero
            valor={s.stock}
            sufijo={s.unidadChica}
            fw={600}
            c={s.stock < 0 ? 'error.4' : undefined}
          />
          {s.stock === 0 && (
            <BadgeEstado ayuda="Nunca entró, o ya se consumió todo.">
              sin stock
            </BadgeEstado>
          )}
        </Group>
      ),
    },
  ];

  const negativos = (stock.datos ?? []).filter((s) => s.stock < 0);

  return (
    <Pagina
      titulo="Stock de insumos"
      descripcion="Cuánto hay de cada insumo, en la misma unidad en la que se escriben las fórmulas."
      acciones={
        <Button
          variant="default"
          component={Link}
          to="/admin/stock/movimientos"
          leftSection={<IconHistory size={15} />}
        >
          Movimientos
        </Button>
      }
    >
      {(insumos.error || stock.error) && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudo cargar el stock"
        >
          {insumos.error ?? stock.error}
        </Alert>
      )}

      {negativos.length > 0 && (
        <Alert color="error" variant="light" py={6}>
          <Text size="sm">
            {negativos.length === 1
              ? 'Un insumo tiene'
              : `${negativos.length} insumos tienen`}{' '}
            stock negativo: se consumieron en lotes sin haber registrado la compra.
          </Text>
        </Alert>
      )}

      <Tabla
        filas={stock.datos ?? null}
        idDe={(s) => s.insumoId}
        columnas={columnas}
        cargando={insumos.cargando || stock.cargando}
        textoBusqueda={(s) => s.nombre}
        placeholderBusqueda="Buscar insumo…  (/)"
        anchoMinimo={560}
        vacio={{
          titulo: 'Todavía no hay insumos',
          descripcion: 'Cargá el catálogo de insumos y después registrá lo que tenés.',
          accion: (
            <Button component={Link} to="/admin/insumos">
              Ir a insumos
            </Button>
          ),
        }}
        acciones={(s) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Registrar movimiento de ${s.nombre}`}
            onClick={() => setAjustando(s)}
          >
            <IconAdjustments size={16} />
          </ActionIcon>
        )}
      />

      {ajustando && (
        <ModalMovimientoInsumo
          item={ajustando}
          onClose={() => setAjustando(null)}
          onGuardado={() => stock.recargar()}
        />
      )}
    </Pagina>
  );
}
