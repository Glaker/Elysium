import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';

import { useAuth } from '@/app/useAuth';
import { plata } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type Item = {
  tamano_id: string;
  producto: string;
  tamano: string | null;
  magnitud: number;
  unidad: string;
  importe: number | null;
  base: string;
  completo: boolean;
};

export function ProductosPage() {
  const { persona } = useAuth();
  const [pidiendo, setPidiendo] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { datos, cargando } = useAsync<Item[]>(async () => {
    // RPC: la función resuelve del lado del servidor si esta persona paga
    // precio de venta o costo. El desglose de costo nunca sale de la base.
    const { data, error } = await supabase.rpc('catalogo_para_usuario');
    if (error) throw error;
    return (data ?? []) as Item[];
  }, []);

  async function pedir(item: Item) {
    if (!persona) return;
    setPidiendo(item.tamano_id);
    setError(null);
    try {
      const { data: s, error: e1 } = await supabase
        .from('solicitudes')
        .insert({ tipo: 'producto', persona_id: persona.id })
        .select('id')
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('solicitud_lineas')
        .insert({ solicitud_id: s.id, tamano_id: item.tamano_id, cantidad: 1 });
      if (e2) throw e2;
      setPedido(item.tamano_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPidiendo(null);
    }
  }

  if (cargando) {
    return (
      <Stack gap="sm">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} h={92} radius="md" />
        ))}
      </Stack>
    );
  }

  if (!datos?.length) {
    return (
      <Stack gap={4} py="xl" align="center">
        <Text fw={600}>Todavía no hay productos</Text>
        <Text size="sm" c="dimmed" ta="center">
          Cuando Johanna cargue el catálogo, lo vas a ver acá.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={2} fz="h3">
          Productos
        </Title>
        <Text size="sm" c="dimmed">
          {datos[0]?.base === 'costo'
            ? 'Precios de entrega para reventa.'
            : 'Precios de venta al público.'}
        </Text>
      </div>

      {error && (
        <Alert color="red" variant="light" title="No se pudo enviar el pedido">
          {error}
        </Alert>
      )}

      <Stack gap="sm">
        {datos.map((item) => (
          <Card key={item.tamano_id} withBorder={false} bg="dark.6">
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} size="md" lh={1.25}>
                  {item.producto}
                </Text>
                <Text size="sm" c="dimmed">
                  {item.tamano ?? `${item.magnitud} ${item.unidad}`}
                </Text>
              </Stack>

              <Stack gap={6} align="flex-end">
                {item.completo && item.importe != null ? (
                  <Text fw={700} fz={22} c="cian.4" lh={1}>
                    {plata(Number(item.importe))}
                  </Text>
                ) : (
                  <Badge color="gray" variant="light" size="sm">
                    Sin precio
                  </Badge>
                )}
                <Button
                  size="xs"
                  variant={pedido === item.tamano_id ? 'light' : 'filled'}
                  loading={pidiendo === item.tamano_id}
                  disabled={pedido === item.tamano_id}
                  onClick={() => pedir(item)}
                >
                  {pedido === item.tamano_id ? 'Pedido enviado' : 'Pedir'}
                </Button>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      <Text size="xs" c="dimmed">
        Pedir no confirma la venta ni aparta stock: le llega el aviso a Johanna y ella la
        carga.
      </Text>
    </Stack>
  );
}
