import { Alert, Button, Group, Paper, SimpleGrid, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingFactory2,
  IconPlus,
  IconReceipt2,
  IconUsersGroup,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import { Pagina } from '@/components/ui/Pagina';
import { cargarResumen } from '@/features/inicio/api';
import { cantidad, importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Tarjeta = {
  rotulo: string;
  valor: number;
  formato?: (n: number) => string;
  pie: string;
  a: string;
  /** Lo que espera respuesta se pinta; lo que solo informa, no. */
  color?: string;
};

/**
 * La primera pantalla del admin.
 *
 * Responde "¿hay algo esperándome?" antes de que haya que abrir cuatro áreas
 * para enterarse. Son cifras que ya existen en otras pantallas: acá no se
 * decide nada, se entra. Por eso cada tarjeta es un link a la pantalla donde
 * ese número se puede tocar, y no hay ninguna acción que solo viva acá.
 */
export function InicioPage() {
  const { datos, cargando, error } = useAsync(cargarResumen, []);

  const tarjetas: Tarjeta[] = [
    {
      rotulo: 'Pedidos sin responder',
      valor: datos?.pendientes ?? 0,
      pie: 'Lo que la gente pidió desde su cuenta',
      a: '/admin/ventas/solicitudes',
      color: (datos?.pendientes ?? 0) > 0 ? 'advertencia.4' : undefined,
    },
    {
      rotulo: 'Ventas en borrador',
      valor: datos?.borradores ?? 0,
      pie: 'Sin confirmar: todavía no descontaron stock',
      a: '/admin/ventas',
    },
    {
      rotulo: 'Deuda del padrón',
      valor: datos?.deudaTotal ?? 0,
      formato: (n) => importe(n, 'ARS'),
      pie: `${datos?.deudores ?? 0} ${datos?.deudores === 1 ? 'persona debe' : 'personas deben'}`,
      a: '/admin/deudores',
    },
    {
      rotulo: 'Vendido este mes',
      valor: datos?.ventasDelMes ?? 0,
      formato: (n) => importe(n, 'ARS'),
      pie: `${datos?.cuantasVentas ?? 0} ventas confirmadas · ${importe(datos?.gastosDelMes ?? 0, 'ARS')} de gastos`,
      a: '/admin/ventas',
    },
  ];

  return (
    <Pagina
      titulo="Inicio"
      descripcion="Lo que está esperando respuesta, y cómo viene el mes."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/lotes/nuevo"
            leftSection={<IconBuildingFactory2 size={15} />}
          >
            Nuevo lote
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
          title="No se pudo cargar el resumen"
        >
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {tarjetas.map((t) => (
          <Paper
            key={t.rotulo}
            withBorder
            p="md"
            bg="noche.6"
            component={Link}
            to={t.a}
            style={{ textDecoration: 'none' }}
          >
            <Text size="xs" c="dimmed">
              {t.rotulo}
            </Text>
            <Text className="tabular" fz={30} fw={700} lh={1.2} mt={2} c={t.color}>
              {cargando ? '—' : (t.formato ?? cantidad)(t.valor)}
            </Text>
            <Text size="xs" c="dimmed" mt={6}>
              {t.pie}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder p="md" bg="noche.6">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <IconUsersGroup size={17} />
            <Text size="sm" c="dimmed">
              ¿Entró alguien nuevo? Dalo de alta en el padrón e invitalo a su cuenta.
            </Text>
          </Group>
          <Button
            variant="subtle"
            component={Link}
            to="/admin/personas"
            rightSection={<IconArrowRight size={15} />}
          >
            Ir a personas
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="md" bg="noche.6">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <IconReceipt2 size={17} />
            <Text size="sm" c="dimmed">
              Un gasto que es la compra de un insumo entra al stock en el mismo acto.
            </Text>
          </Group>
          <Button
            variant="subtle"
            component={Link}
            to="/admin/gastos"
            rightSection={<IconArrowRight size={15} />}
          >
            Ir a gastos
          </Button>
        </Group>
      </Paper>
    </Pagina>
  );
}
