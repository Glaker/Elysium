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
import { DatoIncompleto } from '@/components/ui/DatoIncompleto';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { guardarCuenta, listarCuentas, type Cuenta } from '@/features/ventas/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

/**
 * Las cuentas a las que entra la plata (§8). Hoy son alias de transferencia
 * anotados sueltos en el Excel; acá son entidades, y cada venta y cada pago
 * puede decir por cuál entró.
 */
export function CuentasPage() {
  const cuentas = useAsync(listarCuentas, []);
  const [editando, setEditando] = useState<Cuenta | null | undefined>(undefined);

  const columnas: Columna<Cuenta>[] = [
    {
      clave: 'nombre',
      titulo: 'Cuenta',
      orden: (c) => c.nombre,
      render: (c) => (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} c={c.activo ? undefined : 'dimmed'}>
            {c.nombre}
          </Text>
          {!c.activo && <BadgeEstado>Inactiva</BadgeEstado>}
        </Group>
      ),
    },
    {
      clave: 'alias',
      titulo: 'Alias de transferencia',
      orden: (c) => c.alias,
      render: (c) =>
        c.alias ? (
          <Text size="sm" c="dimmed" className="tabular">
            {c.alias}
          </Text>
        ) : (
          <DatoIncompleto titulo="Sin alias cargado" />
        ),
    },
  ];

  return (
    <Pagina
      titulo="Cuentas"
      descripcion="A dónde entra la plata de cada venta y cada pago."
      volver={{ a: '/admin/ventas', texto: 'Volver a ventas' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setEditando(null)}>
          Nueva cuenta
        </Button>
      }
    >
      {cuentas.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar">
          {cuentas.error}
        </Alert>
      )}

      <Tabla
        filas={cuentas.datos ?? null}
        idDe={(c) => c.id}
        columnas={columnas}
        cargando={cuentas.cargando}
        textoBusqueda={(c) => `${c.nombre} ${c.alias ?? ''}`}
        placeholderBusqueda="Buscar cuenta…  (/)"
        anchoMinimo={520}
        alto={420}
        onFila={(c) => setEditando(c)}
        vacio={{
          titulo: 'Todavía no hay cuentas',
          descripcion:
            'Cargá las que usás para cobrar: sirven para saber por dónde entró cada peso.',
          accion: (
            <Button
              leftSection={<IconPlus size={15} />}
              onClick={() => setEditando(null)}
            >
              Cargar la primera
            </Button>
          ),
        }}
        acciones={(c) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Editar ${c.nombre}`}
            onClick={() => setEditando(c)}
          >
            <IconEdit size={16} />
          </ActionIcon>
        )}
      />

      {editando !== undefined && (
        <ModalCuenta
          cuenta={editando}
          onClose={() => setEditando(undefined)}
          onGuardado={() => {
            setEditando(undefined);
            cuentas.recargar();
          }}
        />
      )}
    </Pagina>
  );
}

type Valores = { nombre: string; alias: string; activo: boolean };

function ModalCuenta({
  cuenta,
  onClose,
  onGuardado,
}: {
  cuenta: Cuenta | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    cuenta
      ? { nombre: cuenta.nombre, alias: cuenta.alias ?? '', activo: cuenta.activo }
      : { nombre: '', alias: '', activo: true },
    (v) => ({ nombre: v.nombre.trim() ? undefined : 'La cuenta necesita un nombre.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarCuenta(
        {
          nombre: f.valores.nombre.trim(),
          alias_transferencia: f.valores.alias.trim() || null,
          activo: f.valores.activo,
        },
        cuenta?.id,
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
      title={cuenta ? `Editar ${cuenta.nombre}` : 'Nueva cuenta'}
      size="sm"
    >
      <Stack gap="sm">
        <TextInput
          label="Nombre"
          placeholder="Cuenta de Johanna, caja…"
          withAsterisk
          {...f.texto('nombre')}
        />
        <TextInput
          label="Alias de transferencia"
          placeholder="autino.jo"
          {...f.texto('alias')}
        />
        <Switch
          label="Activa"
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
            {cuenta ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
