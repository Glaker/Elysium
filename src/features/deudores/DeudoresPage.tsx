import { Alert, Button, Group, Select, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconUsers } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarDeudores, type Deudor } from '@/features/deudores/api';
import { diasDesde, fecha as fmtFecha, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'deben' | 'todos';

/** A los dos meses sin cobrar, una deuda deja de parecer un olvido. */
const DIAS_VIEJA = 60;

export function DeudoresPage() {
  const navigate = useNavigate();
  const { datos, cargando, error } = useAsync(listarDeudores, []);
  const [filtro, setFiltro] = useState<Filtro>('deben');

  const filas = useMemo(() => {
    const todos = datos ?? [];
    return filtro === 'todos' ? todos : todos.filter((d) => d.deudaTotal > 0);
  }, [datos, filtro]);

  const total = (datos ?? []).reduce((n, d) => n + Math.max(d.deudaTotal, 0), 0);

  const columnas: Columna<Deudor>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      orden: (d) => d.nombre,
      render: (d) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={d.activo ? undefined : 'dimmed'}>
            {d.nombre}
          </Text>
          {d.esRevendedor && (
            <BadgeEstado ayuda="Se lleva mercadería para revender: paga el costo, no el precio de lista.">
              Revendedora
            </BadgeEstado>
          )}
          {!d.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'ventas',
      titulo: 'Ventas impagas',
      numerica: true,
      ancho: 150,
      orden: (d) => d.ventasImpagas,
      render: (d) =>
        d.ventasImpagas ? (
          <Numero valor={d.ventasImpagas} />
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    },
    {
      clave: 'vieja',
      titulo: 'Deuda más vieja',
      numerica: true,
      ancho: 180,
      orden: (d) => d.deudaMasVieja,
      render: (d) => {
        if (!d.deudaMasVieja)
          return (
            <Text size="sm" c="dimmed">
              —
            </Text>
          );
        const dias = diasDesde(d.deudaMasVieja) ?? 0;
        const vieja = dias > DIAS_VIEJA;
        return (
          <Tooltip label={`Hace ${dias} días. El FIFO cobra esta primero.`}>
            <Group gap={5} wrap="nowrap" justify="flex-end" style={{ cursor: 'help' }}>
              <Text size="sm" className="tabular" c={vieja ? 'advertencia.4' : 'dimmed'}>
                {fmtFecha(d.deudaMasVieja)}
              </Text>
              {vieja && <BadgeEstado tono="advertencia">{dias} días</BadgeEstado>}
            </Group>
          </Tooltip>
        );
      },
    },
    {
      clave: 'deuda',
      titulo: 'Debe',
      numerica: true,
      ancho: 160,
      orden: (d) => d.deudaTotal,
      render: (d) =>
        d.deudaTotal > 0 ? (
          <Numero
            valor={d.deudaTotal}
            formato={(n) => importe(n, 'ARS')}
            fw={700}
            c="advertencia.4"
          />
        ) : d.deudaTotal < 0 ? (
          <Tooltip label="Pagó de más: tiene saldo a favor.">
            <span>
              <Numero
                valor={d.deudaTotal}
                formato={(n) => importe(n, 'ARS')}
                c="dimmed"
              />
            </span>
          </Tooltip>
        ) : (
          <Text size="sm" c="dimmed">
            al día
          </Text>
        ),
    },
  ];

  return (
    <Pagina
      titulo="Deudores"
      descripcion="Quién debe y cuánto. Sale de restarle a cada venta lo que se le imputó: no se carga a mano."
      acciones={
        <Button
          variant="default"
          component={Link}
          to="/admin/deudores/personas"
          leftSection={<IconUsers size={15} />}
        >
          Personas
        </Button>
      }
    >
      {error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar los deudores"
        >
          {error}
        </Alert>
      )}

      {total > 0 && (
        <Alert color="advertencia" variant="light" py={6}>
          <Text size="sm">
            Total por cobrar: <strong>{importe(total, 'ARS')}</strong>
          </Text>
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(d) => d.personaId}
        columnas={columnas}
        cargando={cargando}
        textoBusqueda={(d) => d.nombre}
        placeholderBusqueda="Buscar persona…  (/)"
        onFila={(d) => navigate(`/admin/deudores/${d.personaId}`)}
        anchoMinimo={720}
        filtros={
          <Select
            w={190}
            aria-label="A quiénes mostrar"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'deben') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'deben', label: 'Solo quienes deben' },
              { value: 'todos', label: 'Todas las personas' },
            ]}
          />
        }
        vacio={{
          titulo: filtro === 'deben' ? 'Nadie debe nada' : 'Todavía no hay personas',
          descripcion:
            filtro === 'deben'
              ? 'Las deudas aparecen solas cuando se confirma una venta que no se cobró en el acto.'
              : 'Cargá a quienes te compran o fabrican para poder registrarles ventas y pagos.',
          accion: (
            <Button
              component={Link}
              to="/admin/deudores/personas"
              leftSection={<IconUsers size={15} />}
            >
              Ir a personas
            </Button>
          ),
        }}
      />
    </Pagina>
  );
}
