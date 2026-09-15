import {
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  Group,
  Menu,
  Select,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { BadgeEstado, type Tono } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { listarPersonas } from '@/features/deudores/api';
import { ModalInvitacion } from '@/features/invitaciones/ModalInvitacion';
import {
  ETIQUETA_ROL,
  linkDe,
  listarInvitaciones,
  revocarInvitacion,
  type EstadoInvitacion,
  type Invitacion,
} from '@/features/invitaciones/api';
import { fecha as fmtFecha } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'abiertas' | 'todas';

const TONO: Record<EstadoInvitacion, Tono> = {
  pendiente: 'neutro',
  usada: 'neutro',
  vencida: 'advertencia',
};

const AYUDA: Record<EstadoInvitacion, string> = {
  pendiente: 'El link todavía sirve. Sirve una sola vez.',
  usada: 'Alguien ya creó su cuenta con este link. No se puede volver a usar.',
  vencida: 'Pasó la fecha de vencimiento. Hay que generar otra.',
};

/**
 * Las invitaciones abiertas y el rastro de las usadas.
 *
 * Es la única puerta de entrada a la app: §10 pide alta por link y no registro
 * abierto, así que sin esta pantalla sumar a alguien era un insert a mano.
 */
export function InvitacionesPage() {
  const [params, setParams] = useSearchParams();
  const invitaciones = useAsync(listarInvitaciones, []);
  const personas = useAsync(listarPersonas, []);
  const [filtro, setFiltro] = useState<Filtro>('abiertas');
  // `?persona=` lo pone el padrón al invitar desde la fila de alguien.
  const [creando, setCreando] = useState<string | null | undefined>(
    params.get('persona') ?? undefined,
  );
  const [error, setError] = useState<string | null>(null);

  const filas = useMemo(() => {
    const todas = invitaciones.datos ?? [];
    return filtro === 'todas' ? todas : todas.filter((i) => i.estado === 'pendiente');
  }, [invitaciones.datos, filtro]);

  function cerrarModal() {
    setCreando(undefined);
    if (params.has('persona')) {
      params.delete('persona');
      setParams(params, { replace: true });
    }
  }

  async function revocar(inv: Invitacion) {
    setError(null);
    try {
      await revocarInvitacion(inv.id);
      invitaciones.recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const columnas: Columna<Invitacion>[] = [
    {
      clave: 'para',
      titulo: 'Para quién',
      orden: (i) => i.persona ?? i.email ?? '',
      render: (i) =>
        i.persona ? (
          <Text size="sm" fw={500}>
            {i.persona}
          </Text>
        ) : i.email ? (
          <Text size="sm">{i.email}</Text>
        ) : (
          <Text size="sm" c="dimmed">
            sin asignar
          </Text>
        ),
    },
    {
      clave: 'rol',
      titulo: 'Rol',
      ancho: 150,
      orden: (i) => i.rol,
      render: (i) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_ROL[i.rol]}
        </Text>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 120,
      orden: (i) => i.estado,
      render: (i) => (
        <BadgeEstado tono={TONO[i.estado]} ayuda={AYUDA[i.estado]}>
          {i.estado === 'pendiente'
            ? 'Sin usar'
            : i.estado === 'usada'
              ? 'Usada'
              : 'Vencida'}
        </BadgeEstado>
      ),
    },
    {
      clave: 'creada',
      titulo: 'Creada',
      ancho: 110,
      orden: (i) => i.creadaEn,
      render: (i) => (
        <Text size="sm" c="dimmed" className="tabular">
          {fmtFecha(i.creadaEn)}
        </Text>
      ),
    },
    {
      clave: 'vence',
      titulo: 'Vence',
      ancho: 120,
      orden: (i) => i.expiraEn,
      render: (i) => (
        <Text size="sm" c="dimmed" className="tabular">
          {i.usadaEn ? `usada ${fmtFecha(i.usadaEn)}` : fmtFecha(i.expiraEn) || 'nunca'}
        </Text>
      ),
    },
  ];

  return (
    <Pagina
      titulo="Invitaciones"
      descripcion="La app no tiene registro abierto: se entra con un link que se genera acá y se manda por donde ya hablás con la persona."
      volver={{ a: '/admin/personas', texto: 'Volver a personas' }}
      acciones={
        <Button leftSection={<IconPlus size={15} />} onClick={() => setCreando(null)}>
          Nueva invitación
        </Button>
      }
    >
      {(invitaciones.error || error) && (
        <Alert color="error" variant="light" title="Algo no salió">
          {invitaciones.error ?? error}
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(i) => i.id}
        columnas={columnas}
        cargando={invitaciones.cargando}
        textoBusqueda={(i) => `${i.persona ?? ''} ${i.email ?? ''}`}
        placeholderBusqueda="Buscar por persona…  (/)"
        anchoMinimo={820}
        filtros={
          <Select
            w={190}
            aria-label="Qué invitaciones"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'abiertas') as Filtro)}
            allowDeselect={false}
            data={[
              { value: 'abiertas', label: 'Sin usar' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
        }
        vacio={{
          titulo:
            filtro === 'abiertas'
              ? 'No hay invitaciones sin usar'
              : 'Todavía no invitaste a nadie',
          descripcion:
            'Generá un link, mandáselo a la persona y con eso se crea la cuenta. No se manda ningún mail desde la app.',
          accion: (
            <Button leftSection={<IconPlus size={15} />} onClick={() => setCreando(null)}>
              Crear la primera
            </Button>
          ),
        }}
        acciones={(i) =>
          i.estado === 'usada' ? null : (
            <Group gap={2} wrap="nowrap" justify="flex-end">
              <CopyButton value={linkDe(i)}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copiado' : 'Copiar el link'}>
                    <ActionIcon
                      variant="subtle"
                      color={copied ? 'exito' : 'gray'}
                      aria-label="Copiar el link de la invitación"
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>

              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Más acciones de la invitación"
                  >
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    color="error"
                    leftSection={<IconTrash size={15} />}
                    onClick={() => void revocar(i)}
                  >
                    Revocar invitación
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )
        }
      />

      {creando !== undefined && (
        <ModalInvitacion
          personas={personas.datos ?? []}
          personaId={creando}
          onClose={cerrarModal}
          onCreada={() => {
            invitaciones.recargar();
            personas.recargar();
          }}
        />
      )}
    </Pagina>
  );
}
