import {
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';

import {
  crearInvitacion,
  ETIQUETA_ROL,
  linkDe,
  type Invitacion,
  type Rol,
} from '@/features/invitaciones/api';
import type { Persona } from '@/features/deudores/api';

/** Sin vencimiento es una opción real: un link que se manda y se usa cuando se puede. */
const VENCIMIENTOS = [
  { value: '7', label: 'A los 7 días' },
  { value: '14', label: 'A los 14 días' },
  { value: '30', label: 'A los 30 días' },
  { value: '0', label: 'Sin vencimiento' },
];

type Props = {
  personas: Persona[];
  /** Persona preseleccionada cuando se invita desde su fila del padrón. */
  personaId?: string | null;
  onClose: () => void;
  onCreada: () => void;
};

/**
 * Crear la invitación y, en el mismo modal, entregar el link.
 *
 * Las dos cosas van juntas a propósito: no hay mail de por medio, el link se
 * manda por WhatsApp como todo lo demás, así que el momento de copiarlo es el
 * momento de crearlo. Cerrar sin copiar no pierde nada —la tabla lo vuelve a
 * dar— pero copiar acá ahorra el viaje.
 */
export function ModalInvitacion({ personas, personaId, onClose, onCreada }: Props) {
  const [persona, setPersona] = useState<string | null>(personaId ?? null);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<Rol>('usuario');
  const [dias, setDias] = useState('14');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<Invitacion | null>(null);

  // Invitar a alguien que ya entró no tiene sentido: la función lo rechaza y
  // acá directamente no se ofrece.
  const opciones = personas
    .filter((p) => p.activo && !p.tieneCuenta)
    .map((p) => ({ value: p.id, label: p.nombre }));

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      const inv = await crearInvitacion({
        rol,
        personaId: persona,
        email: email.trim() || null,
        dias: Number(dias),
      });
      setCreada(inv);
      onCreada();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreando(false);
    }
  }

  if (creada) {
    const link = linkDe(creada);
    return (
      <Modal opened onClose={onClose} title="Invitación lista" size="lg">
        <Stack gap="sm">
          <Text size="sm">
            Mandale este link a{' '}
            {personas.find((p) => p.id === creada.personaId)?.nombre ??
              creada.email ??
              'quien va a usar la cuenta'}
            . Con él se crea la cuenta y queda activada como{' '}
            {ETIQUETA_ROL[creada.rol].toLowerCase()}.
          </Text>

          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {link}
          </Code>

          <Text size="xs" c="dimmed">
            Sirve una sola vez.{' '}
            {creada.expiraEn
              ? 'Después de esa fecha deja de funcionar y hay que generar otro.'
              : 'No vence.'}{' '}
            Si se filtra, revocalo desde la tabla y generá uno nuevo.
          </Text>

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setCreada(null);
                setPersona(null);
                setEmail('');
              }}
            >
              Crear otra
            </Button>
            <CopyButton value={link}>
              {({ copied, copy }) => (
                <Button
                  onClick={copy}
                  color={copied ? 'exito' : undefined}
                  leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                >
                  {copied ? 'Copiado' : 'Copiar el link'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal opened onClose={onClose} title="Nueva invitación">
      <Stack gap="sm">
        <Select
          label="Para quién"
          placeholder="Alguien del padrón (opcional)"
          description="Si elegís una persona, la cuenta queda vinculada a su ficha y ve su propia deuda."
          data={opciones}
          value={persona}
          onChange={setPersona}
          searchable
          clearable
        />

        <TextInput
          label="Email"
          placeholder="Opcional"
          description="Solo para acordarte a quién se la mandaste. No se envía ningún mail."
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />

        <Select
          label="Rol"
          data={Object.entries(ETIQUETA_ROL).map(([value, label]) => ({ value, label }))}
          value={rol}
          onChange={(v) => setRol((v ?? 'usuario') as Rol)}
          allowDeselect={false}
        />

        {rol === 'admin' && (
          <Alert color="advertencia" variant="light" py={8}>
            <Text size="xs">
              Una administradora ve todo: costos, márgenes, deudas y el flujo de dinero.
            </Text>
          </Alert>
        )}

        <Select
          label="Vencimiento"
          data={VENCIMIENTOS}
          value={dias}
          onChange={(v) => setDias(v ?? '14')}
          allowDeselect={false}
        />

        {error && (
          <Alert color="error" variant="light" title="No se pudo crear">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={creando} onClick={() => void crear()}>
            Crear invitación
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
