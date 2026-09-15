import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBoxSeam,
  IconHome,
  IconBuildingFactory2,
  IconCalculator,
  IconFlask,
  IconLogout,
  IconUser,
  IconReceipt2,
  IconShoppingCart,
  IconStack2,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';
import { NavLink as RouterLink, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { Logo } from '@/components/Logo';
import type { ContextoAdmin } from '@/components/layout/contextoAdmin';
import { contarPendientes } from '@/features/solicitudes/api';
import { useAsync } from '@/lib/useAsync';

type Area = { nombre: string; ruta: string; icono: Icon };
type Grupo = { titulo?: string; areas: Area[] };

/**
 * Las nueve áreas del admin, agrupadas por el momento en que se usan y no por
 * el orden en que se construyeron.
 *
 * Arriba lo que se toca todos los días (stock y ventas), después el catálogo y
 * la fábrica, después la plata, y al final el padrón —que se abre cuando entra
 * alguien nuevo, no a diario—. Lotes va con insumos y productos: es la fábrica,
 * la misma cabeza que la fórmula y no la del día a día del mostrador.
 */
const GRUPOS: Grupo[] = [
  { areas: [{ nombre: 'Inicio', ruta: '/admin', icono: IconHome }] },
  {
    titulo: 'Manejo',
    areas: [
      { nombre: 'Stock', ruta: '/admin/stock', icono: IconStack2 },
      { nombre: 'Ventas', ruta: '/admin/ventas', icono: IconShoppingCart },
    ],
  },
  {
    titulo: 'Producción',
    areas: [
      { nombre: 'Insumos', ruta: '/admin/insumos', icono: IconFlask },
      { nombre: 'Productos', ruta: '/admin/productos', icono: IconBoxSeam },
      { nombre: 'Lotes', ruta: '/admin/lotes', icono: IconBuildingFactory2 },
    ],
  },
  {
    titulo: 'Caja',
    areas: [
      { nombre: 'Gastos', ruta: '/admin/gastos', icono: IconReceipt2 },
      { nombre: 'Deudores', ruta: '/admin/deudores', icono: IconUsersGroup },
      { nombre: 'Simulador', ruta: '/admin/simulador', icono: IconCalculator },
    ],
  },
  {
    titulo: 'Usuarios',
    areas: [{ nombre: 'Personas', ruta: '/admin/personas', icono: IconUsers }],
  },
];

/**
 * El shell del admin. Es lo opuesto al front del usuario normal: escritorio,
 * sesiones largas, densidad sobre aire. La barra lateral es fija y colapsa a
 * íconos en pantallas angostas — que no se rompa en tablet alcanza, no es
 * mobile-first.
 *
 * El tinte violeta de la barra es la única aparición de la identidad en la UI.
 * Ninguna acción es violeta.
 */
export function AdminLayout() {
  const { perfil, salir } = useAuth();
  const { pathname } = useLocation();
  const angosta = useMediaQuery('(max-width: 1080px)');
  const ancho = angosta ? 64 : 236;

  // Los pedidos entran solos, desde el teléfono de otra persona: si la barra no
  // los cuenta, la bandeja es una pantalla que hay que acordarse de abrir.
  // Ámbar y no el color de acción: es algo que espera respuesta, no un botón.
  const pendientes = useAsync(contarPendientes, []);
  const sinResponder = pendientes.datos ?? 0;

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: ancho, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Header withBorder bg="noche.9">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Logo size={26} />
            <Text fw={800} fz={20} style={{ letterSpacing: 1 }}>
              ELYSIUM
            </Text>
            <Badge size="sm" variant="light" color="violeta" radius="sm" tt="none">
              Administración
            </Badge>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text fz={14} c="dimmed">
              {perfil?.nombre}
            </Text>
            <Tooltip label="Ver la app como usuario">
              <ActionIcon
                component={RouterLink}
                to="/"
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Ver la app como usuario"
              >
                <IconUser size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Salir">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Salir"
                onClick={() => void salir()}
              >
                <IconLogout size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar withBorder bg="noche.8" p={angosta ? 4 : 'xs'}>
        <ScrollArea>
          <Stack gap={2}>
            {GRUPOS.map((g, gi) => (
              <Box key={g.titulo ?? 'inicio'} mt={gi === 0 ? 0 : 10}>
                {/*
                  El rótulo con su línea separa los grupos sin dibujar cajas: es
                  el mismo recurso que usa el resto del admin —un filete y un
                  texto chico en mayúsculas— y no suma un borde más a una barra
                  que ya tiene el suyo. Colapsada a íconos no hay lugar para el
                  rótulo, así que queda solo la línea.
                */}
                {g.titulo &&
                  (angosta ? (
                    <Box
                      mx={6}
                      mb={6}
                      style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}
                    />
                  ) : (
                    <Text
                      px={8}
                      pb={5}
                      mb={4}
                      fz={11}
                      fw={700}
                      c="dimmed"
                      tt="uppercase"
                      style={{
                        letterSpacing: '0.09em',
                        borderBottom: '1px solid var(--mantine-color-dark-4)',
                      }}
                    >
                      {g.titulo}
                    </Text>
                  ))}

                <Stack gap={2}>
                  {g.areas.map((a) => {
                    // Inicio es la raíz del admin: con `startsWith` estaría
                    // activa en todas las pantallas.
                    const activa =
                      a.ruta === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(a.ruta);
                    const icono = <a.icono size={20} stroke={1.6} />;
                    const marca = a.ruta === '/admin/ventas' ? sinResponder : 0;

                    const comunes = {
                      active: activa,
                      color: 'violeta',
                      variant: 'light',
                      label: angosta ? undefined : a.nombre,
                      leftSection: icono,
                      rightSection:
                        marca > 0 && !angosta ? (
                          <Badge
                            size="sm"
                            variant="light"
                            color="advertencia"
                            radius="sm"
                          >
                            {marca}
                          </Badge>
                        ) : undefined,
                      py: 9,
                      styles: {
                        root: { borderRadius: 'var(--mantine-radius-sm)' },
                        label: { fontSize: 15 },
                        section: angosta ? { marginInlineEnd: 0 } : undefined,
                      },
                    } as const;

                    const item = (
                      <NavLink
                        key={a.ruta}
                        component={RouterLink}
                        to={a.ruta}
                        {...comunes}
                      />
                    );

                    // Colapsada a íconos, el nombre solo existe en el tooltip.
                    return angosta ? (
                      <Tooltip
                        key={a.ruta}
                        label={
                          marca > 0 ? `${a.nombre} · ${marca} sin responder` : a.nombre
                        }
                        position="right"
                      >
                        <Box>{item}</Box>
                      </Tooltip>
                    ) : (
                      item
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet
          context={{ refrescarPendientes: pendientes.recargar } satisfies ContextoAdmin}
        />
      </AppShell.Main>
    </AppShell>
  );
}
