import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useBlocker } from 'react-router';

type Props = {
  children: React.ReactNode;
  onGuardar: () => void | Promise<void>;
  guardando?: boolean;
  /** Hay cambios sin guardar. Habilita el guardar y arma el aviso al salir. */
  sucio?: boolean;
  error?: string | null;
  textoGuardar?: string;
  onCancelar?: () => void;
  /** Acción destructiva u otra secundaria, a la izquierda de la barra. */
  extra?: React.ReactNode;
  ancho?: number;
};

/**
 * Layout de formulario del admin: **una columna**, etiquetas arriba del campo,
 * secciones con título cuando pasan de ocho campos, y el guardar fijo abajo
 * siempre visible.
 *
 * También se encarga del aviso antes de salir con cambios sin guardar, por las
 * dos vías por las que se puede salir: navegar dentro de la app (`useBlocker`)
 * y cerrar la pestaña (`beforeunload`).
 *
 * Lo que este componente **no** hace es validar mientras se tipea. La validación
 * corre al salir del campo (ver `useFormulario`): avisarle a Johanna que el
 * nombre está vacío mientras escribe la primera letra es hostil en un
 * formulario largo.
 */
export function Formulario({
  children,
  onGuardar,
  guardando,
  sucio,
  error,
  textoGuardar = 'Guardar',
  onCancelar,
  extra,
  ancho = 560,
}: Props) {
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      Boolean(sucio) && !guardando && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!sucio) return;
    function avisar(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sucio]);

  return (
    <>
      <Box
        component="form"
        maw={ancho}
        onSubmit={(e) => {
          e.preventDefault();
          void onGuardar();
        }}
      >
        {/*
          La hoja. Es del mismo tono que el fondo y se define por el borde: un
          formulario suelto sobre la pantalla vacía no se lee como una columna
          sino como campos abandonados a la izquierda. Subirla a `noche.6`
          aplanaría los inputs, que viven en ese escalón.
        */}
        <Paper withBorder bg="noche.7" p="lg" mb={88}>
          <Stack gap="lg">
            {children}
            {error && (
              <Alert
                color="error"
                variant="light"
                icon={<IconAlertTriangle size={16} />}
                title="No se pudo guardar"
              >
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>

        {/*
          Guardar fijo abajo, siempre visible — y alineado con la columna, no
          centrado en la pantalla: los botones tienen que caer debajo del último
          campo, no a treinta centímetros a la derecha de él. De ahí el offset de
          la barra lateral y el mismo padding que el del contenido.
        */}
        <Paper
          pos="fixed"
          bottom={0}
          left="var(--app-shell-navbar-offset, 0px)"
          right={0}
          radius={0}
          withBorder
          bg="noche.6"
          py="xs"
          px="lg"
          style={{ zIndex: 20 }}
        >
          <Group justify="space-between" maw={ancho}>
            <Group gap="xs">{extra}</Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                {sucio ? 'Cambios sin guardar' : ''}
              </Text>
              {onCancelar && (
                <Button variant="subtle" color="gray" onClick={onCancelar}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" loading={guardando} disabled={!sucio}>
                {textoGuardar}
              </Button>
            </Group>
          </Group>
        </Paper>
      </Box>

      <Modal
        opened={bloqueo.state === 'blocked'}
        onClose={() => bloqueo.reset?.()}
        title="Tenés cambios sin guardar"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Si salís ahora se pierden. ¿Querés salir igual?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => bloqueo.reset?.()}>
              Seguir editando
            </Button>
            <Button color="error" onClick={() => bloqueo.proceed?.()}>
              Salir sin guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

/** Un bloque del formulario con título. Se usa cuando hay más de ocho campos. */
function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="xs">
      <Box>
        <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: 0.6 }}>
          {titulo}
        </Text>
        {descripcion && (
          <Text size="xs" c="dimmed">
            {descripcion}
          </Text>
        )}
      </Box>
      <Divider />
      <Stack gap="sm" pt={4}>
        {children}
      </Stack>
    </Stack>
  );
}

Formulario.Seccion = Seccion;
