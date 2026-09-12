import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import {
  guardarTamano,
  type DatosTamano,
  type Tamano,
  type UnidadTamano,
} from '@/features/productos/api';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  nombre: string;
  magnitud: number | string;
  unidad: UnidadTamano;
  productividad: number | string;
  activo: boolean;
};

/**
 * Alta y edición de un tamaño.
 *
 * Es un modal y no una ruta porque son cuatro campos, pero el tamaño que se
 * crea acá es la unidad real del sistema: lo que se stockea, lo que se vende y
 * lo que tiene precio (MODELO §Productos). La fórmula y el precio se cargan
 * después, cada uno en su pantalla.
 */
export function ModalTamano({
  productoId,
  producto,
  tamano,
  onClose,
  onGuardado,
}: {
  productoId: string;
  producto: string;
  tamano: Tamano | null;
  onClose: () => void;
  onGuardado: (id: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = useFormulario<Valores>(
    tamano
      ? {
          nombre: tamano.nombre ?? '',
          magnitud: tamano.magnitud,
          unidad: tamano.unidad,
          productividad: tamano.productividad ?? '',
          activo: tamano.activo,
        }
      : { nombre: '', magnitud: '', unidad: 'g', productividad: '', activo: true },
    (v) => ({
      magnitud:
        v.magnitud === '' || Number(v.magnitud) <= 0
          ? 'Cuánto contiene una unidad. Es lo que multiplica los porcentajes de la fórmula.'
          : undefined,
      productividad:
        v.productividad !== '' && Number(v.productividad) <= 0
          ? 'Tienen que ser unidades por hora, mayor que cero.'
          : undefined,
    }),
  );

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);

    const datos: DatosTamano = {
      producto_id: productoId,
      nombre: f.valores.nombre.trim() || null,
      magnitud: Number(f.valores.magnitud),
      unidad: f.valores.unidad,
      // Sin productividad no hay costo de mano de obra, y el costo sale
      // incompleto. Es preferible eso a inventar un número.
      productividad_unid_hora:
        f.valores.productividad === '' ? null : Number(f.valores.productividad),
      activo: f.valores.activo,
    };

    try {
      const id = await guardarTamano(datos, tamano?.id);
      onGuardado(id);
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
      title={tamano ? 'Editar tamaño' : `Nuevo tamaño de ${producto}`}
    >
      <Stack gap="sm">
        <Group grow align="flex-start">
          <CampoNumerico
            label="Contenido"
            description="Lo que trae una unidad."
            unidad={f.valores.unidad}
            min={0}
            withAsterisk
            value={f.valores.magnitud}
            onChange={(v) => f.set('magnitud', v)}
            {...f.campo('magnitud')}
          />
          <Select
            label="Unidad"
            data={[
              { value: 'g', label: 'Gramos (g)' },
              { value: 'ml', label: 'Mililitros (ml)' },
            ]}
            value={f.valores.unidad}
            onChange={(v) => f.set('unidad', (v ?? 'g') as UnidadTamano)}
            allowDeselect={false}
          />
        </Group>

        <TextInput
          label="Nombre"
          description="Opcional. Si lo dejás vacío se lo llama por su contenido."
          placeholder={
            f.valores.magnitud === ''
              ? '75 g'
              : `${f.valores.magnitud} ${f.valores.unidad}`
          }
          {...f.texto('nombre')}
        />

        <CampoNumerico
          label="Productividad"
          description="Cuántas unidades salen por hora (§3.2). De acá sale el costo de mano de obra; sin esto el costo queda incompleto."
          unidad="u / hora"
          min={0}
          value={f.valores.productividad}
          onChange={(v) => f.set('productividad', v)}
          {...f.campo('productividad')}
        />

        <Switch
          label="Activo"
          description="Un tamaño inactivo conserva su historial, pero no se ofrece al vender ni al producir."
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
            {tamano ? 'Guardar cambios' : 'Crear tamaño'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
