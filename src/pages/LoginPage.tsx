import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { supabase } from '@/lib/supabase';

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
    <Center mih="100dvh" px="md">
      <Stack gap="lg" w="100%" maw={360}>
        <Stack gap={2}>
          <Title order={1} fz={30} lh={1.1}>
            Elysium
          </Title>
          <Text c="dimmed" size="sm">
            Entrá con tu cuenta para ver precios y lo que debés.
          </Text>
        </Stack>

        <Card bg="dark.6">
          <form onSubmit={entrar}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="email"
              />
              <PasswordInput
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
              />
              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}
              <Button type="submit" fullWidth size="md" loading={enviando}>
                Entrar
              </Button>
            </Stack>
          </form>
        </Card>

        <Text size="xs" c="dimmed" ta="center">
          Las cuentas se crean con un link de invitación. Si no tenés uno, pedíselo a
          Johanna.
        </Text>
      </Stack>
    </Center>
  );
}
