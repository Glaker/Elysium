import { Center, Stack, Text, Title } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router';

import type { Rol } from '@/app/authContext';
import { useAuth } from '@/app/useAuth';
import { PantallaCarga } from '@/components/PantallaCarga';

/**
 * La materia prima es de quien fabrica los lotes (§10). La puerta de verdad está
 * en la base —la RLS y `calcular_insumos` rechazan a cualquier otro— y esto es
 * lo que evita que alguien llegue a una pantalla que le va a decir que no.
 *
 * El admin pasa siempre: es su app, y necesita poder mirar lo que ven los demás.
 */
export function RutaProductora() {
  const { perfil, persona, cargando } = useAuth();

  if (cargando) return <PantallaCarga />;

  return perfil?.rol === 'admin' || persona?.esProductor ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}

export function RutaProtegida({ rol }: { rol?: Rol }) {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <PantallaCarga />;

  if (!session) {
    return <Navigate to="/entrar" state={{ desde: location.pathname }} replace />;
  }

  // Sesión válida y sin perfil. Desde que el alta es abierta esto no debería
  // pasar —el perfil nace con la cuenta, en la base— salvo que la cuenta sea
  // anterior a ese cambio o que alguien la haya borrado a mano.
  if (!perfil) {
    return (
      <Center h="60vh" px="md">
        <Stack gap="xs" align="center" maw={380}>
          <Title order={3}>Cuenta sin perfil</Title>
          <Text c="dimmed" size="sm" ta="center">
            Tu cuenta existe pero no tiene perfil, así que no hay nada que mostrarte.
            Avisale a Johanna: se arregla desde la administración.
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
