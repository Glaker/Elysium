import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCurrencyDollar,
  IconDots,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { ParPrecio } from '@/components/ui/ParPrecio';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { esCiclo, ETIQUETA_TIPO } from '@/features/insumos/api';
import {
  aplicaA,
  borrarLineaFormula,
  etiquetaTamano,
  ETIQUETA_APLICA,
  ETIQUETA_VARIANTE,
  formula,
  historialPreciosVenta,
  medida,
  numerosDe,
  obtenerTamano,
  type LineaFormula,
  type PrecioVentaFila,
  type Variante,
} from '@/features/productos/api';
import { DesgloseCosto } from '@/features/productos/celdas';
import { ModalLineaFormula } from '@/features/productos/ModalLineaFormula';
import { ModalPrecioVenta } from '@/features/productos/ModalPrecioVenta';
import { ModalTamano } from '@/features/productos/ModalTamano';
import { cantidad, fecha as fmtFecha, importe, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

/**
 * La ficha de un tamaño: su fórmula, el costo que sale de ella y su precio.
 *
 * Es la pantalla donde el catálogo de insumos se convierte en un costo. Todo lo
 * que se ve acá depende de la variante elegida arriba, porque una línea marcada
 * como solo Elysium — la etiqueta — entra en un cálculo y no en el otro.
 */
export function TamanoPage() {
  const { id = '' } = useParams();
  const [variante, setVariante] = useState<Variante>('elysium');
  const [editandoLinea, setEditandoLinea] = useState<LineaFormula | null | undefined>(
    undefined,
  );
  const [borrando, setBorrando] = useState<LineaFormula | null>(null);
  const [editandoTamano, setEditandoTamano] = useState(false);
  const [abrirPrecio, setAbrirPrecio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tamano = useAsync(() => obtenerTamano(id), [id]);
  const t = tamano.datos;

  const lineas = useAsync(async () => (t ? formula(t) : null), [id, t]);
  const numeros = useAsync(
    async () => (t ? numerosDe(t, variante) : null),
    [id, variante, t],
  );
  const precios = useAsync(() => historialPreciosVenta(id), [id, t]);

  async function borrar() {
    if (!borrando) return;
    setError(null);
    try {
      await borrarLineaFormula(borrando.id);
      setBorrando(null);
      lineas.recargar();
      tamano.recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (tamano.error) {
    return (
      <Pagina
        titulo="Tamaño"
        volver={{ a: '/admin/productos', texto: 'Volver a productos' }}
      >
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {tamano.error}
        </Alert>
      </Pagina>
    );
  }

  const suma = t?.sumaPorcentaje == null ? null : Number(t.sumaPorcentaje);

  const columnas: Columna<LineaFormula>[] = [
    {
      clave: 'insumo',
      titulo: 'Insumo',
      orden: (l) => l.orden ?? l.insumo,
      render: (l) => {
        const entra = aplicaA(l.aplicaA, variante);
        return (
          <Group gap="xs" wrap="nowrap">
            <Anchor
              component={Link}
              to={`/admin/insumos/${l.insumoId}`}
              size="sm"
              c={entra ? undefined : 'dimmed'}
              onClick={(e) => e.stopPropagation()}
            >
              {l.insumo}
            </Anchor>
            {l.aplicaA !== 'ambas' && (
              <BadgeEstado
                ayuda={
                  entra
                    ? 'Esta línea solo entra en la variante que estás mirando.'
                    : 'Esta línea no entra en la variante que estás mirando: no suma al costo de abajo.'
                }
              >
                {ETIQUETA_APLICA[l.aplicaA]}
              </BadgeEstado>
            )}
          </Group>
        );
      },
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 130,
      orden: (l) => ETIQUETA_TIPO[l.tipo],
      render: (l) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO[l.tipo]}
        </Text>
      ),
    },
    {
      clave: 'proporcion',
      titulo: 'Proporción',
      numerica: true,
      ancho: 120,
      orden: (l) => (l.modo === 'porcentaje' ? l.porcentaje : null),
      render: (l) =>
        l.modo === 'porcentaje' ? (
          <Numero valor={l.porcentaje} sufijo="%" />
        ) : (
          <Text size="sm" c="dimmed">
            fija
          </Text>
        ),
    },
    {
      clave: 'cantidad',
      titulo: 'Por unidad',
      numerica: true,
      ancho: 130,
      orden: (l) => l.cantidadUso,
      render: (l) => (
        <Numero valor={l.cantidadUso} sufijo={UNIDAD_CHICA[l.unidadInsumo]} />
      ),
    },
    {
      clave: 'costo',
      titulo: 'Costo unitario',
      numerica: true,
      ancho: 150,
      orden: (l) => l.costoUnitario.costo,
      render: (l) => (
        <Numero
          valor={l.costoUnitario.costo}
          formato={(n) => importe(n, 'ARS')}
          sufijo={`/ ${UNIDAD_CHICA[l.unidadInsumo]}`}
          size="sm"
          c="dimmed"
          titulo={
            esCiclo(l.costoUnitario.faltantes)
              ? 'Composición con ciclo'
              : 'Costo incompleto'
          }
          faltantes={l.costoUnitario.faltantes}
          tono={esCiclo(l.costoUnitario.faltantes) ? 'error' : 'advertencia'}
        />
      ),
    },
    {
      clave: 'subtotal',
      titulo: 'Subtotal',
      numerica: true,
      ancho: 130,
      orden: (l) => l.subtotal,
      render: (l) => (
        <Numero
          valor={l.subtotal}
          formato={(n) => importe(n, 'ARS')}
          fw={500}
          c={aplicaA(l.aplicaA, variante) ? undefined : 'dimmed'}
          titulo="Costo incompleto"
          faltantes={l.costoUnitario.faltantes}
          tono={esCiclo(l.costoUnitario.faltantes) ? 'error' : 'advertencia'}
        />
      ),
    },
  ];

  const columnasPrecio: Columna<PrecioVentaFila>[] = [
    {
      clave: 'vigente',
      titulo: 'Vigente desde',
      ancho: 140,
      orden: (p) => p.vigente_desde,
      render: (p) => (
        <Text size="sm" className="tabular">
          {fmtFecha(p.vigente_desde)}
        </Text>
      ),
    },
    {
      clave: 'variante',
      titulo: 'Variante',
      ancho: 160,
      orden: (p) => p.variante,
      render: (p) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_VARIANTE[p.variante]}
        </Text>
      ),
    },
    {
      clave: 'precio',
      titulo: 'Precio',
      numerica: true,
      ancho: 150,
      orden: (p) => p.precio,
      render: (p) => <Numero valor={p.precio} formato={(n) => importe(n, 'ARS')} />,
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {t ? `${t.producto} · ${etiquetaTamano(t)}` : '…'}
          {t && !t.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      }
      descripcion={
        t
          ? `Una unidad de ${medida(t)}${
              t.productividad ? ` · ${cantidad(t.productividad)} u / hora` : ''
            }`
          : undefined
      }
      volver={
        t
          ? { a: `/admin/productos/${t.productoId}`, texto: `Volver a ${t.producto}` }
          : { a: '/admin/productos', texto: 'Volver a productos' }
      }
      acciones={
        <>
          <Button
            variant="default"
            leftSection={<IconEdit size={15} />}
            onClick={() => setEditandoTamano(true)}
          >
            Editar tamaño
          </Button>
          <Button
            leftSection={<IconPlus size={15} />}
            onClick={() => setEditandoLinea(null)}
          >
            Agregar insumo
          </Button>
        </>
      }
    >
      {error && (
        <Alert color="error" variant="light" title="No se pudo completar">
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
          <Stack gap="xs" style={{ flex: 1, minWidth: 260 }}>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Costo de una unidad
            </Text>
            {numeros.datos ? (
              <DesgloseCosto d={numeros.datos.desglose} />
            ) : (
              <Text size="sm" c="dimmed">
                calculando…
              </Text>
            )}
          </Stack>

          <Stack gap="sm" align="flex-end">
            <SegmentedControl
              size="xs"
              value={variante}
              onChange={(v) => setVariante(v as Variante)}
              data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Stack gap={2} align="flex-end">
              <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                Precio de venta
              </Text>
              {t && (
                <ParPrecio
                  tamano="destacado"
                  venta={t.precio[variante]}
                  recomendado={
                    numeros.datos?.recomendado ?? {
                      costo: null,
                      completo: false,
                      faltantes: [],
                    }
                  }
                />
              )}
            </Stack>
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconCurrencyDollar size={15} />}
              onClick={() => setAbrirPrecio(true)}
            >
              Cargar precio
            </Button>
          </Stack>
        </Group>
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Fórmula
          </Text>
          {suma != null && (
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                Suma de porcentajes:
              </Text>
              <Text size="xs" className="tabular" fw={600}>
                {suma}%
              </Text>
              {suma !== 100 && (
                <BadgeEstado
                  tono="advertencia"
                  ayuda="No tiene que sumar 100 necesariamente: el Shampoo Café del Excel suma 101 y no es error de tipeo. Pero si no lo mirás, tampoco te enterás."
                >
                  no cierra en 100
                </BadgeEstado>
              )}
            </Group>
          )}
        </Group>

        <Tabla
          filas={lineas.datos ?? null}
          idDe={(l) => l.id}
          columnas={columnas}
          cargando={lineas.cargando}
          alto={420}
          anchoMinimo={860}
          vacio={{
            titulo: 'Este tamaño todavía no tiene fórmula',
            descripcion:
              'Sin fórmula no hay costo: ni el precio recomendado ni la producción de un lote se pueden calcular.',
            accion: (
              <Button
                leftSection={<IconPlus size={15} />}
                onClick={() => setEditandoLinea(null)}
              >
                Agregar el primer insumo
              </Button>
            ),
          }}
          acciones={(l) => (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Acciones de ${l.insumo}`}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => setEditandoLinea(l)}
                >
                  Editar línea
                </Menu.Item>
                <Menu.Item
                  color="error"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => setBorrando(l)}
                >
                  Quitar de la fórmula
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        />
      </Stack>

      <Stack gap="xs">
        <Text fw={600} size="sm">
          Historial de precios de venta
        </Text>
        <Text size="xs" c="dimmed" mt={-8}>
          El precio recomendado no aparece acá: no se guarda nunca, se calcula cada vez
          que se mira.
        </Text>
        <Tabla
          filas={precios.datos ?? null}
          idDe={(p) => p.id}
          columnas={columnasPrecio}
          cargando={precios.cargando}
          alto={300}
          anchoMinimo={520}
          vacio={{
            titulo: 'Todavía no tiene precio de venta',
            descripcion: 'Mientras no tenga uno, no se puede vender ni facturar.',
            accion: (
              <Button
                leftSection={<IconCurrencyDollar size={15} />}
                onClick={() => setAbrirPrecio(true)}
              >
                Cargar el primero
              </Button>
            ),
          }}
        />
      </Stack>

      {t && editandoLinea !== undefined && (
        <ModalLineaFormula
          tamano={t}
          linea={editandoLinea}
          onClose={() => setEditandoLinea(undefined)}
          onGuardado={() => {
            lineas.recargar();
            tamano.recargar();
          }}
        />
      )}

      {t && editandoTamano && (
        <ModalTamano
          productoId={t.productoId}
          producto={t.producto}
          tamano={t}
          onClose={() => setEditandoTamano(false)}
          onGuardado={() => {
            setEditandoTamano(false);
            tamano.recargar();
          }}
        />
      )}

      {t && abrirPrecio && (
        <ModalPrecioVenta
          tamano={t}
          varianteInicial={variante}
          onClose={() => setAbrirPrecio(false)}
          onGuardado={() => {
            tamano.recargar();
            precios.recargar();
          }}
        />
      )}

      <Modal
        opened={Boolean(borrando)}
        onClose={() => setBorrando(null)}
        title="Quitar de la fórmula"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {borrando?.insumo} deja de formar parte de este tamaño y el costo se recalcula
            sin él. Los lotes ya cerrados no se tocan: guardan el consumo con el que se
            produjeron.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setBorrando(null)}>
              Cancelar
            </Button>
            <Button color="error" onClick={() => void borrar()}>
              Quitar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Pagina>
  );
}
