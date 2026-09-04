import { Stack, Text, Title } from '@mantine/core';

export function HomePage() {
  return (
    <Stack gap="xs">
      <Title order={1}>Elysium</Title>
      <Text c="dimmed">El proyecto base está andando.</Text>
    </Stack>
  );
}
