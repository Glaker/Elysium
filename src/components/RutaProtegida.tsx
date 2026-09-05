import { Center, Loader, Stack, Text, Title } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router';

import type { Rol } from '@/app/authContext';
import { useAuth } from '@/app/useAuth';

export function RutaProtegida({ rol }: { rol?: Rol }) {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <Center h="60vh">
        <Loader color="gray" />
      </Center>
    );
  }

  if (!session) {
    return <Navigate to="/entrar" state={{ desde: location.pathname }} replace />;
  }

  // Sesión válida pero sin perfil: se registró y todavía no canjeó invitación.
  if (!perfil) {
    return (
      <Center h="60vh" px="md">
        <Stack gap="xs" align="center" maw={380}>
          <Title order={3}>Cuenta sin activar</Title>
          <Text c="dimmed" size="sm" ta="center">
            Tu cuenta existe pero todavía no tiene perfil. Necesitás abrir el link de
            invitación que te pasó Johanna para activarla.
          </Text>
        </Stack>
      </Center>
    );
  }

  if (rol && perfil.rol !== rol) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
