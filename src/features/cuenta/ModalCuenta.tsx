import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { useState } from 'react';

import { useAuth } from '@/app/useAuth';
import { guardarMisDatos } from '@/features/cuenta/api';

type Props = {
  onClose: () => void;
  /** El shell desde donde se abrió: el del usuario tiene su propia paleta. */
  tema?: 'usuario' | 'admin';
};

/**
 * Mi cuenta: los datos que uno mismo puede corregir, y la salida.
 *
 * Es lo único que había detrás de los íconos sueltos del encabezado, y ahora
 * está junto y con nombre, donde se lo busca. Cerrar sesión vive acá abajo por
 * la misma razón: es una acción de la cuenta, no de la app, y a un ícono de
 * apagado al lado del nombre se le pega sin querer.
 *
 * Se editan los tres datos del alta y nada más. El email no se toca: es la
 * credencial con la que se entra, y cambiarlo es otra cosa —confirmar el nuevo,
 * poder volver— y no un campo más de este formulario.
 *
 * Se monta recién al abrirlo —de ahí que no tenga un `abierto`— y así los campos
 * arrancan siempre de lo que hay guardado: quien escribe algo y cierra sin
 * guardar no se encuentra la próxima vez con ese texto a medias haciéndose pasar
 * por su dato real.
 */
export function ModalCuenta({ onClose, tema = 'usuario' }: Props) {
  const { session, persona, refrescarPerfil, salir } = useAuth();
  const [nombre, setNombre] = useState(persona?.nombrePila ?? '');
  const [apellido, setApellido] = useState(persona?.apellido ?? '');
  const [telefono, setTelefono] = useState(persona?.telefono ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sucio =
    nombre !== (persona?.nombrePila ?? '') ||
    apellido !== (persona?.apellido ?? '') ||
    telefono !== (persona?.telefono ?? '');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await guardarMisDatos({ nombre, apellido, telefono });
      // El encabezado, el saludo del inicio y la ficha del padrón leen todos lo
      // mismo: sin refrescar, el nombre nuevo recién aparecería al recargar.
      await refrescarPerfil();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Mi cuenta"
      size="sm"
      // El modal se dibuja en un portal, fuera del shell: sin la clase acá
      // adentro no hereda las variables del front del usuario y saldría con la
      // paleta del admin encima de una pantalla violácea.
      classNames={
        tema === 'usuario' ? { content: 'usuario', header: 'usuario' } : undefined
      }
    >
      <form onSubmit={guardar}>
        <Stack gap="md">
          {persona ? (
            <>
              <TextInput
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.currentTarget.value)}
                required
                autoComplete="given-name"
              />
              <TextInput
                label="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.currentTarget.value)}
                autoComplete="family-name"
              />
              <TextInput
                label="Teléfono"
                type="tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.currentTarget.value)}
                autoComplete="tel"
                description="Es con lo que te reconocemos cuando te vendemos."
              />
            </>
          ) : (
            <Text size="sm" c="dimmed">
              Tu cuenta todavía no tiene una ficha en el padrón, así que no hay datos para
              editar.
            </Text>
          )}

          {session?.user.email && (
            <Text size="xs" c="dimmed">
              Entrás con {session.user.email}
            </Text>
          )}

          {error && (
            <Alert color="error" variant="light">
              {error}
            </Alert>
          )}

          {persona && (
            <Group justify="flex-end">
              <Button type="submit" loading={guardando} disabled={!sucio}>
                Guardar
              </Button>
            </Group>
          )}

          {/*
            La salida, separada por la línea y abajo de todo: es la acción que
            tira todo abajo, y no tiene que caer debajo del pulgar mientras se
            corrige un teléfono.
          */}
          <Divider />
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconLogout size={17} />}
            onClick={() => void salir()}
          >
            Cerrar sesión
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
