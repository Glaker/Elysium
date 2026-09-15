import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Radio,
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
  cambiarPermisos,
  cambiarRol,
  listarPersonas,
  type Persona,
} from '@/features/deudores/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

const ETIQUETA_NIVEL: Record<Nivel, string> = {
  usuario: 'Usuario',
  productora: 'Productora',
  admin: 'Admin',
};

/**
 * El padrón: clientes, revendedoras, productoras.
 *
 * **Acá no se da de alta a nadie.** Una persona entra al padrón registrándose:
 * el alta es abierta y la ficha la crea la base junto con la cuenta. Lo que se
 * hace en esta pantalla es lo que la base no puede saber sola —quién revende,
 * quién fabrica, quién es admin— y corregir los datos que cargó la persona.
 *
 * Las dos cosas están separadas a propósito: el escudo abre los permisos
 * —productora, admin— y el lápiz la ficha, donde vive `es_revendedor`, que no
 * habilita nada y solo define qué precio ve. Nadie habilita el pedido de materia
 * prima mientras arregla un teléfono.
 *
 * El control no está entonces en la puerta sino acá, con la persona a la vista
 * y después de saber quién es.
 */
export function PersonasPage() {
  const { perfil } = useAuth();
  const personas = useAsync(listarPersonas, []);
  const [editando, setEditando] = useState<Persona | null>(null);
  const [permisosDe, setPermisosDe] = useState<Persona | null>(null);

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
          {/* Revendedora es lo único que se marca acá: no es un nivel, es la
              tarifa, y por eso convive con cualquiera de los tres. */}
          {p.esRevendedor && (
            <BadgeEstado ayuda="Se lleva mercadería para revender y paga el costo.">
              Revendedora
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
      clave: 'nivel',
      titulo: 'Puede',
      ancho: 160,
      // El mismo orden que la lista del modal: de lo que menos abre a lo que
      // más. Ordenar por el texto pondría admin antes que usuario.
      orden: (p) => NIVELES.findIndex((n) => n.valor === nivelDe(p)),
      render: (p) => (
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c={p.rol === 'admin' ? undefined : 'dimmed'}>
            {ETIQUETA_NIVEL[nivelDe(p)]}
          </Text>
          {!p.rol && (
            <Text size="xs" c="dimmed">
              · sin cuenta
            </Text>
          )}
        </Group>
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
      descripcion="Entran solas al registrarse. Con el escudo se les da lo que pueden hacer: productora, admin o las dos."
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
            {/* Siempre, tenga cuenta o no: el rol necesita cuenta, pero
                productora vale igual sin ella. */}
            <Tooltip label="Qué puede hacer">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Permisos de ${p.nombreCompleto}`}
                onClick={() => setPermisosDe(p)}
              >
                <IconShieldCog size={16} />
              </ActionIcon>
            </Tooltip>
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

      {permisosDe && (
        <ModalPermisos
          persona={permisosDe}
          esUnoMismo={permisosDe.perfilId != null && permisosDe.perfilId === perfil?.id}
          onClose={() => setPermisosDe(null)}
          onGuardado={() => {
            setPermisosDe(null);
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
  activo: boolean;
};

/**
 * Editar una persona que ya existe. No hay alta: al padrón se entra
 * registrándose, y la ficha nace con la cuenta.
 *
 * Datos y condición comercial. Lo que la persona puede *hacer* —productora,
 * admin— se cambia en `ModalPermisos`, aparte: que habilitar el pedido de
 * materia prima estuviera a un switch de distancia de corregir un teléfono era
 * la forma más fácil de dárselo a alguien sin querer.
 *
 * Revendedora sí vive acá, y no es una excepción: no habilita nada, define qué
 * precio ve —`precio_para_persona()` le muestra el costo— y de qué tipo nace la
 * venta. Es una tarifa, no un permiso.
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
          description="Se lleva mercadería para revender: su catálogo muestra el costo en vez del precio de lista, y sus entregas nacen como venta para reventa."
          checked={f.valores.esRevendedor}
          onChange={(e) => f.set('esRevendedor', e.currentTarget.checked)}
        />

        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />

        <Switch
          label="Activa"
          description="Una persona inactiva conserva su historial y su deuda, pero no se ofrece al cargar."
          checked={f.valores.activo}
          onChange={(e) => f.set('activo', e.currentTarget.checked)}
        />

        <Text size="xs" c="dimmed">
          Los permisos no están acá: productora y admin se cambian con el escudo de la
          lista.
        </Text>

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
 * Qué puede hacer una persona: **una sola lista de tres opciones**.
 *
 * Antes eran dos controles —un switch de productora y un select de rol— y eso
 * obligaba a leer dos cosas para saber una: "productora sí + rol usuario" no se
 * parece en nada a "productora no + rol admin" hasta que uno reconstruye qué
 * significa cada combinación. Son tres niveles y se eligen como tres niveles.
 *
 * Se puede porque **el nivel es acumulativo**: usuario ⊂ productora ⊂ admin. Un
 * admin ya ve la fórmula y pide materia prima (`calcular_insumos` y
 * `es_productora()` lo dejan pasar por `es_admin()`), así que "admin y además
 * productora" no habilita nada que "admin" no habilite. Abajo siguen siendo dos
 * columnas en dos tablas —`personas.es_productor` y `perfiles.rol`—; cada opción
 * escribe las dos, y esta función es el único lugar que sabe cómo se traducen.
 *
 * La base igual rechaza dejar la app sin ningún admin; acá el aviso existe para
 * que no haya que enterarse por un error.
 */
type Nivel = 'usuario' | 'productora' | 'admin';

const NIVELES: { valor: Nivel; titulo: string; pie: string }[] = [
  {
    valor: 'usuario',
    titulo: 'Usuario',
    pie: 'Ve su catálogo con su precio, su deuda y sus pedidos. Nada más.',
  },
  {
    valor: 'productora',
    titulo: 'Productora',
    pie: 'Además fabrica lotes: pide materia prima, ve las cantidades de la fórmula y carga el resultado de los suyos, sin ver costos.',
  },
  {
    valor: 'admin',
    titulo: 'Admin',
    pie: 'Ve y edita toda la administración: costos, precios, stock, ventas y esta pantalla.',
  },
];

/** El nivel que se lee de la persona. Es el inverso de `aplicar`. */
function nivelDe(persona: Persona): Nivel {
  if (persona.rol === 'admin') return 'admin';
  return persona.esProductor ? 'productora' : 'usuario';
}

function ModalPermisos({
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
  const actual = nivelDe(persona);
  const [nivel, setNivel] = useState<Nivel>(actual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin cuenta no hay rol que dar: la persona existe en el padrón pero no tiene
  // con qué entrar. Productora sí vale igual —puede ser responsable de un lote
  // sin haberse registrado nunca— y por eso el nivel no se bloquea entero.
  const sinCuenta = persona.rol == null;

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      // El marcador primero y el rol después: el rol es el que puede fallar en
      // la base (último admin), y si falla conviene que lo otro ya esté escrito.
      const esProductor = nivel === 'productora';
      if (esProductor !== persona.esProductor) {
        await cambiarPermisos(persona.id, esProductor);
      }
      const rol: Rol = nivel === 'admin' ? 'admin' : 'usuario';
      if (!sinCuenta && rol !== persona.rol) await cambiarRol(persona.id, rol);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Qué puede hacer ${persona.nombreCompleto}`}>
      <Stack gap="md">
        <Radio.Group value={nivel} onChange={(v) => setNivel(v as Nivel)}>
          <Stack gap={6}>
            {NIVELES.map((n) => (
              <Radio.Card
                key={n.valor}
                value={n.valor}
                p="sm"
                radius="md"
                disabled={sinCuenta && n.valor === 'admin'}
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  <Radio.Indicator mt={2} />
                  <div>
                    <Text size="sm" fw={500}>
                      {n.titulo}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {n.valor === 'admin' && sinCuenta
                        ? 'Todavía no se registró: hasta que tenga cuenta no hay rol que darle.'
                        : n.pie}
                    </Text>
                  </div>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>

        {esUnoMismo && nivel !== 'admin' && (
          <Alert color="advertencia" variant="light" title="Es tu propia cuenta">
            Si te sacás el rol de admin, esta pantalla deja de existir para vos.
          </Alert>
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
          <Button
            loading={guardando}
            disabled={nivel === actual}
            onClick={() => void guardar()}
          >
            Guardar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
