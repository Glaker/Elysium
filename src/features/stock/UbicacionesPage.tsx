import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  guardarUbicacion,
  listarUbicaciones,
  type Ubicacion,
} from '@/features/stock/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

/** Dónde está el stock: Cajón, Vitrina, Muestras (§6). */
export function UbicacionesPage() {
  const ubicaciones = useAsync(listarUbicaciones, []);
  const [editando, setEditando] = useState<Ubicacion | null | undefined>(undefined);

  const columnas: Columna<Ubicacion>[] = [
    {
      clave: 'nombre',
      titulo: 'Ubicación',
      orden: (u) => u.nombre,
      render: (u) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={u.activo ? undefined : 'dimmed'}>
            {u.nombre}
          </Text>
          {u.esDefault && (
            <BadgeEstado ayuda="Es donde entra lo que se produce si no se elige otra al cerrar un lote.">
              Por defecto
            </BadgeEstado>
          )}
          {!u.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Ubicaciones"
      descripcion="Dónde se guarda el producto terminado. El stock se lleva por ubicación."
      volver={{ a: '/admin/stock', texto: 'Volver a stock' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
          Nueva ubicación
        </Button>
      }
    >
      {ubicaciones.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar">
          {ubicaciones.error}
        </Alert>
      )}

      <Tabla
        filas={ubicaciones.datos ?? null}
        idDe={(u) => u.id}
        columnas={columnas}
        cargando={ubicaciones.cargando}
        anchoMinimo={420}
        alto={420}
        onFila={(u) => setEditando(u)}
        vacio={{
          titulo: 'No hay ubicaciones',
          descripcion:
            'Sin al menos una, un lote cerrado no sabe dónde dejar lo producido.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar la primera
            </Button>
          ),
        }}
        acciones={(u) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Editar ${u.nombre}`}
            onClick={() => setEditando(u)}
          >
            <IconEdit size={16} />
          </ActionIcon>
        )}
      />

      {editando !== undefined && (
        <ModalUbicacion
          ubicacion={editando}
          onClose={() => setEditando(undefined)}
          onGuardado={() => {
            setEditando(undefined);
            ubicaciones.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

type Valores = { nombre: string; esDefault: boolean; activo: boolean };

function ModalUbicacion({
  ubicacion,
  onClose,
  onGuardado,
}: {
  ubicacion: Ubicacion | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    ubicacion
      ? {
          nombre: ubicacion.nombre,
          esDefault: ubicacion.esDefault,
          activo: ubicacion.activo,
        }
      : { nombre: '', esDefault: false, activo: true },
    (v) => ({ nombre: v.nombre.trim() ? undefined : 'La ubicación necesita un nombre.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarUbicacion(
        {
          nombre: f.valores.nombre.trim(),
          es_default: f.valores.esDefault,
          activo: f.valores.activo,
        },
        ubicacion?.id,
      );
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={ubicacion ? `Editar ${ubicacion.nombre}` : 'Nueva ubicación'}
      size="sm"
    >
      <Stack gap="sm">
        <TextInput
          label="Nombre"
          placeholder="Cajón, Vitrina, Muestras…"
          withAsterisk
          {...f.texto('nombre')}
        />

        <Switch
          label="Por defecto"
          description="Donde entra lo producido si al cerrar un lote no se elige otra. Solo puede haber una."
          checked={f.valores.esDefault}
          onChange={(e) => f.set('esDefault', e.currentTarget.checked)}
        />

        <Switch
          label="Activa"
          description="Una ubicación inactiva conserva su historial pero no se ofrece al mover stock."
          checked={f.valores.activo}
          onChange={(e) => f.set('activo', e.currentTarget.checked)}
        />

        {error && (
          <Alert color="error" variant="light" title="No se pudo guardar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={() => void guardar()}>
            {ubicacion ? 'Guardar cambios' : 'Crear ubicación'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
