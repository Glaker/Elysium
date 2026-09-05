import {
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';

import { useAuth } from '@/app/useAuth';
import { cantidad as fmtCantidad } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type Opcion = { value: string; label: string };
type Necesidad = {
  insumo: string;
  unidad: string;
  cantidad_formula: number;
  merma: number;
  cantidad_necesaria: number;
  lleva_merma: boolean;
};

const UNIDAD_CHICA: Record<string, string> = { kg: 'g', l: 'ml', unidad: 'u' };

export function MateriaPrimaPage() {
  const { persona } = useAuth();
  const [tamanoId, setTamanoId] = useState<string | null>(null);
  const [unidades, setUnidades] = useState<number | string>(200);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productos = useAsync<Opcion[]>(async () => {
    const { data, error } = await supabase
      .from('tamanos')
      .select('id, nombre, magnitud, unidad, productos(nombre)')
      .eq('activo', true);
    if (error) throw error;
    return (data ?? []).map((t) => ({
      value: t.id,
      label: `${(t.productos as { nombre: string } | null)?.nombre ?? '—'} · ${
        t.nombre ?? `${t.magnitud} ${t.unidad}`
      }`,
    }));
  }, []);

  const n = Number(unidades);
  const necesidades = useAsync<Necesidad[] | null>(async () => {
    if (!tamanoId || !n || n <= 0) return null;
    // RPC SECURITY DEFINER: devuelve cantidades, nunca precios ni costos.
    const { data, error } = await supabase.rpc('calcular_insumos', {
      p_tamano_id: tamanoId,
      p_unidades: n,
    });
    if (error) throw error;
    return (data ?? []) as Necesidad[];
  }, [tamanoId, n]);

  async function enviar() {
    if (!persona || !tamanoId) return;
    setEnviando(true);
    setError(null);
    try {
      const { error } = await supabase.from('solicitudes').insert({
        tipo: 'materia_prima',
        persona_id: persona.id,
        tamano_objetivo_id: tamanoId,
        unidades_objetivo: n,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={2} fz="h3">
          Materia prima
        </Title>
        <Text size="sm" c="dimmed">
          Elegí qué vas a fabricar y cuánto. Te digo qué insumos hacen falta.
        </Text>
      </div>

      <Card bg="dark.6">
        <Stack gap="sm">
          {productos.cargando ? (
            <Skeleton h={60} />
          ) : (
            <Select
              label="Qué vas a producir"
              placeholder="Elegí un producto"
              data={productos.datos ?? []}
              value={tamanoId}
              onChange={(v) => {
                setTamanoId(v);
                setEnviado(false);
              }}
              searchable
            />
          )}
          <NumberInput
            label="Cuántas unidades"
            min={1}
            value={unidades}
            onChange={(v) => {
              setUnidades(v);
              setEnviado(false);
            }}
          />
        </Stack>
      </Card>

      {necesidades.cargando && tamanoId && <Skeleton h={180} radius="md" />}

      {necesidades.error && (
        <Alert color="red" variant="light" title="No se pudo calcular">
          {necesidades.error}
        </Alert>
      )}

      {!tamanoId && (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          Elegí un producto para ver la lista de insumos.
        </Text>
      )}

      {necesidades.datos && necesidades.datos.length > 0 && (
        <Card bg="dark.6">
          <Stack gap="xs">
            <Text
              size="xs"
              tt="uppercase"
              c="dimmed"
              fw={600}
              style={{ letterSpacing: 0.6 }}
            >
              Necesitás
            </Text>
            <Text size="xs" c="dimmed" mt={-4} mb={4}>
              Las cantidades ya incluyen la merma esperada de materia prima. Pedí estos
              números, no los de la fórmula.
            </Text>
            {necesidades.datos.map((x) => {
              const u = UNIDAD_CHICA[x.unidad] ?? x.unidad;
              return (
                <Group
                  key={x.insumo}
                  justify="space-between"
                  wrap="nowrap"
                  gap="sm"
                  align="flex-start"
                >
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm">{x.insumo}</Text>
                    {x.lleva_merma && Number(x.merma) > 0 && (
                      <Text size="xs" c="dimmed">
                        {fmtCantidad(Number(x.cantidad_formula))} {u} +{' '}
                        {fmtCantidad(Number(x.merma))} {u} de merma
                      </Text>
                    )}
                  </Stack>
                  <Text size="sm" fw={600} c="cian.4" style={{ whiteSpace: 'nowrap' }}>
                    {fmtCantidad(Number(x.cantidad_necesaria))} {u}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Card>
      )}

      {necesidades.datos && necesidades.datos.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          Ese producto todavía no tiene fórmula cargada.
        </Text>
      )}

      {error && (
        <Alert color="red" variant="light" title="No se pudo enviar">
          {error}
        </Alert>
      )}

      {necesidades.datos && necesidades.datos.length > 0 && (
        <Stack gap="xs">
          <Button
            fullWidth
            size="md"
            loading={enviando}
            disabled={enviado}
            onClick={enviar}
            variant={enviado ? 'light' : 'filled'}
          >
            {enviado ? 'Solicitud enviada' : 'Solicitar esta materia prima'}
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            Esto <strong>no aparta stock</strong>: es un aviso para Johanna, igual que el
            mensaje que reemplaza.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
