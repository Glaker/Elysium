import { Anchor, Select, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Formulario } from '@/components/ui/Formulario';
import { Pagina } from '@/components/ui/Pagina';
import {
  actualizarProducto,
  crearProducto,
  listarLineas,
  obtenerProducto,
  type DatosProducto,
} from '@/features/productos/api';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  nombre: string;
  lineaId: string | null;
  margen: number | string;
  descripcion: string;
  activo: boolean;
};

const VACIO: Valores = {
  nombre: '',
  lineaId: null,
  margen: '',
  descripcion: '',
  activo: true,
};

/** Alta y edición de producto. Los tamaños se cargan después, desde la ficha. */
export function ProductoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineas = useAsync(listarLineas, []);
  const existente = useAsync(async () => (id ? obtenerProducto(id) : null), [id]);

  const f = useFormulario<Valores>(VACIO, (v) => ({
    nombre: v.nombre.trim() ? undefined : 'El producto necesita un nombre.',
    margen:
      v.margen !== '' && Number(v.margen) < 0
        ? 'El margen no puede ser negativo.'
        : undefined,
  }));

  const { reiniciar } = f;
  useEffect(() => {
    const p = existente.datos;
    if (!p) return;
    reiniciar({
      nombre: p.nombre,
      lineaId: p.lineaId,
      margen: p.margenPct ?? '',
      descripcion: p.descripcion ?? '',
      activo: p.activo,
    });
  }, [existente.datos, reiniciar]);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);

    const datos: DatosProducto = {
      nombre: f.valores.nombre.trim(),
      linea_negocio_id: f.valores.lineaId,
      // Vacío es "usa el margen global", que no es lo mismo que 0%.
      margen_pct: f.valores.margen === '' ? null : Number(f.valores.margen),
      descripcion: f.valores.descripcion.trim() || null,
      activo: f.valores.activo,
    };

    try {
      let destino = id;
      if (id) await actualizarProducto(id, datos);
      else destino = await crearProducto(datos);
      f.reiniciar(f.valores);
      navigate(`/admin/productos/${destino}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pagina
      titulo={id ? `Editar ${existente.datos?.nombre ?? ''}` : 'Nuevo producto'}
      volver={{
        a: id ? `/admin/productos/${id}` : '/admin/productos',
        texto: id ? 'Volver a la ficha' : 'Volver a productos',
      }}
    >
      <Formulario
        onGuardar={guardar}
        guardando={guardando}
        sucio={f.sucio}
        error={error}
        textoGuardar={id ? 'Guardar cambios' : 'Crear producto'}
        onCancelar={() => navigate(id ? `/admin/productos/${id}` : '/admin/productos')}
      >
        <TextInput
          label="Nombre"
          placeholder="Shampoo Café, Bálsamo labial…"
          withAsterisk
          {...f.texto('nombre')}
        />

        <div>
          <Select
            label="Línea de negocio"
            placeholder={lineas.cargando ? 'Cargando…' : 'Elegí una o dejalo vacío'}
            searchable
            clearable
            data={(lineas.datos ?? [])
              .filter((l) => l.activo || l.id === f.valores.lineaId)
              .map((l) => ({ value: l.id, label: l.nombre }))}
            value={f.valores.lineaId}
            onChange={(v) => f.set('lineaId', v)}
            {...f.campo('lineaId')}
          />
          <Text size="xs" c="dimmed" mt={4}>
            ¿No está en la lista?{' '}
            <Anchor component={Link} to="/admin/productos/lineas" size="xs">
              Cargala en líneas de negocio
            </Anchor>
            .
          </Text>
        </div>

        <CampoNumerico
          label="Margen propio"
          description="Solo si este producto se vende con un margen distinto del global. Vacío usa el parámetro general, que no es lo mismo que 0%."
          unidad="%"
          min={0}
          value={f.valores.margen}
          onChange={(v) => f.set('margen', v)}
          {...f.campo('margen')}
        />

        <Textarea
          label="Descripción"
          autosize
          minRows={2}
          maxRows={6}
          {...f.texto('descripcion')}
        />

        <Switch
          label="Activo"
          description="Un producto inactivo sigue existiendo para el histórico, pero no se ofrece al vender."
          checked={f.valores.activo}
          onChange={(e) => f.set('activo', e.currentTarget.checked)}
        />
      </Formulario>
    </Pagina>
  );
}
