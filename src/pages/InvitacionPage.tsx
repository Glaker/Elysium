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
import { useNavigate, useParams } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * §10: el alta es por link, no abierta. La cuenta se crea con Supabase Auth y
 * después se canjea el token, que es lo que asigna el rol y crea el perfil.
 */
export function InvitacionPage() {
  const { token = '' } = useParams();
  const { session, refrescarPerfil } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (!session) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) {
          throw new Error(
            'Cuenta creada. Confirmá tu email y volvé a abrir este link para activarla.',
          );
        }
      }
      const { error: e3 } = await supabase.rpc('aceptar_invitacion', { p_token: token });
      if (e3) throw e3;
      await refrescarPerfil();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Center mih="100dvh" px="md">
      <Stack gap="lg" w="100%" maw={360}>
        <Stack gap={2}>
          <Title order={1} fz={30} lh={1.1}>
            Tu invitación
          </Title>
          <Text c="dimmed" size="sm">
            {session ? 'Activá tu cuenta para terminar.' : 'Creá tu cuenta para empezar.'}
          </Text>
        </Stack>

        <Card bg="dark.6">
          <form onSubmit={activar}>
            <Stack gap="sm">
              {!session && (
                <>
                  <TextInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    required
                  />
                  <PasswordInput
                    label="Elegí una contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                    minLength={8}
                  />
                </>
              )}
              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}
              <Button type="submit" fullWidth size="md" loading={enviando}>
                {session ? 'Activar mi cuenta' : 'Crear cuenta y activar'}
              </Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Center>
  );
}
