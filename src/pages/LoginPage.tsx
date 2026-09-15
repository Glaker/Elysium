import {
  Alert,
  Anchor,
  Box,
  Button,
  Collapse,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
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

type Modo = 'entrar' | 'crear';

/**
 * Entrar y crear la cuenta, en la misma pantalla.
 *
 * El alta es abierta: no hay link de invitación. Lo que se controla no es quién
 * se registra sino qué puede hacer —una cuenta nueva es 'usuario' y ve su
 * catálogo y su deuda— y el rol lo da un admin después, desde el padrón.
 *
 * Los tres datos del alta son obligatorios y no un formulario "completá tu
 * perfil" para más tarde: sin apellido y teléfono, la persona que aparece en el
 * padrón no es nadie, y la fila que Johanna tiene que reconocer para cobrarle es
 * justamente esa. El email ya lo tenemos de la cuenta, así que no se vuelve a
 * pedir.
 */
export function LoginPage() {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation() as { state?: { desde?: string } };
  const [modo, setModo] = useState<Modo>('entrar');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!cargando && session) {
    // El admin entra a su propia app: es otra densidad y otro contexto de uso.
    const destino = location.state?.desde ?? (perfil?.rol === 'admin' ? '/admin' : '/');
    return <Navigate to={destino} replace />;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setAviso(null);

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      setEnviando(false);
      return;
    }

    // Las dos contraseñas se comparan acá y no solo mirando el campo: el aviso
    // de abajo es una ayuda mientras se escribe, esto es lo que frena el alta.
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      setEnviando(false);
      return;
    }

    // El perfil y la ficha de la persona los crea la base cuando nace la cuenta
    // (trigger `alta_de_cuenta`), con estos tres datos: el cliente no escribe en
    // `perfiles` ni en `personas`, y no debería poder.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim(),
        },
      },
    });
    if (error) setError(error.message);
    else if (!data.session) {
      // El proyecto pide confirmar el email: la cuenta ya existe y su perfil
      // también, pero todavía no hay sesión.
      setAviso('Listo. Confirmá tu email y después entrá con tu cuenta.');
      setModo('entrar');
    }
    setEnviando(false);
  }

  const creando = modo === 'crear';
  // Recién cuando la segunda ya tiene algo escrito: avisar antes sería regañar
  // a alguien por no haber terminado de tipear.
  const desparejas = creando && password2.length > 0 && password2 !== password;

  return (
    <Box
      className="usuario"
      mih="100dvh"
      px={28}
      py={40}
      style={{
        position: 'relative',
        overflowX: 'clip',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/*
        El único halo de la pantalla. Va colgado del centro del viewport —no de
        su borde de arriba— porque el contenido está centrado: así la luz cae
        sobre la marca en cualquier alto de ventana, y no queda flotando arriba
        del formulario en las pantallas altas.
      */}
      <Box
        className="halo halo-inicio"
        top="50%"
        mt={-580}
        left="50%"
        ml={-430}
        w={860}
        h={860}
      />

      <Stack
        className="entrada-inicio"
        gap={34}
        w="100%"
        maw={380}
        style={{ position: 'relative' }}
      >
        <Stack gap={18} align="center">
          <Logo size={62} />
          <Box ta="center">
            <Text className="display" fz={52} fw={800} lh={1.02}>
              Elysium
            </Text>
            <Text
              key={modo}
              className="cambio-de-modo"
              fz={15}
              c="var(--ely-texto-2)"
              mt={10}
              lh={1.5}
            >
              {creando
                ? 'Creá tu cuenta para ver tus precios y lo que debés.'
                : 'Entrá con tu cuenta para ver tus precios y lo que debés.'}
            </Text>
          </Box>
        </Stack>

        <form onSubmit={enviar}>
          <Stack gap={12}>
            <Collapse expanded={creando} keepMounted={false} transitionDuration={260}>
              <Stack gap={12}>
                <Group gap={10} grow wrap="nowrap">
                  <Box>
                    <Text className="rotulo" mb={7}>
                      Nombre
                    </Text>
                    <TextInput
                      value={nombre}
                      onChange={(e) => setNombre(e.currentTarget.value)}
                      required
                      autoComplete="given-name"
                      size="md"
                      aria-label="Nombre"
                      styles={{ input: CAMPO }}
                    />
                  </Box>
                  <Box>
                    <Text className="rotulo" mb={7}>
                      Apellido
                    </Text>
                    <TextInput
                      value={apellido}
                      onChange={(e) => setApellido(e.currentTarget.value)}
                      required
                      autoComplete="family-name"
                      size="md"
                      aria-label="Apellido"
                      styles={{ input: CAMPO }}
                    />
                  </Box>
                </Group>

                <Box>
                  <Text className="rotulo" mb={7}>
                    Teléfono
                  </Text>
                  <TextInput
                    type="tel"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.currentTarget.value)}
                    required
                    autoComplete="tel"
                    size="md"
                    aria-label="Teléfono"
                    styles={{ input: CAMPO }}
                  />
                </Box>
              </Stack>
            </Collapse>

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
                minLength={creando ? 8 : undefined}
                autoComplete={creando ? 'new-password' : 'current-password'}
                size="md"
                aria-label="Contraseña"
                styles={{ input: CAMPO }}
              />
            </Box>

            <Collapse expanded={creando} keepMounted={false} transitionDuration={260}>
              <Box>
                <Text className="rotulo" mb={7}>
                  Repetir contraseña
                </Text>
                <PasswordInput
                  value={password2}
                  onChange={(e) => setPassword2(e.currentTarget.value)}
                  required
                  autoComplete="new-password"
                  size="md"
                  aria-label="Repetir contraseña"
                  error={desparejas ? 'No coincide con la de arriba' : undefined}
                  styles={{ input: CAMPO }}
                />
              </Box>
            </Collapse>

            {aviso && (
              <Alert color="exito" variant="light">
                {aviso}
              </Alert>
            )}
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
              disabled={desparejas}
            >
              <span key={modo} className="cambio-de-modo">
                {creando ? 'Crear mi cuenta' : 'Entrar'}
              </span>
            </Button>
          </Stack>
        </form>

        <Text
          key={modo}
          className="cambio-de-modo"
          fz={13}
          c="var(--ely-texto-2)"
          ta="center"
          lh={1.55}
        >
          {creando ? '¿Ya tenés cuenta? ' : '¿Todavía no tenés cuenta? '}
          <Anchor
            component="button"
            type="button"
            fz={13}
            c="cian.4"
            onClick={() => {
              setModo(creando ? 'entrar' : 'crear');
              setPassword2('');
              setError(null);
              setAviso(null);
            }}
          >
            {creando ? 'Entrar' : 'Creala acá'}
          </Anchor>
        </Text>
      </Stack>
    </Box>
  );
}
