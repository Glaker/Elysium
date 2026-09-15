import { Alert, Box, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

/** El mismo campo oscuro de las otras pantallas del usuario. */
const CAMPO = {
  border: '1px solid var(--ely-borde)',
  background: 'var(--ely-superficie)',
  borderRadius: 12,
  height: 50,
  fontSize: 15,
};

export function LoginPage() {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation() as { state?: { desde?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cargando && session) {
    // El admin entra a su propia app: es otra densidad y otro contexto de uso.
    const destino = location.state?.desde ?? (perfil?.rol === 'admin' ? '/admin' : '/');
    return <Navigate to={destino} replace />;
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setEnviando(false);
  }

  return (
    <Box
      className="usuario"
      mih="100dvh"
      px={28}
      style={{
        position: 'relative',
        overflowX: 'clip',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box className="halo" top={120} left="50%" w={460} h={460} ml={-230} />

      <Stack gap={30} w="100%" maw={360} mt={-40} style={{ position: 'relative' }}>
        <Stack gap={16}>
          <Logo size={42} />
          <Box>
            <Text className="display" fz={38} fw={800} lh={1.05}>
              Elysium
            </Text>
            <Text fz={15} c="var(--ely-texto-2)" mt={7} lh={1.45}>
              Entrá con tu cuenta para ver tus precios y lo que debés.
            </Text>
          </Box>
        </Stack>

        <form onSubmit={entrar}>
          <Stack gap={12}>
            <Box>
              <Text className="rotulo" mb={7}>
                Email
              </Text>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="email"
                size="md"
                aria-label="Email"
                styles={{ input: CAMPO }}
              />
            </Box>

            <Box>
              <Text className="rotulo" mb={7}>
                Contraseña
              </Text>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                size="md"
                aria-label="Contraseña"
                styles={{ input: CAMPO }}
              />
            </Box>

            {error && (
              <Alert color="error" variant="light">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              size="md"
              h={52}
              radius={12}
              mt={4}
              loading={enviando}
            >
              Entrar
            </Button>
          </Stack>
        </form>

        <Text fz={12} c="var(--ely-texto-3)" ta="center" lh={1.55}>
          Las cuentas se crean con un link de invitación.
          <br />
          Si no tenés uno, pedíselo a Johanna.
        </Text>
      </Stack>
    </Box>
  );
}
