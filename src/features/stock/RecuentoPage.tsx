import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarProductos } from '@/features/productos/api';
import {
  borrarRecuento,
  confirmarRecuento,
  guardarLineaRecuento,
  lineasDelRecuento,
  obtenerRecuento,
  type LineaRecuento,
} from '@/features/stock/api';
import { cantidad, fecha as fmtFecha } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

/** La diferencia entre lo contado y lo que decía el sistema. */
const diferencia = (l: LineaRecuento, contada: number | null) =>
  contada == null || l.teorica == null ? null : contada - l.teorica;

/**
 * La planilla de conteo.
 *
 * Se carga un tamaño por fila y cada número se guarda al salir del campo: un
 * recuento es una sesión larga frente al estante, y perder lo contado por no
 * haber apretado guardar sería el peor final posible.
 *
 * Mientras está abierto no toca el stock. Confirmar es lo que emite los ajustes
 * por la diferencia, y no se puede deshacer.
 */
export function RecuentoPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardandoFila, setGuardandoFila] = useState<string | null>(null);
  /**
   * Solo lo que se tipeó en esta sesión, por tamaño. Es una capa encima de lo
   * que ya está guardado, no una copia: así no hace falta sincronizar el estado
   * con lo que llega de la base, que es de donde salen la mitad de los bugs de
   * una planilla editable.
   */
  const [editadas, setEditadas] = useState<Record<string, number | string>>({});

  const recuento = useAsync(() => obtenerRecuento(id), [id]);
  const productos = useAsync(listarProductos, []);

  const lineas = useAsync(
    async () =>
      recuento.datos && productos.datos
        ? lineasDelRecuento(
            recuento.datos,
            productos.datos.flatMap((p) => p.tamanos),
          )
        : null,
    [id, recuento.datos?.estado, productos.datos?.length],
  );

  /** Lo que muestra la fila: lo tipeado si se tocó, si no lo ya guardado. */
  const valorDe = (l: LineaRecuento): number | string =>
    editadas[l.tamanoId] ?? l.contada ?? '';

  const r = recuento.datos;
  const abierto = r?.estado === 'abierto';

  async function guardarFila(l: LineaRecuento) {
    const valor = valorDe(l);
    if (valor === '' || valor == null) return;
    if (Number(valor) === l.contada) return;

    setGuardandoFila(l.tamanoId);
    setError(null);
    try {
      await guardarLineaRecuento({
        recuento_id: id,
        tamano_id: l.tamanoId,
        cantidad_contada: Number(valor),
      });
      lineas.recargar();
      recuento.recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardandoFila(null);
    }
  }

  if (recuento.error) {
    return (
      <Pagina
        titulo="Recuento"
        volver={{ a: '/admin/stock/recuentos', texto: 'Volver a recuentos' }}
      >
        <Alert color="error" variant="light" icon={<IconAlertTriangle size={16} />}>
          {recuento.error}
        </Alert>
      </Pagina>
    );
  }

  const filas = lineas.datos ?? [];
  const cargadas = filas.filter((l) => valorDe(l) !== '');
  const conDiferencia = cargadas.filter((l) => {
    const d = diferencia(l, Number(valorDe(l)));
    return d != null && d !== 0;
  });

  const columnas: Columna<LineaRecuento>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      orden: (l) => l.producto,
      render: (l) => (
        <Text size="sm" fw={500}>
          {l.producto}
        </Text>
      ),
    },
    {
      clave: 'tamano',
      titulo: 'Tamaño',
      ancho: 130,
      orden: (l) => l.tamano,
      render: (l) => (
        <Text size="sm" c="dimmed">
          {l.tamano}
        </Text>
      ),
    },
    {
      clave: 'teorica',
      titulo: 'Según el sistema',
      numerica: true,
      ancho: 160,
      orden: (l) => l.teorica,
      render: (l) => <Numero valor={l.teorica} sufijo="u" size="sm" c="dimmed" />,
    },
    {
      clave: 'contada',
      titulo: 'Contado',
      numerica: true,
      ancho: 150,
      orden: (l) => l.contada,
      render: (l) =>
        abierto ? (
          <CampoNumerico
            size="xs"
            w={110}
            min={0}
            placeholder="—"
            aria-label={`Contado de ${l.producto} ${l.tamano}`}
            value={valorDe(l)}
            disabled={guardandoFila === l.tamanoId}
            onChange={(v) => setEditadas((c) => ({ ...c, [l.tamanoId]: v }))}
            onBlur={() => void guardarFila(l)}
          />
        ) : (
          <Numero valor={l.contada} sufijo="u" fw={500} />
        ),
    },
    {
      clave: 'diferencia',
      titulo: 'Diferencia',
      numerica: true,
      ancho: 140,
      orden: (l) => diferencia(l, l.contada),
      render: (l) => {
        const valor = abierto ? valorDe(l) : l.contada;
        const d = diferencia(l, valor === '' || valor == null ? null : Number(valor));
        if (d == null)
          return (
            <Text size="sm" c="dimmed">
              sin contar
            </Text>
          );
        if (d === 0)
          return (
            <Text size="sm" c="dimmed">
              coincide
            </Text>
          );
        return (
          <Numero
            valor={d}
            formato={(n) => `${n > 0 ? '+' : ''}${n.toLocaleString('es-AR')}`}
            sufijo="u"
            fw={600}
            c="advertencia.4"
          />
        );
      },
    },
  ];

  return (
    <Pagina
      titulo={
        <Group gap="sm">
          {r ? `Recuento · ${r.ubicacion}` : '…'}
          {r &&
            (abierto ? (
              <BadgeEstado tono="advertencia">Abierto</BadgeEstado>
            ) : (
              <BadgeEstado>Confirmado</BadgeEstado>
            ))}
          {r?.esStockInicial && <BadgeEstado>Stock inicial</BadgeEstado>}
        </Group>
      }
      descripcion={
        r ? `${fmtFecha(r.fecha)}${r.notas ? ` · ${r.notas}` : ''}` : undefined
      }
      volver={{ a: '/admin/stock/recuentos', texto: 'Volver a recuentos' }}
      acciones={
        abierto ? (
          <Button
            leftSection={<IconCheck size={15} />}
            disabled={!cargadas.length}
            onClick={() => setConfirmando(true)}
          >
            Confirmar recuento
          </Button>
        ) : null
      }
    >
      {error && (
        <Alert color="error" variant="light" title="No se pudo guardar">
          {error}
        </Alert>
      )}

      <Paper withBorder p="md" bg="noche.6">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Contados
            </Text>
            <Numero valor={cargadas.length} />
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Con diferencia
            </Text>
            <Numero
              valor={conDiferencia.length}
              c={conDiferencia.length ? 'advertencia.4' : undefined}
            />
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Sin contar
            </Text>
            <Numero valor={filas.length - cargadas.length} />
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Estado del stock
            </Text>
            <Text size="sm" c="dimmed">
              {abierto ? 'todavía sin tocar' : 'ajustado'}
            </Text>
          </Stack>
        </SimpleGrid>
      </Paper>

      <Tabla
        filas={filas}
        idDe={(l) => l.tamanoId}
        columnas={columnas}
        cargando={lineas.cargando || productos.cargando}
        textoBusqueda={(l) => `${l.producto} ${l.tamano}`}
        placeholderBusqueda="Buscar lo que estás contando…  (/)"
        anchoMinimo={800}
        alto="calc(100vh - 380px)"
        vacio={{
          titulo: 'No hay tamaños para contar',
          descripcion: 'Cargá productos y tamaños antes de hacer un recuento.',
        }}
      />

      {abierto && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color="error"
            leftSection={<IconTrash size={15} />}
            onClick={() => setBorrando(true)}
          >
            Descartar el recuento
          </Button>
        </Group>
      )}

      <Modal
        opened={confirmando}
        onClose={() => setConfirmando(false)}
        title="Confirmar el recuento"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se emite un ajuste por cada diferencia y el stock pasa a decir lo que
            contaste. Lo que no contaste queda como está.
          </Text>
          <Alert color="advertencia" variant="light" py={8}>
            <Text size="sm">
              {conDiferencia.length === 0
                ? 'No hay diferencias: no se va a emitir ningún movimiento.'
                : `${conDiferencia.length} ${
                    conDiferencia.length === 1 ? 'tamaño tiene' : 'tamaños tienen'
                  } diferencia y van a generar un ajuste.`}
            </Text>
            {conDiferencia.length > 0 && (
              <Text size="xs" c="dimmed" mt={4}>
                {conDiferencia
                  .map((l) => {
                    const d = diferencia(l, Number(valorDe(l)))!;
                    return `${l.producto} ${l.tamano}: ${d > 0 ? '+' : ''}${cantidad(d)}`;
                  })
                  .join(' · ')}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              No se puede deshacer: los ajustes son movimientos inmutables.
            </Text>
          </Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setConfirmando(false)}>
              Seguir contando
            </Button>
            <Button
              onClick={() =>
                void (async () => {
                  setError(null);
                  try {
                    await confirmarRecuento(id);
                    setConfirmando(false);
                    recuento.recargar();
                    lineas.recargar();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                })()
              }
            >
              Confirmar y ajustar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={borrando}
        onClose={() => setBorrando(false)}
        title="Descartar el recuento"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Se borra el recuento y lo contado hasta ahora. Se puede porque todavía no tocó
            el stock.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={() => setBorrando(false)}>
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={() =>
                void (async () => {
                  try {
                    await borrarRecuento(id);
                    navigate('/admin/stock/recuentos');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                })()
              }
            >
              Descartar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Pagina>
  );
}
