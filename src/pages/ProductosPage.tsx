import { Alert, Box, Group, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
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

/**
 * El catálogo con el precio que le corresponde a quien mira.
 *
 * Son filas y no tarjetas: la pregunta es "cuánto sale cada uno", y una columna
 * de precios alineados se compara de un vistazo, mientras que cinco tarjetas
 * grises se leen de a una. El precio es el elemento tipográfico más fuerte de
 * la fila, y "Pedir" va como botón fantasma para que cinco seguidos no griten.
 */
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
    // El esqueleto tiene la forma exacta de la lista cargada —la línea de arriba
    // y filas de 36px con 15 de aire— para que al llegar los datos nada se mueva
    // de lugar. Un esqueleto que no mide lo mismo que su contenido es un salto
    // anunciado.
    return (
      <Stack gap={0}>
        <Skeleton h={11} w={160} mb={10} radius="sm" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={36} my={15} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (!datos?.length) {
    return (
      <Stack gap={4} py="xl" align="center">
        <Text fw={600}>Todavía no hay productos</Text>
        <Text fz="sm" c="var(--ely-texto-2)" ta="center">
          Cuando Johanna cargue el catálogo, lo vas a ver acá.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={0}>
      <Text fz={11} c="var(--ely-texto-3)" pb={10}>
        {datos[0]?.base === 'costo'
          ? 'Tus precios de entrega para reventa.'
          : 'Precios de venta al público.'}
      </Text>

      {error && (
        <Alert color="error" variant="light" title="No se pudo enviar el pedido" mb="sm">
          {error}
        </Alert>
      )}

      {datos.map((item, i) => {
        const hayPrecio = item.completo && item.importe != null;
        const yaPedido = pedido === item.tamano_id;

        return (
          <Group
            key={item.tamano_id}
            gap={14}
            wrap="nowrap"
            py={15}
            style={{
              borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
            }}
          >
            {/* El nombre es lo único que cede: el precio y el botón no se
                encogen ni se parten en un teléfono angosto. */}
            <Box style={{ flexGrow: 1, minWidth: 0 }}>
              <Text
                fz={15}
                fw={600}
                lh={1.25}
                lineClamp={2}
                style={{ letterSpacing: '-0.01em' }}
              >
                {item.producto}
              </Text>
              <Text fz={12} c="var(--ely-texto-2)" mt={2}>
                {item.tamano ?? `${item.magnitud} ${item.unidad}`}
              </Text>
            </Box>

            <Box ta="right" style={{ flexShrink: 0 }}>
              {hayPrecio ? (
                <Text className="display" fz={20} fw={600} c="cian.4">
                  {plata(Number(item.importe))}
                </Text>
              ) : (
                <>
                  <Text className="display" fz={20} fw={600} c="var(--ely-texto-3)">
                    —
                  </Text>
                  <Text fz={11} c="advertencia.4" mt={1}>
                    Sin precio
                  </Text>
                </>
              )}
            </Box>

            <UnstyledButton
              disabled={!hayPrecio || yaPedido || pidiendo === item.tamano_id}
              onClick={() => void pedir(item)}
              px={13}
              py={7}
              style={{
                borderRadius: 999,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: `1px solid ${
                  yaPedido
                    ? '#2b5a3f'
                    : hayPrecio
                      ? 'var(--ely-borde)'
                      : 'var(--ely-borde-tenue)'
                }`,
                background: yaPedido ? '#14281d' : 'transparent',
                opacity: pidiendo === item.tamano_id ? 0.5 : 1,
              }}
            >
              <Group gap={6} wrap="nowrap">
                {yaPedido && <IconCheck size={12} stroke={3} color="#79dcaf" />}
                <Text
                  fz={12}
                  fw={600}
                  c={yaPedido ? '#79dcaf' : hayPrecio ? '#cbc5d6' : 'var(--ely-texto-3)'}
                >
                  {yaPedido ? 'Pedido' : 'Pedir'}
                </Text>
              </Group>
            </UnstyledButton>
          </Group>
        );
      })}

      <Text
        fz={11}
        c="var(--ely-texto-3)"
        lh={1.5}
        pt={14}
        mt={4}
        style={{ borderTop: '1px solid var(--ely-borde-tenue)' }}
      >
        Pedir no confirma la venta ni aparta stock: le llega el aviso a Johanna y ella la
        carga.
      </Text>
    </Stack>
  );
}
