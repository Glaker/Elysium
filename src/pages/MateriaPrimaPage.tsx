import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Select,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import { useAuth } from '@/app/useAuth';
import { cantidad as fmtCantidad, UNIDAD_CHICA } from '@/lib/formato';
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

/** Estilo del campo: caja oscura con borde, la misma en los dos controles. */
const CAJA = {
  border: '1px solid var(--ely-borde)',
  background: 'var(--ely-superficie)',
  borderRadius: 12,
};

export function MateriaPrimaPage() {
  const { persona } = useAuth();
  const [tamanoId, setTamanoId] = useState<string | null>(null);
  const [unidades, setUnidades] = useState(200);
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

  const necesidades = useAsync<Necesidad[] | null>(async () => {
    if (!tamanoId || unidades <= 0) return null;
    // RPC SECURITY DEFINER: devuelve cantidades, nunca precios ni costos.
    const { data, error } = await supabase.rpc('calcular_insumos', {
      p_tamano_id: tamanoId,
      p_unidades: unidades,
    });
    if (error) throw error;
    return (data ?? []) as Necesidad[];
  }, [tamanoId, unidades]);

  function cambiar(n: number) {
    setUnidades(Math.max(1, n));
    setEnviado(false);
  }

  async function enviar() {
    if (!persona || !tamanoId) return;
    setEnviando(true);
    setError(null);
    try {
      const { error } = await supabase.from('solicitudes').insert({
        tipo: 'materia_prima',
        persona_id: persona.id,
        tamano_objetivo_id: tamanoId,
        unidades_objetivo: unidades,
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
    <Stack gap={18}>
      <Stack gap={10}>
        <Box>
          <Text className="rotulo" mb={7}>
            Qué vas a producir
          </Text>
          {productos.cargando ? (
            <Skeleton h={48} radius={12} />
          ) : (
            <Select
              placeholder="Elegí un producto"
              data={productos.datos ?? []}
              value={tamanoId}
              onChange={(v) => {
                setTamanoId(v);
                setEnviado(false);
              }}
              searchable
              size="md"
              styles={{ input: { ...CAJA, height: 48, fontSize: 15 } }}
            />
          )}
        </Box>

        <Box>
          <Text className="rotulo" mb={7}>
            Cuántas unidades
          </Text>
          {/*
            Dos botones y no un campo de texto: el número se ajusta de a tandas
            con el pulgar, y escribirlo en un teclado numérico para cambiar de
            200 a 250 es más trabajo del que vale.
          */}
          <Group
            justify="space-between"
            wrap="nowrap"
            pl={15}
            pr={11}
            py={11}
            style={CAJA}
          >
            <Text className="display" fz={22} fw={600}>
              {fmtCantidad(unidades)}
            </Text>
            <Group gap={6} wrap="nowrap">
              <ActionIcon
                variant="default"
                size={34}
                radius={9}
                aria-label="Menos unidades"
                onClick={() => cambiar(unidades - 10)}
              >
                <IconMinus size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                size={34}
                radius={9}
                aria-label="Más unidades"
                onClick={() => cambiar(unidades + 10)}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>
      </Stack>

      {!tamanoId && (
        <Text fz="sm" c="var(--ely-texto-2)" ta="center" py="lg">
          Elegí un producto para ver la lista de insumos.
        </Text>
      )}

      {necesidades.cargando && tamanoId && <Skeleton h={220} radius={12} />}

      {necesidades.error && (
        <Alert color="error" variant="light" title="No se pudo calcular">
          {necesidades.error}
        </Alert>
      )}

      {necesidades.datos && necesidades.datos.length > 0 && (
        <Box>
          <Group justify="space-between" align="baseline" mb={4}>
            <Text className="rotulo" c="cian.4">
              Necesitás
            </Text>
            <Text fz={11} c="var(--ely-texto-3)">
              merma incluida
            </Text>
          </Group>
          <Text fz={11} c="var(--ely-texto-3)" lh={1.5} mb={12}>
            Pedí estos números, no los de la fórmula: ya tienen adentro lo que se pierde
            en el proceso.
          </Text>

          <Stack gap={0}>
            {necesidades.datos.map((x, i) => {
              const u = UNIDAD_CHICA[x.unidad] ?? x.unidad;
              return (
                <Group
                  key={x.insumo}
                  justify="space-between"
                  align="flex-start"
                  wrap="nowrap"
                  gap={12}
                  py={11}
                  style={{
                    borderTop: i === 0 ? undefined : '1px solid var(--ely-borde-tenue)',
                  }}
                >
                  <Box style={{ minWidth: 0 }}>
                    <Text fz={14} fw={500}>
                      {x.insumo}
                    </Text>
                    <Text fz={11} c="var(--ely-texto-3)" mt={2} className="tabular">
                      {x.lleva_merma && Number(x.merma) > 0
                        ? `${fmtCantidad(Number(x.cantidad_formula))} ${u} + ${fmtCantidad(
                            Number(x.merma),
                          )} ${u} de merma`
                        : 'sin merma'}
                    </Text>
                  </Box>
                  <Text
                    className="display"
                    fz={16}
                    fw={600}
                    c="cian.4"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {fmtCantidad(Number(x.cantidad_necesaria))} {u}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Box>
      )}

      {necesidades.datos && necesidades.datos.length === 0 && (
        <Text fz="sm" c="var(--ely-texto-2)" ta="center" py="lg">
          Ese producto todavía no tiene fórmula cargada.
        </Text>
      )}

      {error && (
        <Alert color="error" variant="light" title="No se pudo enviar">
          {error}
        </Alert>
      )}

      {necesidades.datos && necesidades.datos.length > 0 && (
        <Stack gap={9} mt={4}>
          <Button
            fullWidth
            size="md"
            h={50}
            radius={12}
            loading={enviando}
            disabled={enviado}
            onClick={() => void enviar()}
            variant={enviado ? 'light' : 'filled'}
          >
            {enviado ? 'Solicitud enviada' : 'Solicitar esta materia prima'}
          </Button>
          <Text fz={11} c="var(--ely-texto-3)" ta="center" lh={1.5}>
            Esto <strong style={{ color: 'var(--ely-texto-2)' }}>no aparta stock</strong>:
            es un aviso, igual que el mensaje que reemplaza.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
