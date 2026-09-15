import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconEdit, IconShieldCog } from '@tabler/icons-react';
import { useState } from 'react';

import type { Rol } from '@/app/authContext';
import { useAuth } from '@/app/useAuth';
import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  actualizarPersona,
  cambiarRol,
  listarPersonas,
  type Persona,
} from '@/features/deudores/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

const ETIQUETA_ROL: Record<Rol, string> = { admin: 'Admin', usuario: 'Usuario' };

/**
 * El padrón: clientes, revendedoras, productoras.
 *
 * **Acá no se da de alta a nadie.** Una persona entra al padrón registrándose:
 * el alta es abierta y la ficha la crea la base junto con la cuenta. Lo que se
 * hace en esta pantalla es lo que la base no puede saber sola — quién revende,
 * quién fabrica, quién es admin— y corregir los datos que cargó la persona.
 *
 * El control no está entonces en la puerta sino acá, con la persona a la vista
 * y después de saber quién es.
 */
export function PersonasPage() {
  const { perfil } = useAuth();
  const personas = useAsync(listarPersonas, []);
  const [editando, setEditando] = useState<Persona | null>(null);
  const [rolDe, setRolDe] = useState<Persona | null>(null);

  const columnas: Columna<Persona>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      orden: (p) => p.nombreCompleto,
      render: (p) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={p.activo ? undefined : 'dimmed'}>
            {p.nombreCompleto}
          </Text>
          {p.rol === 'admin' && (
            <BadgeEstado ayuda="Su cuenta ve y edita toda la administración.">
              Admin
            </BadgeEstado>
          )}
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
      clave: 'telefono',
      titulo: 'Teléfono',
      ancho: 180,
      orden: (p) => p.telefono,
      render: (p) => (
        <Text size="sm" c="dimmed" className="tabular">
          {p.telefono ?? ''}
        </Text>
      ),
    },
    {
      clave: 'cuenta',
      titulo: 'Cuenta',
      ancho: 160,
      orden: (p) => (p.rol ? 1 : 0),
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.rol ? ETIQUETA_ROL[p.rol] : 'sin cuenta'}
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
      descripcion="Entran solas al registrarse. Acá se les da el rol: revendedora, productora o admin — los dos primeros se acumulan."
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
        textoBusqueda={(p) => `${p.nombreCompleto} ${p.telefono ?? ''} ${p.notas ?? ''}`}
        placeholderBusqueda="Buscar persona…  (/)"
        anchoMinimo={760}
        onFila={(p) => setEditando(p)}
        vacio={{
          titulo: 'Todavía no se registró nadie',
          descripcion:
            'El padrón se llena solo: cada persona que se crea la cuenta aparece acá, con su nombre y su teléfono. Pasales la dirección de la app.',
        }}
        acciones={(p) => (
          <Group gap={2} wrap="nowrap" justify="flex-end">
            {/* El rol solo existe si hay cuenta: sin cuenta no hay nada que
                permitir ni que prohibir. */}
            {p.rol && (
              <Tooltip label="Cambiar el rol de su cuenta">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Cambiar el rol de ${p.nombreCompleto}`}
                  onClick={() => setRolDe(p)}
                >
                  <IconShieldCog size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Editar ${p.nombreCompleto}`}
              onClick={() => setEditando(p)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Group>
        )}
      />

      {rolDe && (
        <ModalRol
          persona={rolDe}
          esUnoMismo={rolDe.perfilId != null && rolDe.perfilId === perfil?.id}
          onClose={() => setRolDe(null)}
          onGuardado={() => {
            setRolDe(null);
            personas.recargar();
          }}
        />
      )}

      {editando && (
        <ModalPersona
          persona={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            personas.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

type Valores = {
  nombre: string;
  apellido: string;
  telefono: string;
  notas: string;
  esRevendedor: boolean;
  esProductor: boolean;
  activo: boolean;
};

/**
 * Editar una persona que ya existe. No hay alta: al padrón se entra
 * registrándose, y la ficha nace con la cuenta.
 */
function ModalPersona({
  persona,
  onClose,
  onGuardado,
}: {
  persona: Persona;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    {
      nombre: persona.nombre,
      apellido: persona.apellido ?? '',
      telefono: persona.telefono ?? '',
      notas: persona.notas ?? '',
      esRevendedor: persona.esRevendedor,
      esProductor: persona.esProductor,
      activo: persona.activo,
    },
    (v) => ({ nombre: v.nombre.trim() ? undefined : 'La persona necesita un nombre.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarPersona(persona.id, {
        nombre: f.valores.nombre.trim(),
        apellido: f.valores.apellido.trim() || null,
        telefono: f.valores.telefono.trim() || null,
        notas: f.valores.notas.trim() || null,
        es_revendedor: f.valores.esRevendedor,
        es_productor: f.valores.esProductor,
        activo: f.valores.activo,
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Editar ${persona.nombreCompleto}`}>
      <Stack gap="sm">
        <Group gap="sm" grow align="flex-start">
          <TextInput label="Nombre" withAsterisk {...f.texto('nombre')} />
          <TextInput label="Apellido" {...f.texto('apellido')} />
        </Group>
        <TextInput
          label="Teléfono"
          placeholder="11 5555 5555"
          description="El que cargó al registrarse. Corregilo si está mal escrito."
          {...f.texto('telefono')}
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

        {persona.rol && (
          <Text size="xs" c="dimmed">
            Su cuenta es {ETIQUETA_ROL[persona.rol].toLowerCase()}. El rol se cambia desde
            la lista.
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
            Guardar cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Cambiar el rol de la cuenta de una persona.
 *
 * Un modal y no un switch en la fila: es el único cambio de esta pantalla que
 * no es un dato de la ficha sino un permiso, y darse cuenta después de haberlo
 * tocado sin querer es caro. La base igual rechaza dejar la app sin ningún
 * admin; acá el aviso existe para que no haya que enterarse por un error.
 */
function ModalRol({
  persona,
  esUnoMismo,
  onClose,
  onGuardado,
}: {
  persona: Persona;
  esUnoMismo: boolean;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [rol, setRol] = useState<Rol>(persona.rol ?? 'usuario');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await cambiarRol(persona.id, rol);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Rol de ${persona.nombreCompleto}`}>
      <Stack gap="sm">
        <Select
          label="Rol de la cuenta"
          data={[
            {
              value: 'usuario',
              label: 'Usuario — ve su catálogo, su deuda y sus pedidos',
            },
            { value: 'admin', label: 'Admin — ve y edita toda la administración' },
          ]}
          value={rol}
          onChange={(v) => setRol((v as Rol | null) ?? 'usuario')}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />

        <Text size="xs" c="dimmed">
          Revendedora y productora no son esto: son atributos de la persona, se editan en
          su ficha y valen aunque nunca se registre.
        </Text>

        {esUnoMismo && rol !== 'admin' && (
          <Alert color="advertencia" variant="light" title="Es tu propia cuenta">
            Si te sacás el rol de admin, esta pantalla deja de existir para vos.
          </Alert>
        )}

        {error && (
          <Alert color="error" variant="light" title="No se pudo cambiar">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={guardando}
            disabled={rol === persona.rol}
            onClick={() => void guardar()}
          >
            Cambiar rol
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
