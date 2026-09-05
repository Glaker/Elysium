import {
  Alert,
  Anchor,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCurrencyDollar,
  IconEdit,
  IconExternalLink,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  composicion,
  esCiclo,
  ETIQUETA_TIPO,
  factorUnidad,
  historialPrecios,
  obtenerInsumo,
  type ComponenteMP,
  type PrecioFila,
} from '@/features/insumos/api';
import { PrecioVigente, UltimaVerificacion } from '@/features/insumos/celdas';
import { ModalPrecio } from '@/features/insumos/ModalPrecio';
import { fecha as fmtFecha, importe, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {etiqueta}
      </Text>
      <Group gap={4} wrap="nowrap" mih={22}>
        {children}
      </Group>
    </Stack>
  );
}

export function InsumoPage() {
  const { id = '' } = useParams();
  const [abrirPrecio, setAbrirPrecio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const insumo = useAsync(() => obtenerInsumo(id), [id]);
  const precios = useAsync(() => historialPrecios(id), [id, insumo.datos?.verificadoEn]);
  const partes = useAsync(
    async () => (insumo.datos?.origen === 'producido' ? composicion(id) : null),
    [id, insumo.datos?.origen],
  );

  const i = insumo.datos;

  if (insumo.error) {
    return (
      <Pagina titulo="Insumo" volver={{ a: '/admin/insumos', texto: 'Volver a insumos' }}>
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {insumo.error}
        </Alert>
      </Pagina>
    );
  }

  const columnasPrecio: Columna<PrecioFila>[] = [
    {
      clave: 'vigente',
      titulo: 'Vigente desde',
      ancho: 130,
      orden: (p) => p.vigente_desde,
      render: (p) => (
        <Text size="sm" className="tabular">
          {fmtFecha(p.vigente_desde)}
        </Text>
      ),
    },
    {
      clave: 'precio',
      titulo: 'Precio',
      numerica: true,
      ancho: 160,
      orden: (p) => p.precio,
      render: (p) => (
        <Numero
          valor={p.precio}
          formato={(n) => importe(n, p.moneda)}
          sufijo={`/ ${i?.unidad ?? ''}`}
        />
      ),
    },
    {
      clave: 'verificado',
      titulo: 'Verificado',
      numerica: true,
      ancho: 120,
      orden: (p) => p.verificado_en,
      render: (p) => (
        <Text size="sm" className="tabular" c="dimmed">
          {fmtFecha(p.verificado_en)}
        </Text>
      ),
    },
    {
      clave: 'fuente',
      titulo: 'Fuente',
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.fuente ?? ''}
        </Text>
      ),
    },
  ];

  const columnasComposicion: Columna<ComponenteMP>[] = [
    {
      clave: 'nombre',
      titulo: 'Componente',
      orden: (c) => c.nombre,
      render: (c) => (
        <Anchor component={Link} to={`/admin/insumos/${c.componenteId}`} size="sm">
          {c.nombre}
        </Anchor>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      numerica: true,
      ancho: 140,
      orden: (c) => c.cantidad,
      render: (c) => <Numero valor={c.cantidad} sufijo={UNIDAD_CHICA[c.unidad]} />,
    },
    {
      clave: 'costo',
      titulo: 'Costo unitario',
      numerica: true,
      ancho: 160,
      orden: (c) => c.costo.costo,
      render: (c) => (
        <Numero
          valor={c.costo.costo}
          formato={(n) => importe(n, 'ARS')}
          sufijo={`/ ${UNIDAD_CHICA[c.unidad]}`}
          titulo={
            esCiclo(c.costo.faltantes) ? 'Composición con ciclo' : 'Costo incompleto'
          }
          faltantes={c.costo.faltantes}
          tono={esCiclo(c.costo.faltantes) ? 'error' : 'advertencia'}
        />
      ),
    },
    {
      clave: 'subtotal',
      titulo: 'Subtotal',
      numerica: true,
      ancho: 140,
      orden: (c) => (c.costo.costo == null ? null : c.costo.costo * c.cantidad),
      render: (c) => (
        <Numero
          valor={c.costo.costo == null ? null : c.costo.costo * c.cantidad}
          formato={(n) => importe(n, 'ARS')}
          titulo="Costo incompleto"
          faltantes={c.costo.faltantes}
          tono={esCiclo(c.costo.faltantes) ? 'error' : 'advertencia'}
        />
      ),
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {i?.nombre ?? '…'}
          {i && i.origen === 'producido' && (
            <BadgeEstado ayuda="Materia prima intermedia: Elysium la fabrica.">
              Producido
            </BadgeEstado>
          )}
          {i && !i.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      }
      descripcion={
        i
          ? `${ETIQUETA_TIPO[i.tipo]} · ${
              i.origen === 'producido' ? 'se produce' : 'se compra'
            }, en ${i.unidad}`
          : undefined
      }
      volver={{ a: '/admin/insumos', texto: 'Volver a insumos' }}
      acciones={
        <>
          {i?.origen === 'comprado' && (
            <Button
              variant="default"
              leftSection={<IconCurrencyDollar size={15} />}
              onClick={() => setAbrirPrecio(true)}
            >
              Cargar precio
            </Button>
          )}
          <Button
            component={Link}
            to={`/admin/insumos/${id}/editar`}
            leftSection={<IconEdit size={15} />}
          >
            Editar
          </Button>
        </>
      }
    >
      {aviso && (
        <Alert
          color="exito"
          variant="light"
          py={6}
          withCloseButton
          onClose={() => setAviso(null)}
        >
          {aviso}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Dato etiqueta="Precio vigente">{i ? <PrecioVigente insumo={i} /> : null}</Dato>
          <Dato etiqueta="Última verificación">
            {i ? <UltimaVerificacion insumo={i} /> : null}
          </Dato>
          <Dato etiqueta="Proveedor">
            {!i ? null : i.origen === 'producido' ? (
              <Text size="sm" c="dimmed">
                Producción propia
              </Text>
            ) : !i.proveedor ? (
              <DatoIncompleto titulo="Sin proveedor cargado" />
            ) : i.proveedorLink ? (
              <Anchor
                href={i.proveedorLink}
                target="_blank"
                rel="noreferrer noopener"
                size="sm"
              >
                <Group gap={4} wrap="nowrap">
                  {i.proveedor}
                  <IconExternalLink size={12} />
                </Group>
              </Anchor>
            ) : (
              <Text size="sm">{i.proveedor}</Text>
            )}
          </Dato>
          <Dato etiqueta={i?.origen === 'producido' ? 'Rinde de una tanda' : 'Link'}>
            {!i ? null : i.origen === 'producido' ? (
              <Numero
                valor={i.rinde}
                sufijo={UNIDAD_CHICA[i.unidad]}
                titulo="Sin rinde declarado"
              />
            ) : i.link ? (
              <Anchor href={i.link} target="_blank" rel="noreferrer noopener" size="sm">
                <Group gap={4} wrap="nowrap">
                  Ver producto
                  <IconExternalLink size={12} />
                </Group>
              </Anchor>
            ) : (
              <Text size="sm" c="dimmed">
                sin link propio
              </Text>
            )}
          </Dato>
        </SimpleGrid>

        {i?.notas && (
          <>
            <Divider my="sm" />
            <Text size="sm" c="dimmed">
              {i.notas}
            </Text>
          </>
        )}
      </Paper>

      {i?.origen === 'producido' && (
        <Stack gap="xs">
          <Group justify="space-between" align="flex-end">
            <Text fw={600} size="sm">
              Composición
            </Text>
            {partes.datos?.length ? (
              <Group gap={6}>
                <Text size="xs" c="dimmed">
                  Costo por {i.unidad}:
                </Text>
                <Numero
                  valor={
                    i.costo?.costo == null
                      ? null
                      : Number(i.costo.costo) * factorUnidad(i.unidad)
                  }
                  formato={(n) => importe(n, 'ARS')}
                  fw={600}
                  titulo={
                    esCiclo(i.costo?.faltantes)
                      ? 'Composición con ciclo'
                      : 'Costo incompleto'
                  }
                  faltantes={i.costo?.faltantes}
                  tono={esCiclo(i.costo?.faltantes) ? 'error' : 'advertencia'}
                />
              </Group>
            ) : null}
          </Group>
          <Tabla
            filas={partes.datos ?? null}
            idDe={(c) => c.id}
            columnas={columnasComposicion}
            cargando={partes.cargando}
            alto={320}
            anchoMinimo={560}
            vacio={{
              titulo: 'Sin composición cargada',
              descripcion:
                'Mientras no tenga componentes, su costo y el de todo lo que la use quedan incompletos.',
            }}
          />
        </Stack>
      )}

      {i?.origen === 'comprado' && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Historial de precios
          </Text>
          <Text size="xs" c="dimmed" mt={-8}>
            Cada fila es también una verificación: confirmar que un precio no cambió deja
            una fila nueva con el mismo monto.
          </Text>
          <Tabla
            filas={precios.datos ?? null}
            idDe={(p) => p.id}
            columnas={columnasPrecio}
            cargando={precios.cargando}
            alto={360}
            anchoMinimo={560}
            vacio={{
              titulo: 'Todavía no tiene precio',
              descripcion:
                'Sin precio, el costo de este insumo es desconocido y se propaga como incompleto a todo lo que lo use.',
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
      )}

      {i && abrirPrecio && (
        <ModalPrecio
          insumo={i}
          onClose={() => setAbrirPrecio(false)}
          onGuardado={() => {
            setAviso('Precio registrado.');
            insumo.recargar();
            precios.recargar();
          }}
        />
      )}
    </Pagina>
  );
}
