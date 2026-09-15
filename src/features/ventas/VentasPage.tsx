import { Alert, Anchor, Badge, Button, Group, Select, Text } from '@mantine/core';
import { IconAlertTriangle, IconInbox, IconPlus, IconWallet } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { contarPendientes } from '@/features/solicitudes/api';
import { ETIQUETA_TIPO_VENTA, listarVentas, type Venta } from '@/features/ventas/api';
import { fecha as fmtFecha, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'todas' | 'borradores' | 'impagas' | 'anuladas';

/** El estado de la venta, incluido el de cobranza, en una sola marca. */
export function EstadoVentaBadge({ v }: { v: Venta }) {
  if (v.estado === 'borrador')
    return (
      <BadgeEstado tono="advertencia" ayuda="Todavía no descontó stock ni generó deuda.">
        Borrador
      </BadgeEstado>
    );
  if (v.estado === 'anulada') return <BadgeEstado>Anulada</BadgeEstado>;
  if (v.saldo <= 0)
    return (
      <BadgeEstado ayuda="No queda saldo: los pagos imputados cubren el total.">
        Cobrada
      </BadgeEstado>
    );
  return (
    <BadgeEstado tono="advertencia" ayuda="Queda saldo pendiente de cobro.">
      Adeuda
    </BadgeEstado>
  );
}

export function VentasPage() {
  const navigate = useNavigate();
  const { datos, cargando, error } = useAsync(listarVentas, []);
  const pedidos = useAsync(contarPendientes, []);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const filas = useMemo(() => {
    const todas = datos ?? [];
    if (filtro === 'todas') return todas.filter((v) => v.estado !== 'anulada');
    if (filtro === 'borradores') return todas.filter((v) => v.estado === 'borrador');
    if (filtro === 'anuladas') return todas.filter((v) => v.estado === 'anulada');
    return todas.filter((v) => v.estado === 'confirmada' && v.saldo > 0);
  }, [datos, filtro]);

  const porCobrar = (datos ?? [])
    .filter((v) => v.estado === 'confirmada' && v.saldo > 0)
    .reduce((n, v) => n + v.saldo, 0);

  const columnas: Columna<Venta>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 110,
      orden: (v) => v.fecha,
      render: (v) => (
        <Text size="sm" className="tabular">
          {fmtFecha(v.fecha)}
        </Text>
      ),
    },
    {
      clave: 'persona',
      titulo: 'A quién',
      orden: (v) => v.persona,
      render: (v) =>
        v.persona ? (
          <Group gap={6} wrap="nowrap">
            <Text size="sm" fw={500}>
              {v.persona}
            </Text>
            {v.aNombreDe && (
              <Text size="xs" c="dimmed">
                a nombre de {v.aNombreDe}
              </Text>
            )}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            sin nombre
          </Text>
        ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 170,
      orden: (v) => v.tipo,
      render: (v) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO_VENTA[v.tipo]}
        </Text>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 120,
      orden: (v) => `${v.estado}${v.saldo > 0 ? '1' : '0'}`,
      render: (v) => <EstadoVentaBadge v={v} />,
    },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      ancho: 140,
      orden: (v) => v.total,
      render: (v) =>
        v.estado === 'borrador' && !v.lineas ? (
          <DatoIncompleto titulo="Sin líneas cargadas" />
        ) : (
          <Numero valor={v.total} formato={(n) => importe(n, 'ARS')} fw={500} />
        ),
    },
    {
      clave: 'saldo',
      titulo: 'Saldo',
      numerica: true,
      ancho: 140,
      orden: (v) => v.saldo,
      render: (v) =>
        v.estado !== 'confirmada' ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : v.saldo <= 0 ? (
          <Text size="sm" c="dimmed">
            saldada
          </Text>
        ) : (
          <Numero
            valor={v.saldo}
            formato={(n) => importe(n, 'ARS')}
            fw={600}
            c="advertencia.4"
          />
        ),
    },
  ];

  return (
    <Pagina
      titulo="Ventas"
      descripcion="Los dos flujos: la venta directa y la entrega para reventa. La deuda sale de acá, no se carga aparte."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/ventas/solicitudes"
            leftSection={<IconInbox size={15} />}
            rightSection={
              pedidos.datos ? (
                <Badge size="sm" variant="light" color="advertencia" radius="sm">
                  {pedidos.datos}
                </Badge>
              ) : undefined
            }
          >
            Pedidos
          </Button>
          <Button
            variant="default"
            component={Link}
            to="/admin/ventas/cuentas"
            leftSection={<IconWallet size={15} />}
          >
            Cuentas
          </Button>
          <Button
            component={Link}
            to="/admin/ventas/nueva"
            leftSection={<IconPlus size={15} />}
          >
            Nueva venta
          </Button>
        </>
      }
    >
      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar las ventas"
        >
          {error}
        </Alert>
      )}

      {porCobrar > 0 && filtro !== 'impagas' && (
        <Alert color="advertencia" variant="light" py={6}>
          <Group gap={6}>
            <Text size="sm">
              Hay {importe(porCobrar, 'ARS')} sin cobrar en ventas confirmadas.
            </Text>
            <Anchor size="sm" onClick={() => setFiltro('impagas')}>
              Ver cuáles
            </Anchor>
          </Group>
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(v) => v.id}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(v) => `${v.persona ?? ''} ${v.aNombreDe ?? ''} ${v.notas ?? ''}`}
        placeholderBusqueda="Buscar por persona…  (/)"
        onFila={(v) => navigate(`/admin/ventas/${v.id}`)}
        anchoMinimo={860}
        filtros={
          <Select
            w={190}
            aria-label="Qué ventas"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'todas') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'todas', label: 'Todas' },
              { value: 'borradores', label: 'Borradores' },
              { value: 'impagas', label: 'Con saldo' },
              { value: 'anuladas', label: 'Anuladas' },
            ]}
          />
        }
        vacio={{
          titulo: 'Todavía no hay ventas',
          descripcion:
            'Una venta se carga como borrador, se le agregan líneas y al confirmarla congela importes y descuenta stock.',
          accion: (
            <Button
              component={Link}
              to="/admin/ventas/nueva"
              leftSection={<IconPlus size={15} />}
            >
              Cargar la primera
            </Button>
          ),
        }}
      />
    </Pagina>
  );
}
