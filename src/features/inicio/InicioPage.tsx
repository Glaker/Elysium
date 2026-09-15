import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
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
          // `c` y `td` no son decoración: la tarjeta es un `<a>`, y un link sin
          // color propio toma el del navegador — que en esquema oscuro pinta lo
          // ya visitado de violeta y ensuciaba las cuatro cifras.
          <Paper
            key={t.rotulo}
            withBorder
            p="md"
            c="var(--mantine-color-text)"
            td="none"
            component={Link}
            to={t.a}
            className="tarjeta-link"
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

      {/*
        Dos apuntes, no dos tarjetas: no son datos de hoy, son cosas que conviene
        saber una vez. Con recuadro pesaban igual que las cuatro cifras de arriba
        y llenaban media pantalla para decir algo que se lee en cinco segundos.
      */}
      <Stack gap={8} mt={4}>
        <Group gap={8} wrap="nowrap">
          <IconUsersGroup size={15} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            ¿Se registró alguien nuevo? Aparece solo en{' '}
            <Anchor component={Link} to="/admin/personas" size="xs" inherit c="cian.4">
              Personas
            </Anchor>
            : ahí le das su rol.
          </Text>
        </Group>
        <Group gap={8} wrap="nowrap">
          <IconReceipt2 size={15} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            Un{' '}
            <Anchor component={Link} to="/admin/gastos" size="xs" inherit c="cian.4">
              gasto
            </Anchor>{' '}
            que es la compra de un insumo entra al stock en el mismo acto.
          </Text>
        </Group>
      </Stack>
    </Pagina>
  );
}
