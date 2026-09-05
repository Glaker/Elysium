import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Switch,
} from '@mantine/core';
import { IconEdit, IconExternalLink, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  guardarProveedor,
  listarProveedores,
  usoDeProveedores,
  type Proveedor,
} from '@/features/insumos/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  nombre: string;
  link: string;
  contacto: string;
  notas: string;
  activo: boolean;
};

const VACIO: Valores = { nombre: '', link: '', contacto: '', notas: '', activo: true };

export function ProveedoresPage() {
  const proveedores = useAsync(listarProveedores, []);
  const uso = useAsync(usoDeProveedores, [proveedores.datos]);
  // `undefined` = modal cerrado, `null` = alta, un proveedor = edición.
  const [editando, setEditando] = useState<Proveedor | null | undefined>(undefined);

  const columnas: Columna<Proveedor>[] = [
    {
      clave: 'nombre',
      titulo: 'Proveedor',
      orden: (p) => p.nombre,
      render: (p) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={p.activo ? undefined : 'dimmed'}>
            {p.nombre}
          </Text>
          {!p.activo && <BadgeEstado>Inactivo</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'link',
      titulo: 'Link',
      orden: (p) => p.link,
      render: (p) =>
        p.link ? (
          <Anchor
            href={p.link}
            target="_blank"
            rel="noreferrer noopener"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Group gap={4} wrap="nowrap">
              <Text size="sm" truncate maw={340}>
                {p.link}
              </Text>
              <IconExternalLink size={12} />
            </Group>
          </Anchor>
        ) : (
          <DatoIncompleto titulo="Sin link. §5 lo pide como requisito, no como extra." />
        ),
    },
    {
      clave: 'contacto',
      titulo: 'Contacto',
      ancho: 200,
      orden: (p) => p.contacto,
      render: (p) => (
        <Text size="sm" c="dimmed">
          {p.contacto ?? ''}
        </Text>
      ),
    },
    {
      clave: 'insumos',
      titulo: 'Insumos',
      numerica: true,
      ancho: 100,
      orden: (p) => uso.datos?.get(p.id) ?? 0,
      render: (p) => <Numero valor={uso.datos?.get(p.id) ?? 0} />,
    },
  ];

  return (
    <Pagina
      titulo="Proveedores"
      descripcion="A quién se le compra cada insumo, y dónde se chequea el precio."
      volver={{ a: '/admin/insumos', texto: 'Volver a insumos' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
          Nuevo proveedor
        </Button>
      }
    >
      {proveedores.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar">
          {proveedores.error}
        </Alert>
      )}

      <Tabla
        filas={proveedores.datos ?? null}
        idDe={(p) => p.id}
        columnas={columnas}
        cargando={proveedores.cargando}
        textoBusqueda={(p) => `${p.nombre} ${p.contacto ?? ''} ${p.link ?? ''}`}
        placeholderBusqueda="Buscar proveedor…  (/)"
        anchoMinimo={620}
        onFila={(p) => setEditando(p)}
        vacio={{
          titulo: 'Todavía no hay proveedores',
          descripcion: 'Cargá uno para poder asociarle insumos y guardar su link.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar el primero
            </Button>
          ),
        }}
        acciones={(p) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Editar ${p.nombre}`}
            onClick={() => setEditando(p)}
          >
            <IconEdit size={16} />
          </ActionIcon>
        )}
      />

      {editando !== undefined && (
        <ModalProveedor
          proveedor={editando}
          onClose={() => setEditando(undefined)}
          onGuardado={() => {
            setEditando(undefined);
            proveedores.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

/**
 * Alta y edición de proveedor. Se monta al abrirse, así que el estado inicial
 * sale de las props y no hace falta sincronizarlo con un efecto.
 */
function ModalProveedor({
  proveedor,
  onClose,
  onGuardado,
}: {
  proveedor: Proveedor | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    proveedor
      ? {
          nombre: proveedor.nombre,
          link: proveedor.link ?? '',
          contacto: proveedor.contacto ?? '',
          notas: proveedor.notas ?? '',
          activo: proveedor.activo,
        }
      : VACIO,
    (v) => ({
      nombre: v.nombre.trim() ? undefined : 'El proveedor necesita un nombre.',
      // §5 pone el link como requisito explícito, no como un extra.
      link: v.link.trim().startsWith('http')
        ? undefined
        : 'El link del proveedor es obligatorio. Pegá la URL completa.',
    }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarProveedor(
        {
          nombre: f.valores.nombre.trim(),
          link: f.valores.link.trim(),
          contacto: f.valores.contacto.trim() || null,
          notas: f.valores.notas.trim() || null,
          activo: f.valores.activo,
        },
        proveedor?.id,
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
      title={proveedor ? `Editar ${proveedor.nombre}` : 'Nuevo proveedor'}
    >
      <Stack gap="sm">
        <TextInput label="Nombre" withAsterisk {...f.texto('nombre')} />
        <TextInput
          label="Link"
          description="La página donde se chequea el precio. Es requisito."
          placeholder="https://…"
          withAsterisk
          {...f.texto('link')}
        />
        <TextInput
          label="Contacto"
          placeholder="Teléfono, mail, nombre de la persona…"
          {...f.texto('contacto')}
        />
        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />
        <Switch
          label="Activo"
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
            {proveedor ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
