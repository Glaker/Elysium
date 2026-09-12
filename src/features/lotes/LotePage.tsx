import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconEdit,
  IconLock,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  borrarLote,
  borrarPersonaLote,
  insumosDelLote,
  obtenerLote,
  personasDelLote,
  planificar,
  type InsumoDelLote,
  type PersonaDelLote,
} from '@/features/lotes/api';
import { EstadoLoteBadge } from '@/features/lotes/LotesPage';
import { ModalCerrarLote } from '@/features/lotes/ModalCerrarLote';
import { ModalPersonaLote } from '@/features/lotes/ModalPersonaLote';
import { ETIQUETA_VARIANTE } from '@/features/productos/api';
import { cantidad, fecha as fmtFecha, importe } from '@/lib/formato';
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

export function LotePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editandoPersona, setEditandoPersona] = useState<
    PersonaDelLote | null | undefined
  >(undefined);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [replanificando, setReplanificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lote = useAsync(() => obtenerLote(id), [id]);
  const insumos = useAsync(() => insumosDelLote(id), [id, lote.datos?.estado]);
  const personas = useAsync(() => personasDelLote(id), [id]);

  const l = lote.datos;
  const abierto = l?.estado === 'abierto';
  const cerrando = params.get('cerrar') === '1';

  async function correr(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (lote.error) {
    return (
      <Pagina titulo="Lote" volver={{ a: '/admin/lotes', texto: 'Volver a lotes' }}>
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {lote.error}
        </Alert>
      </Pagina>
    );
  }

  const columnasInsumo: Columna<InsumoDelLote>[] = [
    {
      clave: 'insumo',
      titulo: 'Insumo',
      orden: (i) => i.nombre,
      render: (i) => (
        <Anchor
          component={Link}
          to={`/admin/insumos/${i.insumoId}`}
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          {i.nombre}
        </Anchor>
      ),
    },
    {
      clave: 'planificada',
      titulo: 'Planificado',
      numerica: true,
      ancho: 140,
      orden: (i) => i.planificada,
      render: (i) => <Numero valor={i.planificada} sufijo={i.unidadChica} />,
    },
    {
      clave: 'stock',
      titulo: 'Stock actual',
      numerica: true,
      ancho: 150,
      orden: (i) => i.stock,
      render: (i) => {
        const falta = i.stock == null || i.stock < i.planificada;
        return (
          <Group gap={5} wrap="nowrap" justify="flex-end">
            <Numero
              valor={i.stock}
              sufijo={i.unidadChica}
              size="sm"
              c="dimmed"
              titulo="Sin movimientos de stock"
              faltantes={['este insumo nunca entró ni salió del stock']}
            />
            {falta && abierto && (
              <Tooltip
                label={
                  i.stock == null
                    ? 'No hay stock registrado de este insumo. El lote se puede cerrar igual: el stock queda en negativo y se corrige con un ajuste.'
                    : `Faltan ${cantidad(i.planificada - i.stock)} ${i.unidadChica}. Cerrar el lote va a dejar el stock en negativo.`
                }
              >
                <IconAlertTriangleFilled
                  size={13}
                  style={{
                    color: 'var(--mantine-color-advertencia-5)',
                    display: 'block',
                  }}
                />
              </Tooltip>
            )}
          </Group>
        );
      },
    },
    {
      clave: 'consumida',
      titulo: 'Consumido',
      numerica: true,
      ancho: 140,
      orden: (i) => i.consumida,
      render: (i) =>
        abierto ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Numero valor={i.consumida} sufijo={i.unidadChica} />
        ),
    },
    {
      clave: 'costoUnitario',
      titulo: 'Costo unitario',
      numerica: true,
      ancho: 150,
      orden: (i) => i.costoUnitario,
      render: (i) =>
        abierto ? (
          <Text size="sm" c="dimmed">
            se congela al cerrar
          </Text>
        ) : (
          <Numero
            valor={i.costoUnitario}
            formato={(n) => importe(n, 'ARS')}
            sufijo={`/ ${i.unidadChica}`}
            size="sm"
            c="dimmed"
            titulo="No se pudo congelar el costo"
          />
        ),
    },
    {
      clave: 'costoTotal',
      titulo: 'Costo',
      numerica: true,
      ancho: 140,
      orden: (i) => i.costoTotal,
      render: (i) =>
        abierto ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Numero
            valor={i.costoTotal}
            formato={(n) => importe(n, 'ARS')}
            fw={500}
            titulo="No se pudo congelar el costo"
          />
        ),
    },
  ];

  const columnasPersona: Columna<PersonaDelLote>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      orden: (p) => p.nombre,
      render: (p) => <Text size="sm">{p.nombre}</Text>,
    },
    {
      clave: 'horas',
      titulo: 'Horas',
      numerica: true,
      ancho: 120,
      orden: (p) => p.horas,
      render: (p) => <Numero valor={p.horas} sufijo="h" titulo="Sin horas cargadas" />,
    },
    {
      clave: 'importe',
      titulo: 'Pagado',
      numerica: true,
      ancho: 150,
      orden: (p) => p.importePagado,
      render: (p) => (
        <Numero
          valor={p.importePagado}
          formato={(n) => importe(n, 'ARS')}
          titulo="Sin importe cargado"
          faltantes={['mientras no haya importe, la mano de obra del lote se estima']}
        />
      ),
    },
    {
      clave: 'notas',
      titulo: 'Notas',
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.notas ?? ''}
        </Text>
      ),
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {l ? (l.codigo ?? `Lote del ${fmtFecha(l.fecha)}`) : '…'}
          {l && <EstadoLoteBadge l={l} />}
        </Group>
      }
      descripcion={
        l
          ? `${l.produce} · ${cantidad(l.planificadas)} ${l.unidad} planificados · ${fmtFecha(l.fecha)}`
          : undefined
      }
      volver={{ a: '/admin/lotes', texto: 'Volver a lotes' }}
      acciones={
        abierto ? (
          <>
            <Button
              variant="default"
              leftSection={<IconRefresh size={15} />}
              loading={replanificando}
              onClick={() =>
                void correr(async () => {
                  setReplanificando(true);
                  try {
                    await planificar(id);
                    insumos.recargar();
                  } finally {
                    setReplanificando(false);
                  }
                })
              }
            >
              Replanificar
            </Button>
            <Button
              leftSection={<IconLock size={15} />}
              onClick={() => setParams({ cerrar: '1' })}
            >
              Cerrar lote
            </Button>
          </>
        ) : null
      }
    >
      {error && (
        <Alert color="error" variant="light" title="No se pudo completar">
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.8">
        <SimpleGrid cols={{ base: 2, md: 5 }} spacing="lg">
          <Dato etiqueta="Variante">
            {!l ? null : l.destino === 'mp' ? (
              <Text size="sm" c="dimmed">
                no aplica
              </Text>
            ) : (
              <Text size="sm">{ETIQUETA_VARIANTE[l.variante]}</Text>
            )}
          </Dato>
          <Dato etiqueta="Planificado">
            {l && <Numero valor={l.planificadas} sufijo={l.unidad} />}
          </Dato>
          <Dato etiqueta="Obtenido">
            {!l ? null : abierto ? (
              <Text size="sm" c="dimmed">
                sin cerrar
              </Text>
            ) : (
              <Numero valor={l.obtenidas} sufijo={l.unidad} fw={600} />
            )}
          </Dato>
          <Dato etiqueta="Costo total">
            {!l ? null : abierto ? (
              <Text size="sm" c="dimmed">
                se calcula al cerrar
              </Text>
            ) : (
              <Numero
                valor={l.costoTotal}
                formato={(n) => importe(n, 'ARS')}
                titulo="Costo del lote incompleto"
                faltantes={l.costoFaltantes}
              />
            )}
          </Dato>
          <Dato etiqueta="Costo unitario real">
            {!l ? null : abierto ? (
              <Text size="sm" c="dimmed">
                —
              </Text>
            ) : (
              <Numero
                valor={l.costoUnitario}
                formato={(n) => importe(n, 'ARS')}
                fw={700}
                titulo="Costo del lote incompleto"
                faltantes={l.costoFaltantes}
              />
            )}
          </Dato>
        </SimpleGrid>

        {l && !abierto && (
          <>
            <Divider my="sm" />
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
              <Dato etiqueta="Merma efectiva">
                <Numero valor={l.mermaAplicada} sufijo="%" size="sm" c="dimmed" />
              </Dato>
              <Dato etiqueta="Valor hora aplicado">
                <Numero
                  valor={l.valorHoraAplicado}
                  formato={(n) => importe(n, 'ARS')}
                  size="sm"
                  c="dimmed"
                />
              </Dato>
              <Dato etiqueta="Mano de obra">
                <Group gap={6} wrap="nowrap">
                  <Numero
                    valor={l.costoManoObra}
                    formato={(n) => importe(n, 'ARS')}
                    size="sm"
                    c="dimmed"
                  />
                  {l.costoManoObra != null && (
                    <BadgeEstado
                      ayuda={
                        l.manoObraReal
                          ? 'Sale de lo que se le pagó a las personas del lote.'
                          : 'Estimada por productividad: valor hora ÷ unidades por hora. Cargá lo pagado para que use el número real.'
                      }
                    >
                      {l.manoObraReal ? 'real' : 'estimada'}
                    </BadgeEstado>
                  )}
                </Group>
              </Dato>
              <Dato etiqueta="Pérdida">
                <Numero
                  valor={l.perdida}
                  sufijo={l.unidad}
                  size="sm"
                  c="dimmed"
                  titulo="Sin pérdida declarada"
                />
              </Dato>
            </SimpleGrid>
          </>
        )}

        {l?.costoCompleto === false && (
          <>
            <Divider my="sm" />
            <Alert color="advertencia" variant="light" py={6}>
              <Text size="sm">El costo de este lote quedó incompleto.</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {l.costoFaltantes.join(' · ')}
              </Text>
            </Alert>
          </>
        )}

        {l?.notas && (
          <>
            <Divider my="sm" />
            <Text size="sm" c="dimmed">
              {l.notas}
            </Text>
          </>
        )}
      </Paper>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Insumos del lote
          </Text>
          <Text size="xs" c="dimmed">
            {abierto
              ? 'Lo planificado sale de la fórmula. Al cerrar, la materia prima se consume con la merma sumada encima.'
              : 'Cantidades y costos congelados al cerrar: esto es lo que pasó, no lo que la receta dice hoy.'}
          </Text>
        </Group>
        <Tabla
          filas={insumos.datos ?? null}
          idDe={(i) => i.id}
          columnas={columnasInsumo}
          cargando={insumos.cargando}
          alto={360}
          anchoMinimo={880}
          vacio={{
            titulo: 'El lote no tiene insumos planificados',
            descripcion:
              'Suele ser que el tamaño todavía no tiene fórmula cargada. Cargala y volvé a planificar.',
            accion: abierto ? (
              <Button
                variant="default"
                leftSection={<IconRefresh size={15} />}
                onClick={() => void correr(() => planificar(id).then(insumos.recargar))}
              >
                Replanificar
              </Button>
            ) : undefined,
          }}
        />
      </Stack>

      <Stack gap="xs">
        <Group justify="space-between" align="flex-end">
          <Text fw={600} size="sm">
            Quién trabajó
          </Text>
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPlus size={14} />}
            onClick={() => setEditandoPersona(null)}
          >
            Sumar a alguien
          </Button>
        </Group>
        <Tabla
          filas={personas.datos ?? null}
          idDe={(p) => p.id}
          columnas={columnasPersona}
          cargando={personas.cargando}
          alto={260}
          anchoMinimo={620}
          vacio={{
            titulo: 'Nadie cargado todavía',
            descripcion:
              'Mientras no haya importes pagados, la mano de obra del lote se estima por productividad.',
          }}
          acciones={(p) => (
            <Group gap={2} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Editar ${p.nombre}`}
                onClick={() => setEditandoPersona(p)}
              >
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="error"
                aria-label={`Quitar a ${p.nombre}`}
                onClick={() =>
                  void correr(() => borrarPersonaLote(p.id).then(personas.recargar))
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          )}
        />
      </Stack>

      {abierto && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color="error"
            leftSection={<IconTrash size={15} />}
            onClick={() => setConfirmarBorrado(true)}
          >
            Eliminar el lote
          </Button>
        </Group>
      )}

      {l && cerrando && (
        <ModalCerrarLote
          lote={l}
          onClose={() => setParams({})}
          onCerrado={() => {
            lote.recargar();
            insumos.recargar();
          }}
        />
      )}

      {editandoPersona !== undefined && (
        <ModalPersonaLote
          loteId={id}
          persona={editandoPersona}
          onClose={() => setEditandoPersona(undefined)}
          onGuardado={() => {
            personas.recargar();
            lote.recargar();
          }}
        />
      )}

      <Modal
        opened={confirmarBorrado}
        onClose={() => setConfirmarBorrado(false)}
        title="Eliminar el lote"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se borra el lote y su plan de insumos. Se puede porque todavía está abierto:
            no movió stock ni congeló ningún costo. Un lote cerrado no se borra nunca.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setConfirmarBorrado(false)}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={() =>
                void correr(async () => {
                  await borrarLote(id);
                  navigate('/admin/lotes');
                })
              }
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Pagina>
  );
}
