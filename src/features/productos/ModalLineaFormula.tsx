import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { ETIQUETA_TIPO, listarInsumos } from '@/features/insumos/api';
import {
  ETIQUETA_APLICA,
  etiquetaTamano,
  guardarLineaFormula,
  type AplicaVariante,
  type DatosLinea,
  type LineaFormula,
  type ModoComposicion,
  type Tamano,
} from '@/features/productos/api';
import { cantidad, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  insumoId: string | null;
  modo: ModoComposicion;
  valor: number | string;
  aplicaA: AplicaVariante;
  orden: number | string;
  notas: string;
};

/**
 * Una línea de fórmula: qué insumo lleva este tamaño y cuánto.
 *
 * Los dos modos no son intercambiables (MODELO §Composición): un porcentaje es
 * sobre el contenido del tamaño — 30% de 75 g son 22,5 g — y una cantidad fija
 * es absoluta, porque un envase no es un porcentaje de lo que contiene.
 */
export function ModalLineaFormula({
  tamano,
  linea,
  onClose,
  onGuardado,
}: {
  tamano: Tamano;
  linea: LineaFormula | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insumos = useAsync(listarInsumos, []);

  const f = useFormulario<Valores>(
    linea
      ? {
          insumoId: linea.insumoId,
          modo: linea.modo,
          valor:
            linea.modo === 'porcentaje'
              ? (linea.porcentaje ?? '')
              : (linea.cantidadFija ?? ''),
          aplicaA: linea.aplicaA,
          orden: linea.orden ?? '',
          notas: linea.notas ?? '',
        }
      : {
          insumoId: null,
          modo: 'porcentaje',
          valor: '',
          aplicaA: 'ambas',
          orden: '',
          notas: '',
        },
    (v) => ({
      insumoId: v.insumoId ? undefined : 'Elegí el insumo.',
      valor:
        v.valor === '' || Number(v.valor) <= 0
          ? v.modo === 'porcentaje'
            ? 'Qué porcentaje del contenido es este insumo.'
            : 'Cuánto entra en una unidad.'
          : undefined,
    }),
  );

  const elegido = (insumos.datos ?? []).find((i) => i.id === f.valores.insumoId);
  const unidadChica = elegido ? UNIDAD_CHICA[elegido.unidad] : '';
  const porcentaje = f.valores.modo === 'porcentaje';
  const enUso =
    f.valores.valor === ''
      ? null
      : porcentaje
        ? (Number(f.valores.valor) / 100) * tamano.magnitud
        : Number(f.valores.valor);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);

    const datos: DatosLinea = {
      tamano_id: tamano.id,
      insumo_id: f.valores.insumoId!,
      modo: f.valores.modo,
      // La base tiene un check que exige que la columna del otro modo sea nula.
      porcentaje: porcentaje ? Number(f.valores.valor) : null,
      cantidad_fija: porcentaje ? null : Number(f.valores.valor),
      aplica_a: f.valores.aplicaA,
      orden: f.valores.orden === '' ? null : Number(f.valores.orden),
      notas: f.valores.notas.trim() || null,
    };

    try {
      await guardarLineaFormula(datos, linea?.id);
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
      title={
        linea ? `Editar ${linea.insumo}` : `Agregar insumo a ${etiquetaTamano(tamano)}`
      }
    >
      <Stack gap="sm">
        <Select
          label="Insumo"
          placeholder={insumos.cargando ? 'Cargando…' : 'Buscá el insumo'}
          searchable
          withAsterisk
          disabled={Boolean(linea)}
          description={
            linea
              ? 'El insumo de una línea no se cambia: borrá la línea y agregá la correcta.'
              : undefined
          }
          data={(insumos.datos ?? [])
            .filter((i) => i.activo || i.id === f.valores.insumoId)
            .map((i) => ({
              value: i.id,
              label: `${i.nombre} · ${ETIQUETA_TIPO[i.tipo]}`,
            }))}
          value={f.valores.insumoId}
          onChange={(v) => f.set('insumoId', v)}
          {...f.campo('insumoId')}
        />

        <Select
          label="Cómo se mide"
          data={[
            { value: 'porcentaje', label: 'Porcentaje del contenido' },
            { value: 'cantidad_fija', label: 'Cantidad fija por unidad' },
          ]}
          value={f.valores.modo}
          onChange={(v) => f.set('modo', (v ?? 'porcentaje') as ModoComposicion)}
          description="Un envase o una etiqueta van por cantidad fija: no son un porcentaje de lo que contienen."
          allowDeselect={false}
        />

        <CampoNumerico
          label={porcentaje ? 'Porcentaje' : 'Cantidad por unidad'}
          unidad={porcentaje ? '%' : unidadChica}
          min={0}
          withAsterisk
          value={f.valores.valor}
          onChange={(v) => f.set('valor', v)}
          {...f.campo('valor')}
        />

        {enUso != null && elegido && (
          <Text size="xs" c="dimmed" mt={-6}>
            {porcentaje
              ? `${cantidad(Number(f.valores.valor))}% de ${cantidad(tamano.magnitud)} ${tamano.unidad} = `
              : 'Entra '}
            <Text component="span" className="tabular" c="bright">
              {cantidad(enUso)} {unidadChica}
            </Text>{' '}
            de {elegido.nombre} por unidad.
          </Text>
        )}

        <Select
          label="Aplica a"
          data={Object.entries(ETIQUETA_APLICA).map(([value, label]) => ({
            value,
            label,
          }))}
          value={f.valores.aplicaA}
          onChange={(v) => f.set('aplicaA', (v ?? 'ambas') as AplicaVariante)}
          description="La etiqueta Elysium es «solo Elysium»: es lo que hace que la marca blanca no cueste lo mismo."
          allowDeselect={false}
        />

        <CampoNumerico
          label="Orden"
          description="En qué posición se lista. Opcional."
          min={0}
          value={f.valores.orden}
          onChange={(v) => f.set('orden', v)}
          {...f.campo('orden')}
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
            {linea ? 'Guardar cambios' : 'Agregar a la fórmula'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
