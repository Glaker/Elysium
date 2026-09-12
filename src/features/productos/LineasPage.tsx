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
import { Numero } from '@/components/ui/Numero';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import {
  guardarLinea,
  listarLineas,
  usoDeLineas,
  type LineaNegocio,
} from '@/features/productos/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

/**
 * Las líneas de negocio: bálsamos, repelentes, cosmética, aceites (§8). Es el
 * eje por el que se agrupa el catálogo y por el que se van a mirar las ventas.
 */
export function LineasPage() {
  const lineas = useAsync(listarLineas, []);
  const uso = useAsync(usoDeLineas, [lineas.datos]);
  // `undefined` = modal cerrado, `null` = alta, una línea = edición.
  const [editando, setEditando] = useState<LineaNegocio | null | undefined>(undefined);

  const columnas: Columna<LineaNegocio>[] = [
    {
      clave: 'nombre',
      titulo: 'Línea',
      orden: (l) => l.nombre,
      render: (l) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={l.activo ? undefined : 'dimmed'}>
            {l.nombre}
          </Text>
          {!l.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'productos',
      titulo: 'Productos',
      numerica: true,
      ancho: 120,
      orden: (l) => uso.datos?.get(l.id) ?? 0,
      render: (l) => <Numero valor={uso.datos?.get(l.id) ?? 0} />,
    },
  ];

  return (
    <Pagina
      titulo="Líneas de negocio"
      descripcion="Cómo se agrupa el catálogo: bálsamos, repelentes, cosmética, aceites."
      volver={{ a: '/admin/productos', texto: 'Volver a productos' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
          Nueva línea
        </Button>
      }
    >
      {lineas.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar">
          {lineas.error}
        </Alert>
      )}

      <Tabla
        filas={lineas.datos ?? null}
        idDe={(l) => l.id}
        columnas={columnas}
        cargando={lineas.cargando}
        textoBusqueda={(l) => l.nombre}
        placeholderBusqueda="Buscar línea…  (/)"
        anchoMinimo={420}
        alto={420}
        onFila={(l) => setEditando(l)}
        vacio={{
          titulo: 'Todavía no hay líneas de negocio',
          descripcion:
            'Un producto puede vivir sin línea, pero agruparlos es lo que hace legible el catálogo.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar la primera
            </Button>
          ),
        }}
        acciones={(l) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Editar ${l.nombre}`}
            onClick={() => setEditando(l)}
          >
            <IconEdit size={16} />
          </ActionIcon>
        )}
      />

      {editando !== undefined && (
        <ModalLinea
          linea={editando}
          enUso={editando ? (uso.datos?.get(editando.id) ?? 0) : 0}
          onClose={() => setEditando(undefined)}
          onGuardado={() => {
            setEditando(undefined);
            lineas.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

type Valores = { nombre: string; activo: boolean };

function ModalLinea({
  linea,
  enUso,
  onClose,
  onGuardado,
}: {
  linea: LineaNegocio | null;
  enUso: number;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    linea ? { nombre: linea.nombre, activo: linea.activo } : { nombre: '', activo: true },
    (v) => ({ nombre: v.nombre.trim() ? undefined : 'La línea necesita un nombre.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarLinea(
        { nombre: f.valores.nombre.trim(), activo: f.valores.activo },
        linea?.id,
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
      title={linea ? `Editar ${linea.nombre}` : 'Nueva línea de negocio'}
      size="sm"
    >
      <Stack gap="sm">
        <TextInput
          label="Nombre"
          placeholder="Bálsamos, Repelentes…"
          withAsterisk
          {...f.texto('nombre')}
        />
        <Switch
          label="Activa"
          description={
            enUso > 0
              ? `La usan ${enUso} ${enUso === 1 ? 'producto' : 'productos'}: desactivarla no los toca, solo deja de ofrecerse.`
              : 'Una línea inactiva no se ofrece al cargar un producto.'
          }
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
            {linea ? 'Guardar cambios' : 'Crear línea'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
