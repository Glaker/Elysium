import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { IconCalculator, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  listarProductos,
  type Variante,
} from '@/features/productos/api';
import { DesgloseCosto } from '@/features/productos/celdas';
import { insumosSinPrecio, parametroValor, simularCosto } from '@/features/simulador/api';
import { importe } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

/**
 * El simulador de costos (§11, textual de Johanna): elegir un tamaño y ver qué
 * costaría, y si falta el precio de un insumo, pedirlo ahí mismo **sin
 * guardarlo**.
 *
 * Los precios que se tipean acá no tocan la lista. Esa es toda la gracia: sirve
 * para contestar "¿cuánto me saldría si la etiqueta me sale 700?" sin ensuciar
 * el costo real de nada.
 */
export function SimuladorPage() {
  const [tamanoId, setTamanoId] = useState<string | null>(null);
  const [variante, setVariante] = useState<Variante>('elysium');
  /** Lo que se está tipeando. */
  const [borrador, setBorrador] = useState<Record<string, number | string>>({});
  /** Lo que ya se aplicó al cálculo: se confirma al salir del campo. */
  const [aplicados, setAplicados] = useState<Record<string, number>>({});

  const productos = useAsync(listarProductos, []);
  const margenGlobal = useAsync(() => parametroValor('margen_pct'), []);

  const faltan = useAsync(
    async () => (tamanoId ? insumosSinPrecio(tamanoId, variante) : null),
    [tamanoId, variante],
  );

  const costo = useAsync(
    async () => (tamanoId ? simularCosto(tamanoId, variante, aplicados) : null),
    [tamanoId, variante, aplicados],
  );

  const tamanos = (productos.datos ?? []).flatMap((p) =>
    p.tamanos.map((t) => ({ p, t })),
  );
  const elegido = tamanos.find(({ t }) => t.id === tamanoId);

  const margen = elegido?.p.margenPct ?? margenGlobal.datos ?? null;
  const conEtiqueta = costo.datos?.conEtiqueta ?? null;
  const recomendado =
    conEtiqueta != null && margen != null ? conEtiqueta * (1 + margen / 100) : null;

  /** Pasa un precio del borrador al cálculo, o lo saca si se vació. */
  function aplicar(insumoId: string) {
    const v = borrador[insumoId];
    setAplicados((previo) => {
      const siguiente = { ...previo };
      if (v === '' || v == null || Number(v) <= 0) delete siguiente[insumoId];
      else siguiente[insumoId] = Number(v);
      return siguiente;
    });
  }

  const simulando = Object.keys(aplicados).length;

  return (
    <Pagina
      titulo="Simulador de costos"
      descripcion="Cuánto costaría un tamaño. Los precios que cargues acá no se guardan en ningún lado."
      acciones={
        <Button
          variant="default"
          component={Link}
          to="/admin/simulador/calculadora"
          leftSection={<IconCalculator size={15} />}
        >
          Calculadora de ingredientes
        </Button>
      }
    >
      <Paper withBorder p="md" bg="noche.6">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Tamaño"
            placeholder={productos.cargando ? 'Cargando…' : 'Elegí qué simular'}
            searchable
            w={320}
            data={tamanos.map(({ p, t }) => ({
              value: t.id,
              label: `${p.nombre} · ${etiquetaTamano(t)}`,
            }))}
            value={tamanoId}
            onChange={(v) => {
              setTamanoId(v);
              setBorrador({});
              setAplicados({});
            }}
          />
          <Stack gap={4}>
            <Text size="xs" fw={500}>
              Variante
            </Text>
            <SegmentedControl
              size="xs"
              value={variante}
              onChange={(v) => setVariante(v as Variante)}
              data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Stack>
        </Group>
      </Paper>

      {!tamanoId ? (
        <Text size="sm" c="dimmed">
          Elegí un tamaño para ver su costo.
        </Text>
      ) : (
        <>
          {(faltan.datos?.length ?? 0) > 0 && (
            <Paper withBorder p="md" bg="noche.6">
              <Stack gap="sm">
                <Group gap={8}>
                  <IconInfoCircle size={16} />
                  <Text size="sm" fw={600}>
                    Faltan precios para que el costo cierre
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mt={-8}>
                  Poné un precio tentativo y el costo se recalcula. No se guarda: la lista
                  de precios queda como está.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {(faltan.datos ?? []).map((i) => (
                    <CampoNumerico
                      key={i.insumoId}
                      label={i.nombre}
                      description={`Por ${i.unidad}`}
                      moneda="ARS"
                      min={0}
                      size="xs"
                      value={borrador[i.insumoId] ?? ''}
                      onChange={(v) => setBorrador((b) => ({ ...b, [i.insumoId]: v }))}
                      onBlur={() => aplicar(i.insumoId)}
                    />
                  ))}
                </SimpleGrid>
              </Stack>
            </Paper>
          )}

          {costo.error && (
            <Alert color="error" variant="light" title="No se pudo calcular">
              {costo.error}
            </Alert>
          )}

          <Paper withBorder p="md" bg="noche.6">
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
              <Stack gap="xs" style={{ flex: 1, minWidth: 260 }}>
                <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                  Costo de una unidad
                </Text>
                {costo.cargando ? (
                  <Text size="sm" c="dimmed">
                    calculando…
                  </Text>
                ) : costo.datos ? (
                  <DesgloseCosto d={costo.datos} />
                ) : null}
              </Stack>

              <Stack gap={2} align="flex-end">
                <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                  Precio recomendado
                </Text>
                <Numero
                  valor={recomendado}
                  formato={(n) => importe(n, 'ARS')}
                  size="lg"
                  fw={700}
                  titulo="No se puede calcular"
                  faltantes={
                    margen == null
                      ? ['no hay margen cargado, ni global ni del producto']
                      : (costo.datos?.faltantes ?? [])
                  }
                />
                {margen != null && (
                  <Text size="xs" c="dimmed">
                    margen {margen}%
                    {elegido?.p.margenPct != null
                      ? ' (propio del producto)'
                      : ' (global)'}
                  </Text>
                )}
                {elegido && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Precio de venta hoy:{' '}
                    {elegido.t.precio[variante] == null
                      ? 'sin cargar'
                      : importe(elegido.t.precio[variante]!, 'ARS')}
                  </Text>
                )}
              </Stack>
            </Group>

            {simulando > 0 && (
              <Alert color="advertencia" variant="light" mt="md" py={8}>
                <Group justify="space-between" gap="sm">
                  <Text size="xs">
                    Este costo usa {simulando}{' '}
                    {simulando === 1 ? 'precio simulado' : 'precios simulados'}. No es el
                    costo real y no se guardó nada.
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                      setBorrador({});
                      setAplicados({});
                    }}
                  >
                    Limpiar
                  </Button>
                </Group>
              </Alert>
            )}
          </Paper>

          {elegido && (
            <Text size="xs" c="dimmed">
              Los porcentajes de la fórmula se aplican sobre {elegido.t.magnitud}{' '}
              {elegido.t.unidad}, el contenido de una unidad.{' '}
              <Anchor
                component={Link}
                to={`/admin/productos/tamanos/${elegido.t.id}`}
                size="xs"
              >
                Ver la fórmula
              </Anchor>
              .
            </Text>
          )}
        </>
      )}
    </Pagina>
  );
}
