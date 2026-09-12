import {
  Alert,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangleFilled } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarInsumos } from '@/features/insumos/api';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  listarProductos,
  type Variante,
} from '@/features/productos/api';
import { stockInsumos } from '@/features/stock/api';
import { calcularInsumos, type NecesidadInsumo } from '@/features/simulador/api';
import { cantidad as fmtCantidad, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Fila = NecesidadInsumo & {
  unidadChica: string;
  stock: number | null;
  falta: number;
};

/**
 * La calculadora de ingredientes (§11): para producir X unidades, cuánto hace
 * falta de cada insumo y si alcanza con lo que hay.
 *
 * La merma va sumada encima de la materia prima nada más, igual que al cerrar un
 * lote: es la misma cuenta, hecha antes de comprometerse.
 */
export function CalculadoraPage() {
  const [tamanoId, setTamanoId] = useState<string | null>(null);
  const [variante, setVariante] = useState<Variante>('elysium');
  const [unidades, setUnidades] = useState<number | string>(100);
  const [merma, setMerma] = useState<number | string>('');

  const productos = useAsync(listarProductos, []);
  const insumos = useAsync(listarInsumos, []);

  const stock = useAsync(
    async () =>
      insumos.datos
        ? stockInsumos(
            insumos.datos.map((i) => ({ id: i.id, nombre: i.nombre, unidad: i.unidad })),
          )
        : null,
    ['stock', insumos.datos?.length],
  );

  const necesidades = useAsync(
    async () =>
      tamanoId && unidades !== '' && Number(unidades) > 0
        ? calcularInsumos(
            tamanoId,
            Number(unidades),
            variante,
            merma === '' ? null : Number(merma),
          )
        : null,
    [tamanoId, variante, unidades, merma],
  );

  const tamanos = (productos.datos ?? []).flatMap((p) =>
    p.tamanos.map((t) => ({ p, t })),
  );

  const filas: Fila[] = useMemo(() => {
    // `calcular_insumos` devuelve el nombre y no el id, pero el nombre del
    // insumo es único en la base, así que el cruce con el stock es exacto.
    const porNombre = new Map((stock.datos ?? []).map((s) => [s.nombre, s]));
    return (necesidades.datos ?? []).map((n) => {
      const s = porNombre.get(n.insumo);
      const disponible = s?.stock ?? null;
      return {
        ...n,
        unidadChica: UNIDAD_CHICA[n.unidad],
        stock: disponible,
        falta: Math.max(n.cantidadNecesaria - (disponible ?? 0), 0),
      };
    });
  }, [necesidades.datos, stock.datos]);

  const faltantes = filas.filter((f) => f.falta > 0);

  const columnas: Columna<Fila>[] = [
    {
      clave: 'insumo',
      titulo: 'Insumo',
      orden: (f) => f.insumo,
      render: (f) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{f.insumo}</Text>
          {!f.llevaMerma && (
            <BadgeEstado ayuda="La merma se aplica solo a la materia prima: un envase no se evapora.">
              sin merma
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'formula',
      titulo: 'Según la fórmula',
      numerica: true,
      ancho: 160,
      orden: (f) => f.cantidadFormula,
      render: (f) => (
        <Numero valor={f.cantidadFormula} sufijo={f.unidadChica} size="sm" c="dimmed" />
      ),
    },
    {
      clave: 'merma',
      titulo: 'Merma',
      numerica: true,
      ancho: 130,
      orden: (f) => f.merma,
      render: (f) =>
        f.merma > 0 ? (
          <Numero valor={f.merma} sufijo={f.unidadChica} size="sm" c="dimmed" />
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    },
    {
      clave: 'necesaria',
      titulo: 'Hace falta',
      numerica: true,
      ancho: 150,
      orden: (f) => f.cantidadNecesaria,
      render: (f) => (
        <Numero valor={f.cantidadNecesaria} sufijo={f.unidadChica} fw={600} />
      ),
    },
    {
      clave: 'stock',
      titulo: 'Hay',
      numerica: true,
      ancho: 150,
      orden: (f) => f.stock,
      render: (f) => (
        <Group gap={5} wrap="nowrap" justify="flex-end">
          <Numero
            valor={f.stock}
            sufijo={f.unidadChica}
            size="sm"
            c={f.falta > 0 ? 'advertencia.4' : 'dimmed'}
            titulo="Sin movimientos de stock"
          />
          {f.falta > 0 && (
            <Tooltip label={`Faltan ${fmtCantidad(f.falta)} ${f.unidadChica}.`}>
              <IconAlertTriangleFilled
                size={13}
                style={{ color: 'var(--mantine-color-advertencia-5)', display: 'block' }}
              />
            </Tooltip>
          )}
        </Group>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Calculadora de ingredientes"
      descripcion="Para producir X unidades: cuánto hace falta de cada insumo y si alcanza con lo que hay."
      volver={{ a: '/admin/simulador', texto: 'Volver al simulador' }}
    >
      <Paper withBorder p="md" bg="noche.8">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Tamaño"
            placeholder={productos.cargando ? 'Cargando…' : 'Qué se va a producir'}
            searchable
            w={300}
            data={tamanos.map(({ p, t }) => ({
              value: t.id,
              label: `${p.nombre} · ${etiquetaTamano(t)}`,
            }))}
            value={tamanoId}
            onChange={setTamanoId}
          />

          <CampoNumerico
            label="Unidades"
            unidad="u"
            min={0}
            w={140}
            value={unidades}
            onChange={setUnidades}
          />

          <CampoNumerico
            label="Merma"
            description="Vacío usa el parámetro general."
            unidad="%"
            min={0}
            w={170}
            value={merma}
            onChange={setMerma}
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

      {necesidades.error && (
        <Alert color="error" variant="light" title="No se pudo calcular">
          {necesidades.error}
        </Alert>
      )}

      {faltantes.length > 0 && (
        <Alert color="advertencia" variant="light" py={6}>
          <Text size="sm">
            No alcanza con el stock actual para{' '}
            {faltantes.length === 1
              ? `${faltantes[0].insumo}`
              : `${faltantes.length} insumos`}
            . Se puede producir igual: el stock queda en negativo hasta que registres la
            compra.
          </Text>
        </Alert>
      )}

      <Tabla
        filas={tamanoId ? filas : []}
        idDe={(f) => f.insumo}
        columnas={columnas}
        cargando={necesidades.cargando || stock.cargando}
        anchoMinimo={780}
        alto={460}
        vacio={{
          titulo: tamanoId ? 'Este tamaño no tiene fórmula' : 'Elegí qué querés producir',
          descripcion: tamanoId
            ? 'Sin fórmula no hay nada que calcular: cargala en la ficha del tamaño.'
            : 'Elegí un tamaño y cuántas unidades para ver qué hace falta.',
        }}
      />
    </Pagina>
  );
}
