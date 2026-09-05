import { Anchor, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { Link } from 'react-router';

type Props = {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Vuelta a la pantalla de la que se entró. Cada subsección es una ruta. */
  volver?: { a: string; texto: string };
  /** Acciones de la pantalla, arriba a la derecha. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
};

/** Encabezado común a toda pantalla del admin. */
export function Pagina({ titulo, descripcion, volver, acciones, children }: Props) {
  return (
    <Stack gap="md">
      <Stack gap={2}>
        {volver && (
          <Anchor component={Link} to={volver.a} size="xs" c="dimmed" w="fit-content">
            <Group gap={2} wrap="nowrap">
              <IconChevronLeft size={12} />
              {volver.texto}
            </Group>
          </Anchor>
        )}
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Stack gap={0}>
            <Title order={1} fz="h3">
              {titulo}
            </Title>
            {descripcion && (
              <Text size="sm" c="dimmed">
                {descripcion}
              </Text>
            )}
          </Stack>
          {acciones && (
            <Group gap="xs" wrap="nowrap">
              {acciones}
            </Group>
          )}
        </Group>
      </Stack>
      {children}
    </Stack>
  );
}
