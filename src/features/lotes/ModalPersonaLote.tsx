import { Alert, Button, Group, Modal, Select, Stack, Textarea } from '@mantine/core';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { listarPersonas } from '@/features/deudores/api';
import { guardarPersonaLote, type PersonaDelLote } from '@/features/lotes/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  personaId: string | null;
  horas: number | string;
  importe: number | string;
  notas: string;
};

/**
 * Quién trabajó en el lote, cuánto tiempo y cuánto cobró (§3.3).
 *
 * Si hay importes cargados, el costo del lote usa la suma de lo pagado en vez
 * de la estimación por productividad: un número real le gana a uno teórico.
 */
export function ModalPersonaLote({
  loteId,
  persona,
  onClose,
  onGuardado,
}: {
  loteId: string;
  persona: PersonaDelLote | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const personas = useAsync(listarPersonas, []);

  const f = useFormulario<Valores>(
    persona
      ? {
          personaId: persona.personaId,
          horas: persona.horas ?? '',
          importe: persona.importePagado ?? '',
          notas: persona.notas ?? '',
        }
      : { personaId: null, horas: '', importe: '', notas: '' },
    (v) => ({ personaId: v.personaId ? undefined : 'Elegí a la persona.' }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarPersonaLote(
        {
          lote_id: loteId,
          persona_id: f.valores.personaId!,
          horas: f.valores.horas === '' ? null : Number(f.valores.horas),
          importe_pagado: f.valores.importe === '' ? null : Number(f.valores.importe),
          notas: f.valores.notas.trim() || null,
        },
        persona?.id,
      );
      onGuardado();
      onClose();
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
      title={persona ? `Editar ${persona.nombre}` : 'Sumar a alguien al lote'}
      size="sm"
    >
      <Stack gap="sm">
        <Select
          label="Persona"
          placeholder={personas.cargando ? 'Cargando…' : 'Elegí a la persona'}
          searchable
          withAsterisk
          disabled={Boolean(persona)}
          data={(personas.datos ?? [])
            .filter((p) => p.activo || p.id === f.valores.personaId)
            .map((p) => ({
              value: p.id,
              label: p.esProductor ? `${p.nombreCompleto} · produce` : p.nombreCompleto,
            }))}
          value={f.valores.personaId}
          onChange={(v) => f.set('personaId', v)}
          {...f.campo('personaId')}
        />

        <CampoNumerico
          label="Horas"
          unidad="h"
          min={0}
          value={f.valores.horas}
          onChange={(v) => f.set('horas', v)}
          {...f.campo('horas')}
        />

        <CampoNumerico
          label="Importe pagado"
          description="Lo que cobró por este lote. Si lo cargás, el costo del lote deja de estimar la mano de obra y usa este número."
          moneda="ARS"
          min={0}
          value={f.valores.importe}
          onChange={(v) => f.set('importe', v)}
          {...f.campo('importe')}
        />

        <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />

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
            {persona ? 'Guardar cambios' : 'Sumar al lote'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
