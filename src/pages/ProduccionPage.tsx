import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconChevronLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

import {
  companeras,
  ETIQUETA_RESULTADO,
  misLotes,
  registrarResultado,
  trabajoDelLote,
  type MiLote,
  type ResultadoLote,
} from '@/features/produccion/api';
import { cantidad as fmtCantidad, fecha as fmtFecha } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

/** El mismo campo oscuro que usa el resto del front del usuario. */
const CAJA = {
  border: '1px solid var(--ely-borde)',
  background: 'var(--ely-superficie)',
  borderRadius: 12,
};

/**
 * Lo que la productora tiene que cargar después de fabricar.
 *
 * La lista no es "todos los lotes" sino los suyos: un lote nace cuando la
 * administración le entrega el material que pidió, con ella como responsable
 * (`lote_desde_solicitud`). Por eso no hay nada que elegir ni forma de cargarle
 * resultado a una producción que no es suya — el pedido de insumos y la
 * producción son la misma fila.
 *
 * Todo lo que se ve acá son cantidades y horas. Ni un número de plata: los
 * datos vienen de `mis_lotes()` y se escriben con `registrar_resultado_lote()`,
 * que no devuelven ni aceptan costos.
 */
export function ProduccionPage() {
  const lotes = useAsync(misLotes, []);
  const [abierto, setAbierto] = useState<MiLote | null>(null);

  if (abierto) {
    return (
      <Formulario
        lote={abierto}
        onVolver={() => setAbierto(null)}
        onGuardado={() => {
          setAbierto(null);
          lotes.recargar();
        }}
      />
    );
  }

  const pendientes = (lotes.datos ?? []).filter((l) => !l.cerrado && !l.reportadoEn);
  const cargados = (lotes.datos ?? []).filter((l) => l.cerrado || l.reportadoEn);

  return (
    <Stack gap={24}>
      <Box>
        <Text className="rotulo">Producción</Text>
        <Text fz={13} c="var(--ely-texto-2)" mt={6} lh={1.5}>
          Cada vez que te entregan el material de un pedido se abre una producción acá.
          Cuando termines, cargá lo que salió.
        </Text>
      </Box>

      {lotes.cargando && <Skeleton h={160} radius={12} />}

      {lotes.error && (
        <Alert color="error" variant="light" title="No se pudo cargar">
          {lotes.error}
        </Alert>
      )}

      {lotes.datos?.length === 0 && (
        <Text fz="sm" c="var(--ely-texto-2)" ta="center" py="lg">
          Todavía no tenés ninguna producción. Empieza cuando pedís materia prima y te la
          entregan.
        </Text>
      )}

      {pendientes.length > 0 && (
        <Grupo titulo="Falta cargar el resultado" color="cian.4">
          {pendientes.map((l) => (
            <Fila key={l.id} lote={l} onAbrir={() => setAbierto(l)} />
          ))}
        </Grupo>
      )}

      {cargados.length > 0 && (
        <Grupo titulo="Ya cargadas">
          {cargados.map((l) => (
            <Fila key={l.id} lote={l} onAbrir={() => setAbierto(l)} />
          ))}
        </Grupo>
      )}
    </Stack>
  );
}

function Grupo({
  titulo,
  color,
  children,
}: {
  titulo: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Text className="rotulo" c={color} mb={4}>
        {titulo}
      </Text>
      <Stack gap={0}>{children}</Stack>
    </Box>
  );
}

function Fila({ lote: l, onAbrir }: { lote: MiLote; onAbrir: () => void }) {
  const pie = l.cerrado
    ? 'Cerrada por la administración'
    : l.reportadoEn
      ? `Cargaste ${fmtCantidad(l.unidadesObtenidas ?? 0)} u — podés corregirlo`
      : `${fmtCantidad(l.unidadesPlanificadas)} u planificadas`;

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      gap={12}
      py={13}
      style={{ borderTop: '1px solid var(--ely-borde-tenue)' }}
    >
      <Box style={{ minWidth: 0 }}>
        <Text fz={15} fw={600}>
          {l.producto}
          {l.tamano && (
            <Text span fz={13} fw={400} c="var(--ely-texto-2)">
              {' '}
              · {l.tamano}
            </Text>
          )}
        </Text>
        <Text fz={11.5} c="var(--ely-texto-3)" mt={3}>
          {fmtFecha(l.fecha)} · {pie}
        </Text>
      </Box>
      <Button
        size="xs"
        variant={l.cerrado ? 'default' : l.reportadoEn ? 'default' : 'filled'}
        onClick={onAbrir}
      >
        {l.cerrado ? 'Ver' : l.reportadoEn ? 'Corregir' : 'Cargar'}
      </Button>
    </Group>
  );
}

type Linea = { personaId: string | null; horas: number | ''; clave: number };

/**
 * El parte de la producción: cuánto salió, cuánto se perdió y quiénes la
 * hicieron.
 *
 * Las horas van por persona y no como un total con un "cuántas fueron" al lado:
 * el número de personas se cuenta solo a partir de la lista, y un total suelto
 * no permite después saber a quién pagarle qué — que es para lo que Johanna lo
 * necesita.
 */
function Formulario({
  lote: l,
  onVolver,
  onGuardado,
}: {
  lote: MiLote;
  onVolver: () => void;
  onGuardado: () => void;
}) {
  const gente = useAsync(companeras, []);
  const previo = useAsync(() => trabajoDelLote(l.id), [l.id]);

  const [resultado, setResultado] = useState<ResultadoLote>(l.resultado ?? 'ok');
  const [obtenidas, setObtenidas] = useState<number | ''>(
    l.unidadesObtenidas ?? l.unidadesPlanificadas,
  );
  const [perdida, setPerdida] = useState<number | ''>(l.perdidaCantidad ?? '');
  const [notas, setNotas] = useState(l.notas ?? '');
  const [lineas, setLineas] = useState<Linea[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Las líneas arrancan de lo que ya estaba cargado y, si no había nada, de una
  // fila vacía: la productora casi siempre es una de las que trabajó.
  const filas =
    lineas ??
    (previo.datos
      ? previo.datos.length > 0
        ? previo.datos.map((t, i) => ({
            personaId: t.personaId,
            horas: (t.horas ?? '') as number | '',
            clave: i,
          }))
        : [{ personaId: null, horas: '' as number | '', clave: 0 }]
      : []);

  const soloLectura = l.cerrado;

  function cambiar(clave: number, cambio: Partial<Linea>) {
    setLineas(filas.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));
  }

  async function guardar() {
    if (obtenidas === '' && resultado !== 'descarte') {
      setError('Falta cuántas unidades salieron.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await registrarResultado(l.id, {
        resultado,
        unidadesObtenidas: resultado === 'descarte' ? 0 : Number(obtenidas),
        perdidaCantidad: perdida === '' ? null : Number(perdida),
        notas: notas.trim() || null,
        personas: filas
          .filter((f) => f.personaId)
          .map((f) => ({
            persona_id: f.personaId as string,
            horas: f.horas === '' ? null : Number(f.horas),
          })),
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  const opciones = (gente.datos ?? []).map((p) => ({ value: p.id, label: p.nombre }));

  return (
    <Stack gap={20}>
      <Group gap={6} wrap="nowrap">
        <ActionIcon variant="subtle" color="gray" aria-label="Volver" onClick={onVolver}>
          <IconChevronLeft size={19} />
        </ActionIcon>
        <Box>
          <Text fz={16} fw={700}>
            {l.producto}
            {l.tamano && (
              <Text span fz={13} fw={400} c="var(--ely-texto-2)">
                {' '}
                · {l.tamano}
              </Text>
            )}
          </Text>
          <Text fz={11.5} c="var(--ely-texto-3)">
            {fmtFecha(l.fecha)} · {fmtCantidad(l.unidadesPlanificadas)} u planificadas
          </Text>
        </Box>
      </Group>

      {soloLectura && (
        <Alert color="advertencia" variant="light" py={8}>
          <Text fz="xs">
            La administración ya cerró esta producción, así que no se puede seguir
            editando. Si algo quedó mal, avisale.
          </Text>
        </Alert>
      )}

      <Box>
        <Text className="rotulo" mb={7}>
          Cómo salió
        </Text>
        <Select
          data={Object.entries(ETIQUETA_RESULTADO).map(([value, label]) => ({
            value,
            label,
          }))}
          value={resultado}
          onChange={(v) => setResultado((v ?? 'ok') as ResultadoLote)}
          allowDeselect={false}
          disabled={soloLectura}
          size="md"
          styles={{ input: { ...CAJA, height: 48, fontSize: 15 } }}
        />
      </Box>

      {resultado !== 'descarte' && (
        <Group grow align="flex-start" gap={12}>
          <Box>
            <Text className="rotulo" mb={7}>
              Unidades que salieron
            </Text>
            <NumberInput
              value={obtenidas}
              onChange={(v) => setObtenidas(v === '' ? '' : Number(v))}
              min={0}
              disabled={soloLectura}
              size="md"
              styles={{ input: { ...CAJA, height: 48, fontSize: 15 } }}
            />
          </Box>
          <Box>
            <Text className="rotulo" mb={7}>
              Se perdieron
            </Text>
            <NumberInput
              value={perdida}
              onChange={(v) => setPerdida(v === '' ? '' : Number(v))}
              min={0}
              placeholder="0"
              disabled={soloLectura}
              size="md"
              styles={{ input: { ...CAJA, height: 48, fontSize: 15 } }}
            />
          </Box>
        </Group>
      )}

      <Box>
        <Group justify="space-between" align="baseline" mb={7}>
          <Text className="rotulo">Quiénes trabajaron</Text>
          <Text fz={11} c="var(--ely-texto-3)">
            {filas.filter((f) => f.personaId).length} persona
            {filas.filter((f) => f.personaId).length === 1 ? '' : 's'}
          </Text>
        </Group>

        {previo.cargando || gente.cargando ? (
          <Skeleton h={48} radius={12} />
        ) : (
          <Stack gap={8}>
            {filas.map((f) => (
              <Group key={f.clave} gap={8} wrap="nowrap" align="center">
                <Select
                  placeholder="Elegí a alguien"
                  data={opciones}
                  value={f.personaId}
                  onChange={(v) => cambiar(f.clave, { personaId: v })}
                  searchable
                  disabled={soloLectura}
                  style={{ flex: 1, minWidth: 0 }}
                  styles={{ input: { ...CAJA, height: 44, fontSize: 14 } }}
                />
                <NumberInput
                  value={f.horas}
                  onChange={(v) => cambiar(f.clave, { horas: v === '' ? '' : Number(v) })}
                  min={0}
                  step={0.5}
                  placeholder="hs"
                  disabled={soloLectura}
                  w={84}
                  styles={{ input: { ...CAJA, height: 44, fontSize: 14 } }}
                />
                {!soloLectura && filas.length > 1 && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Sacar a esta persona"
                    onClick={() => setLineas(filas.filter((x) => x.clave !== f.clave))}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}

            {!soloLectura && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  setLineas([...filas, { personaId: null, horas: '', clave: Date.now() }])
                }
              >
                Sumar a alguien
              </Button>
            )}
          </Stack>
        )}
      </Box>

      <Box>
        <Text className="rotulo" mb={7}>
          Algo que contar
        </Text>
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.currentTarget.value)}
          placeholder="Qué pasó, si algo salió distinto…"
          autosize
          minRows={2}
          disabled={soloLectura}
          styles={{ input: { ...CAJA, fontSize: 14 } }}
        />
      </Box>

      {error && (
        <Alert color="error" variant="light" title="No se pudo guardar">
          {error}
        </Alert>
      )}

      {!soloLectura && (
        <Button size="md" loading={guardando} onClick={() => void guardar()}>
          {l.reportadoEn ? 'Guardar los cambios' : 'Cargar el resultado'}
        </Button>
      )}

      <Text fz={11} c="var(--ely-texto-3)" ta="center" lh={1.5}>
        Esto no cierra la producción: lo revisa la administración y lo cierra ella. Hasta
        entonces podés corregirlo.
      </Text>
    </Stack>
  );
}
