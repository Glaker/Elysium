import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Tooltip,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconEdit, IconPlus, IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { guardarPersona, listarPersonas, type Persona } from '@/features/deudores/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

/**
 * El padrón: clientes, revendedoras, productoras. Una persona existe acá tenga
 * o no cuenta en la app — una deuda no espera a que alguien se registre.
 */
export function PersonasPage() {
  const navigate = useNavigate();
  const personas = useAsync(listarPersonas, []);
  const [editando, setEditando] = useState<Persona | null | undefined>(undefined);

  const columnas: Columna<Persona>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      orden: (p) => p.nombre,
      render: (p) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={p.activo ? undefined : 'dimmed'}>
            {p.nombre}
          </Text>
          {p.esRevendedor && (
            <BadgeEstado ayuda="Se lleva mercadería para revender y paga el costo.">
              Revendedora
            </BadgeEstado>
          )}
          {p.esProductor && (
            <BadgeEstado ayuda="Fabrica lotes. Puede registrar el resultado de los suyos sin ver costos.">
              Productora
            </BadgeEstado>
          )}
          {!p.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'contacto',
      titulo: 'Contacto',
      ancho: 220,
      orden: (p) => p.contacto,
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.contacto ?? ''}
        </Text>
      ),
    },
    {
      clave: 'cuenta',
      titulo: 'Cuenta en la app',
      ancho: 160,
      orden: (p) => (p.tieneCuenta ? 1 : 0),
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.tieneCuenta ? 'sí' : 'no'}
        </Text>
      ),
    },
    {
      clave: 'notas',
      titulo: 'Notas',
      render: (p) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {p.notas ?? ''}
        </Text>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Personas"
      descripcion="Clientes, revendedoras y productoras. Los dos roles se acumulan: el mismo estudiante puede hacer las dos cosas."
      acciones={
        <>
          <Button
            variant="default"
            component={Link}
            to="/admin/personas/invitaciones"
            leftSection={<IconSend size={15} />}
          >
            Invitaciones
          </Button>
          <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
            Nueva persona
          </Button>
        </>
      }
    >
      {personas.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar">
          {personas.error}
        </Alert>
      )}

      <Tabla
        filas={personas.datos ?? null}
        idDe={(p) => p.id}
        columnas={columnas}
        cargando={personas.cargando}
        textoBusqueda={(p) => `${p.nombre} ${p.contacto ?? ''} ${p.notas ?? ''}`}
        placeholderBusqueda="Buscar persona…  (/)"
        anchoMinimo={760}
        onFila={(p) => setEditando(p)}
        vacio={{
          titulo: 'Todavía no hay personas',
          descripcion:
            'Cargá a quienes te compran, revenden o fabrican. No necesitan tener cuenta en la app.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar la primera
            </Button>
          ),
        }}
        acciones={(p) => (
          <Group gap={2} wrap="nowrap" justify="flex-end">
            {/* Invitar es lo único que le falta a una persona sin cuenta, y es
                el punto donde se nota que falta: acá está el padrón. */}
            {!p.tieneCuenta && p.activo && (
              <Tooltip label="Invitar a la app">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Invitar a ${p.nombre} a la app`}
                  onClick={() => navigate(`/admin/personas/invitaciones?persona=${p.id}`)}
                >
                  <IconSend size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Editar ${p.nombre}`}
              onClick={() => setEditando(p)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Group>
        )}
      />

      {editando !== undefined && (
        <ModalPersona
          persona={editando}
          onClose={() => setEditando(undefined)}
          onGuardado={() => {
            setEditando(undefined);
            personas.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

type Valores = {
  nombre: string;
  contacto: string;
  notas: string;
  esRevendedor: boolean;
  esProductor: boolean;
  activo: boolean;
};

function ModalPersona({
  persona,
  onClose,
  onGuardado,
}: {
  persona: Persona | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    persona
      ? {
          nombre: persona.nombre,
          contacto: persona.contacto ?? '',
          notas: persona.notas ?? '',
          esRevendedor: persona.esRevendedor,
          esProductor: persona.esProductor,
          activo: persona.activo,
        }
      : {
          nombre: '',
          contacto: '',
          notas: '',
          esRevendedor: false,
          esProductor: false,
          activo: true,
        },
    (v) => ({ nombre: v.nombre.trim() ? undefined : 'La persona necesita un nombre.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarPersona(
        {
          nombre: f.valores.nombre.trim(),
          contacto: f.valores.contacto.trim() || null,
          notas: f.valores.notas.trim() || null,
          es_revendedor: f.valores.esRevendedor,
          es_productor: f.valores.esProductor,
          activo: f.valores.activo,
        },
        persona?.id,
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
      title={persona ? `Editar ${persona.nombre}` : 'Nueva persona'}
    >
      <Stack gap="sm">
        <TextInput label="Nombre" withAsterisk {...f.texto('nombre')} />
        <TextInput
          label="Contacto"
          placeholder="Teléfono, mail, Instagram…"
          {...f.texto('contacto')}
        />

        <Switch
          label="Revendedora"
          description="Se lleva mercadería para revender. En una entrega para reventa paga el costo, no el precio de lista."
          checked={f.valores.esRevendedor}
          onChange={(e) => f.set('esRevendedor', e.currentTarget.checked)}
        />

        <Switch
          label="Productora"
          description="Fabrica lotes. Puede ser responsable de un lote y registrar su resultado sin ver los costos."
          checked={f.valores.esProductor}
          onChange={(e) => f.set('esProductor', e.currentTarget.checked)}
        />

        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />

        <Switch
          label="Activa"
          description="Una persona inactiva conserva su historial y su deuda, pero no se ofrece al cargar."
          checked={f.valores.activo}
          onChange={(e) => f.set('activo', e.currentTarget.checked)}
        />

        {persona?.tieneCuenta && (
          <Text size="xs" c="dimmed">
            Esta persona tiene cuenta en la app. El vínculo se arma con una invitación y
            no se edita desde acá.
          </Text>
        )}

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
            {persona ? 'Guardar cambios' : 'Crear persona'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
