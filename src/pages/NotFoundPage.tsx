import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack gap="xs">
      <Title order={1}>404</Title>
      <Text c="dimmed">Esta página no existe.</Text>
      <Anchor component={Link} to="/">
        Volver al inicio
      </Anchor>
    </Stack>
  );
}
