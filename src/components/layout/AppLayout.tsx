import {
  ActionIcon,
  AppShell,
  Container,
  Group,
  SegmentedControl,
  Text,
  Tooltip,
} from '@mantine/core';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { BandaDeuda } from '@/components/BandaDeuda';

/**
 * Mobile-first: la misma estructura en 360px y en desktop, donde solo cambia el
 * aire alrededor. La banda de deuda va fija arriba, visible desde las dos vistas.
 */
export function AppLayout() {
  const { perfil, salir } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const seccion = pathname.startsWith('/materia-prima') ? '/materia-prima' : '/';

  return (
    <AppShell header={{ height: 52 }} padding={0}>
      <AppShell.Header withBorder>
        <Container size={520} h="100%" px="md">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Text fw={700} size="sm" style={{ letterSpacing: 0.4 }}>
              ELYSIUM
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" visibleFrom="xs">
                {perfil?.nombre}
              </Text>
              <Tooltip label="Salir">
                <ActionIcon variant="subtle" color="gray" onClick={() => void salir()}>
                  <span aria-hidden>⏻</span>
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <BandaDeuda />
        <Container size={520} px="md" py="md">
          <SegmentedControl
            fullWidth
            size="sm"
            mb="lg"
            value={seccion}
            onChange={(v) => navigate(v)}
            data={[
              { label: 'Productos', value: '/' },
              { label: 'Materia prima', value: '/materia-prima' },
            ]}
          />
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
