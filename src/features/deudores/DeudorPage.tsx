import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Group,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCash,
  IconCheck,
  IconDots,
  IconTrash,
  IconWand,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  borrarImputacion,
  borrarPago,
  imputarFifo,
  obtenerPersona,
  pagosDePersona,
  ventasDePersona,
  type Pago,
  type VentaConSaldo,
} from '@/features/deudores/api';
import { ModalImputar, ModalPago } from '@/features/deudores/ModalPago';
import { ETIQUETA_TIPO_VENTA } from '@/features/ventas/api';
import { diasDesde, fecha as fmtFecha, importe } from '@/lib/formato';
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

/**
 * La cuenta corriente de una persona: qué le falta pagar y qué pagó.
 *
 * Las dos tablas son las dos caras del mismo hecho. Ninguna guarda un saldo:
 * el de la venta sale de restarle lo imputado, y el del pago de restarle lo que
 * se aplicó.
 */
export function DeudorPage() {
  const { id = '' } = useParams();
  const [pagando, setPagando] = useState(false);
  const [imputando, setImputando] = useState<Pago | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persona = useAsync(() => obtenerPersona(id), [id]);
  const ventas = useAsync(() => ventasDePersona(id), [id]);
  const pagos = useAsync(() => pagosDePersona(id), [id]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const p = persona.datos;
  const lista = ventas.datos ?? [];
  const deuda = lista.reduce((n, v) => n + v.saldo, 0);
  const impagas = lista.filter((v) => v.saldo > 0);
  const aFavor = (pagos.datos ?? []).reduce((n, x) => n + x.sobrante, 0);

  function recargar() {
    ventas.recargar();
    pagos.recargar();
  }

  async function correr(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (persona.error) {
    return (
      <Pagina
        titulo="Deudor"
        volver={{ a: '/admin/deudores', texto: 'Volver a deudores' }}
      >
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {persona.error}
        </Alert>
      </Pagina>
    );
  }

  const columnasVenta: Columna<VentaConSaldo>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 120,
      orden: (v) => v.fecha,
      render: (v) => (
        <Anchor
          component={Link}
          to={`/admin/ventas/${v.ventaId}`}
          size="sm"
          className="tabular"
        >
          {fmtFecha(v.fecha)}
        </Anchor>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 180,
      orden: (v) => v.tipo,
      render: (v) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO_VENTA[v.tipo]}
        </Text>
      ),
    },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      ancho: 140,
      orden: (v) => v.total,
      render: (v) => <Numero valor={v.total} formato={(n) => importe(n, 'ARS')} />,
    },
    {
      clave: 'pagado',
      titulo: 'Pagado',
      numerica: true,
      ancho: 140,
      orden: (v) => v.pagado,
      render: (v) => (
        <Numero
          valor={v.pagado}
          formato={(n) => importe(n, 'ARS')}
          size="sm"
          c="dimmed"
        />
      ),
    },
    {
      clave: 'saldo',
      titulo: 'Saldo',
      numerica: true,
      ancho: 150,
      orden: (v) => v.saldo,
      render: (v) =>
        v.saldo <= 0 ? (
          <Group gap={5} wrap="nowrap" justify="flex-end">
            <IconCheck size={13} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="sm" c="dimmed">
              saldada
            </Text>
          </Group>
        ) : (
          <Numero
            valor={v.saldo}
            formato={(n) => importe(n, 'ARS')}
            fw={600}
            c="advertencia.4"
          />
        ),
    },
  ];

  const columnasPago: Columna<Pago>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 120,
      orden: (x) => x.fecha,
      render: (x) => (
        <Text size="sm" className="tabular">
          {fmtFecha(x.fecha)}
        </Text>
      ),
    },
    {
      clave: 'forma',
      titulo: 'Forma',
      ancho: 200,
      orden: (x) => x.formaPago,
      render: (x) => (
        <Text size="sm" c="dimmed">
          {[x.formaPago, x.cuenta].filter(Boolean).join(' · ')}
        </Text>
      ),
    },
    {
      clave: 'aplicado',
      titulo: 'Aplicado a',
      orden: (x) => x.imputaciones.length,
      render: (x) =>
        x.imputaciones.length ? (
          <Group gap={8} wrap="wrap">
            {x.imputaciones.map((i) => (
              <Anchor
                key={i.id}
                component={Link}
                to={`/admin/ventas/${i.ventaId}`}
                size="xs"
                c="dimmed"
                onClick={(e) => e.stopPropagation()}
              >
                {fmtFecha(i.fecha)}: {importe(i.monto, 'ARS')}
              </Anchor>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            sin aplicar
          </Text>
        ),
    },
    {
      clave: 'monto',
      titulo: 'Monto',
      numerica: true,
      ancho: 150,
      orden: (x) => x.monto,
      render: (x) => (
        <Group gap={6} wrap="nowrap" justify="flex-end">
          <Numero valor={x.monto} formato={(n) => importe(n, 'ARS')} fw={600} />
          {x.sobrante > 0 && (
            <BadgeEstado
              tono="advertencia"
              ayuda={`Quedan ${importe(x.sobrante, 'ARS')} sin aplicar a ninguna venta.`}
            >
              a favor
            </BadgeEstado>
          )}
        </Group>
      ),
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {p?.nombre ?? '…'}
          {p?.esRevendedor && <BadgeEstado>Revendedora</BadgeEstado>}
          {p?.esProductor && <BadgeEstado>Productora</BadgeEstado>}
          {p && !p.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      }
      descripcion={p?.contacto ?? undefined}
      volver={{ a: '/admin/deudores', texto: 'Volver a deudores' }}
      acciones={
        <Button leftSection={<IconCash size={15} />} onClick={() => setPagando(true)}>
          Registrar pago
        </Button>
      }
    >
      {aviso && (
        <Alert
          color="exito"
          variant="light"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setAviso(null)}
          py={6}
        >
          {aviso}
        </Alert>
      )}

      {error && (
        <Alert color="error" variant="light" title="No se pudo completar">
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Dato etiqueta="Debe">
            {deuda > 0 ? (
              <Numero
                valor={deuda}
                formato={(n) => importe(n, 'ARS')}
                fw={700}
                c="advertencia.4"
              />
            ) : (
              <Text size="sm" c="dimmed">
                nada
              </Text>
            )}
          </Dato>
          <Dato etiqueta="Ventas impagas">
            <Numero valor={impagas.length} />
          </Dato>
          <Dato etiqueta="Deuda más vieja">
            {impagas.length ? (
              <Text size="sm" className="tabular">
                {fmtFecha(impagas[0].fecha)}
                <Text component="span" size="xs" c="dimmed">
                  {' '}
                  · hace {diasDesde(impagas[0].fecha)} días
                </Text>
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Dato>
          <Dato etiqueta="A favor">
            {aFavor > 0 ? (
              <Numero valor={aFavor} formato={(n) => importe(n, 'ARS')} />
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Dato>
        </SimpleGrid>
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Ventas
          </Text>
          <Text size="xs" c="dimmed">
            De la más vieja a la más nueva: es el orden en que se cobran.
          </Text>
        </Group>
        <Tabla
          filas={ventas.datos ?? null}
          idDe={(v) => v.ventaId}
          columnas={columnasVenta}
          cargando={ventas.cargando}
          alto={340}
          anchoMinimo={760}
          vacio={{
            titulo: 'No tiene ventas confirmadas',
            descripcion:
              'Una venta en borrador no genera deuda: recién cuando se confirma aparece acá.',
          }}
        />
      </Stack>

      <Stack gap="xs">
        <Text fw={600} size="sm">
          Pagos
        </Text>
        <Tabla
          filas={pagos.datos ?? null}
          idDe={(x) => x.id}
          columnas={columnasPago}
          cargando={pagos.cargando}
          alto={320}
          anchoMinimo={820}
          vacio={{
            titulo: 'Todavía no registró ningún pago',
            descripcion:
              'Al cargarlo se imputa solo, de la deuda más vieja a la más nueva.',
            accion: (
              <Button
                leftSection={<IconCash size={15} />}
                onClick={() => setPagando(true)}
              >
                Registrar el primero
              </Button>
            ),
          }}
          acciones={(x) => (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label="Acciones del pago">
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {x.sobrante > 0 && (
                  <>
                    <Menu.Item
                      leftSection={<IconWand size={14} />}
                      onClick={() =>
                        void correr(async () => {
                          const resto = await imputarFifo(x.id);
                          setAviso(
                            resto > 0
                              ? `Quedan ${importe(resto, 'ARS')} sin aplicar: no hay más ventas con saldo.`
                              : 'Sobrante imputado.',
                          );
                        })
                      }
                    >
                      Imputar el sobrante (más vieja primero)
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCash size={14} />}
                      onClick={() => setImputando(x)}
                    >
                      Imputar a una venta puntual
                    </Menu.Item>
                  </>
                )}
                {x.imputaciones.map((i) => (
                  <Menu.Item
                    key={i.id}
                    leftSection={<IconTrash size={14} />}
                    onClick={() => void correr(() => borrarImputacion(i.id))}
                  >
                    Deshacer {importe(i.monto, 'ARS')} del {fmtFecha(i.fecha)}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item
                  color="error"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => void correr(() => borrarPago(x.id))}
                >
                  Eliminar el pago
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        />
      </Stack>

      {p && pagando && (
        <ModalPago
          personaId={id}
          nombre={p.nombre}
          deuda={deuda}
          onClose={() => setPagando(false)}
          onGuardado={(resumen) => {
            setAviso(resumen);
            recargar();
          }}
        />
      )}

      {imputando && (
        <ModalImputar
          pago={imputando}
          ventas={lista}
          onClose={() => setImputando(null)}
          onGuardado={() => {
            setAviso('Imputación registrada.');
            recargar();
          }}
        />
      )}
    </Pagina>
  );
}
