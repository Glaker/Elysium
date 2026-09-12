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
  IconBuildingFactory2,
  IconCalculator,
  IconFlask,
  IconLogout,
  IconReceipt2,
  IconShoppingCart,
  IconStack2,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';
import { NavLink as RouterLink, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/app/useAuth';

type Area = { nombre: string; ruta: string; icono: Icon; lista: boolean };

/**
 * Las ocho áreas del admin. Las que no están implementadas quedan visibles y
 * deshabilitadas: que se vea el mapa completo del sistema es información, no
 * ruido.
 */
const AREAS: Area[] = [
  { nombre: 'Insumos', ruta: '/admin/insumos', icono: IconFlask, lista: true },
  { nombre: 'Productos', ruta: '/admin/productos', icono: IconBoxSeam, lista: true },
  { nombre: 'Lotes', ruta: '/admin/lotes', icono: IconBuildingFactory2, lista: true },
  { nombre: 'Stock', ruta: '/admin/stock', icono: IconStack2, lista: true },
  { nombre: 'Ventas', ruta: '/admin/ventas', icono: IconShoppingCart, lista: true },
  { nombre: 'Deudores', ruta: '/admin/deudores', icono: IconUsersGroup, lista: true },
  { nombre: 'Gastos', ruta: '/admin/gastos', icono: IconReceipt2, lista: false },
  { nombre: 'Simulador', ruta: '/admin/simulador', icono: IconCalculator, lista: false },
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
  const ancho = angosta ? 56 : 200;

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{ width: ancho, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Header withBorder bg="noche.9">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text fw={700} size="sm" style={{ letterSpacing: 0.6 }}>
              ELYSIUM
            </Text>
            <Badge size="xs" variant="light" color="violeta" radius="sm" tt="none">
              Administración
            </Badge>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              {perfil?.nombre}
            </Text>
            <Tooltip label="Salir">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Salir"
                onClick={() => void salir()}
              >
                <IconLogout size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar withBorder bg="noche.8" p={angosta ? 4 : 'xs'}>
        <ScrollArea>
          <Stack gap={2}>
            {AREAS.map((a) => {
              const activa = pathname.startsWith(a.ruta);
              const icono = <a.icono size={17} stroke={1.6} />;

              const comunes = {
                active: activa,
                color: 'violeta',
                variant: 'light',
                label: angosta ? undefined : a.nombre,
                leftSection: icono,
                py: 7,
                styles: {
                  root: { borderRadius: 'var(--mantine-radius-sm)' },
                  section: angosta ? { marginInlineEnd: 0 } : undefined,
                },
              } as const;

              const item = a.lista ? (
                <NavLink key={a.ruta} component={RouterLink} to={a.ruta} {...comunes} />
              ) : (
                <NavLink key={a.ruta} component="button" disabled {...comunes} />
              );

              return angosta || !a.lista ? (
                <Tooltip
                  key={a.ruta}
                  label={a.lista ? a.nombre : `${a.nombre} — todavía sin construir`}
                  position="right"
                >
                  <Box>{item}</Box>
                </Tooltip>
              ) : (
                item
              );
            })}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
