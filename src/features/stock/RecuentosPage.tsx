import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  crearRecuento,
  listarRecuentos,
  listarUbicaciones,
  type Recuento,
} from '@/features/stock/api';
import { fecha as fmtFecha, hoyISO } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

/**
 * Los recuentos físicos. Johanna cuenta el estante y la app calcula la
 * diferencia contra el teórico: es la operación que reconcilia el sistema con
 * la realidad, y §6 la pide como ciudadana de primera clase.
 */
export function RecuentosPage() {
  const navigate = useNavigate();
  const recuentos = useAsync(listarRecuentos, []);
  const [creando, setCreando] = useState(false);

  const columnas: Columna<Recuento>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 130,
      orden: (r) => r.fecha,
      render: (r) => (
        <Text size="sm" className="tabular">
          {fmtFecha(r.fecha)}
        </Text>
      ),
    },
    {
      clave: 'ubicacion',
      titulo: 'Ubicación',
      orden: (r) => r.ubicacion,
      render: (r) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{r.ubicacion}</Text>
          {r.esStockInicial && (
            <BadgeEstado ayuda="Carga de arranque: la diferencia entra como stock inicial y no como ajuste.">
              Stock inicial
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 140,
      orden: (r) => r.estado,
      render: (r) =>
        r.estado === 'confirmado' ? (
          <BadgeEstado ayuda="Ya emitió los ajustes. No se puede volver atrás.">
            Confirmado
          </BadgeEstado>
        ) : (
          <BadgeEstado tono="advertencia" ayuda="Todavía no tocó el stock.">
            Abierto
          </BadgeEstado>
        ),
    },
    {
      clave: 'lineas',
      titulo: 'Contados',
      numerica: true,
      ancho: 120,
      orden: (r) => r.lineas,
      render: (r) => <Numero valor={r.lineas} />,
    },
    {
      clave: 'notas',
      titulo: 'Notas',
      render: (r) => (
        <Text size="sm" c="dimmed">
          {r.notas ?? ''}
        </Text>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Recuentos"
      descripcion="Contar lo que hay en el estante y dejar que la app calcule la diferencia."
      volver={{ a: '/admin/stock', texto: 'Volver a stock' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setCreando(true)}>
          Nuevo recuento
        </Button>
      }
    >
      {recuentos.error && (
        <Alert
          color="error"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="No se pudieron cargar"
        >
          {recuentos.error}
        </Alert>
      )}

      <Tabla
        filas={recuentos.datos ?? null}
        idDe={(r) => r.id}
        columnas={columnas}
        cargando={recuentos.cargando}
        textoBusqueda={(r) => `${r.ubicacion} ${r.notas ?? ''}`}
        placeholderBusqueda="Buscar por ubicación…  (/)"
        anchoMinimo={720}
        onFila={(r) => navigate(`/admin/stock/recuentos/${r.id}`)}
        vacio={{
          titulo: 'Todavía no hay recuentos',
          descripcion:
            'El primero suele ser la carga de stock inicial: contás lo que hay hoy y el sistema arranca desde ahí.',
          accion: (
            <Button leftSection={<IconPlus size={15} />} onClick={() => setCreando(true)}>
              Hacer el primero
            </Button>
          ),
        }}
      />

      {creando && (
        <ModalRecuento
          onClose={() => setCreando(false)}
          onCreado={(id) => navigate(`/admin/stock/recuentos/${id}`)}
        />
      )}
    </Pagina>
  );
}

type Valores = {
  fecha: string;
  ubicacionId: string | null;
  esStockInicial: boolean;
  notas: string;
};

function ModalRecuento({
  onClose,
  onCreado,
}: {
  onClose: () => void;
  onCreado: (id: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ubicaciones = useAsync(listarUbicaciones, []);

  const f = useFormulario<Valores>(
    { fecha: hoyISO(), ubicacionId: null, esStockInicial: false, notas: '' },
    (v) => ({
      ubicacionId: v.ubicacionId ? undefined : 'Un recuento es de una ubicación.',
      fecha: v.fecha ? undefined : 'Falta la fecha.',
    }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const id = await crearRecuento({
        fecha: f.valores.fecha,
        ubicacion_id: f.valores.ubicacionId!,
        es_stock_inicial: f.valores.esStockInicial,
        notas: f.valores.notas.trim() || null,
      });
      onCreado(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title="Nuevo recuento">
      <Stack gap="sm">
        <Select
          label="Ubicación"
          placeholder={ubicaciones.cargando ? 'Cargando…' : 'Cuál vas a contar'}
          withAsterisk
          data={(ubicaciones.datos ?? [])
            .filter((u) => u.activo)
            .map((u) => ({ value: u.id, label: u.nombre }))}
          value={f.valores.ubicacionId}
          onChange={(v) => f.set('ubicacionId', v)}
          description="Se cuenta una ubicación por vez: el teórico con el que se compara es el de esa ubicación."
          {...f.campo('ubicacionId')}
        />

        <TextInput
          type="date"
          label="Fecha"
          value={f.valores.fecha}
          onChange={(e) => f.set('fecha', e.currentTarget.value)}
          {...f.campo('fecha')}
        />

        <Switch
          label="Es la carga de stock inicial"
          description="Marcalo solo la primera vez. Las diferencias entran como stock inicial en vez de como ajuste."
          checked={f.valores.esStockInicial}
          onChange={(e) => f.set('esStockInicial', e.currentTarget.checked)}
        />

        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />

        {error && (
          <Alert color="error" variant="light" title="No se pudo crear">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            Crear y empezar a contar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
