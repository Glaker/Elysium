import { Anchor, Select, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Formulario } from '@/components/ui/Formulario';
import { Pagina } from '@/components/ui/Pagina';
import {
  actualizarInsumo,
  crearInsumo,
  ETIQUETA_TIPO,
  listarProveedores,
  obtenerInsumo,
  type DatosInsumo,
  type OrigenInsumo,
  type TipoInsumo,
  type UnidadInsumo,
} from '@/features/insumos/api';
import { UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  nombre: string;
  tipo: TipoInsumo;
  unidad: UnidadInsumo;
  origen: OrigenInsumo;
  proveedorId: string | null;
  link: string;
  rinde: number | string;
  notas: string;
  activo: boolean;
};

const VACIO: Valores = {
  nombre: '',
  tipo: 'materia_prima',
  unidad: 'kg',
  origen: 'comprado',
  proveedorId: null,
  link: '',
  rinde: '',
  notas: '',
  activo: true,
};

/** Alta y edición de insumo. Una sola pantalla: los campos son los mismos. */
export function InsumoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proveedores = useAsync(listarProveedores, []);
  const existente = useAsync(async () => (id ? obtenerInsumo(id) : null), [id]);

  const f = useFormulario<Valores>(VACIO, (v) => ({
    nombre: v.nombre.trim() ? undefined : 'El insumo necesita un nombre.',
    rinde:
      v.origen === 'producido' && (v.rinde === '' || Number(v.rinde) <= 0)
        ? `Cuánto sale de una tanda, en ${UNIDAD_CHICA[v.unidad]}.`
        : undefined,
  }));

  const { reiniciar } = f;
  useEffect(() => {
    const i = existente.datos;
    if (!i) return;
    reiniciar({
      nombre: i.nombre,
      tipo: i.tipo,
      unidad: i.unidad,
      origen: i.origen,
      proveedorId: i.proveedorId,
      link: i.link ?? '',
      rinde: i.rinde ?? '',
      notas: i.notas ?? '',
      activo: i.activo,
    });
  }, [existente.datos, reiniciar]);

  const producido = f.valores.origen === 'producido';

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);

    const datos: DatosInsumo = {
      nombre: f.valores.nombre.trim(),
      tipo: f.valores.tipo,
      unidad: f.valores.unidad,
      origen: f.valores.origen,
      // La base exige rinde solo en producidos y proveedor no tiene sentido en
      // una MP intermedia: se limpia acá y no en un trigger.
      proveedor_id: producido ? null : f.valores.proveedorId,
      link: f.valores.link.trim() || null,
      rinde_cantidad: producido ? Number(f.valores.rinde) : null,
      notas: f.valores.notas.trim() || null,
      activo: f.valores.activo,
    };

    try {
      if (id) {
        await actualizarInsumo(id, datos);
        f.reiniciar(f.valores);
        navigate(`/admin/insumos/${id}`);
      } else {
        const nuevo = await crearInsumo(datos);
        f.reiniciar(f.valores);
        navigate(`/admin/insumos/${nuevo}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pagina
      titulo={id ? `Editar ${existente.datos?.nombre ?? ''}` : 'Nuevo insumo'}
      volver={{
        a: id ? `/admin/insumos/${id}` : '/admin/insumos',
        texto: id ? 'Volver a la ficha' : 'Volver a insumos',
      }}
    >
      <Formulario
        onGuardar={guardar}
        guardando={guardando}
        sucio={f.sucio}
        error={error}
        textoGuardar={id ? 'Guardar cambios' : 'Crear insumo'}
        onCancelar={() => navigate(id ? `/admin/insumos/${id}` : '/admin/insumos')}
      >
        <Formulario.Seccion titulo="Identificación">
          <TextInput
            label="Nombre"
            placeholder="SCI, Envase Shampoo Café…"
            withAsterisk
            {...f.texto('nombre')}
          />
          <Select
            label="Tipo"
            description="Marcar la etiqueta es lo que permite separar costo s/etiqueta de costo c/etiqueta."
            data={Object.entries(ETIQUETA_TIPO).map(([value, label]) => ({
              value,
              label,
            }))}
            value={f.valores.tipo}
            onChange={(v) => f.set('tipo', (v ?? 'materia_prima') as TipoInsumo)}
            allowDeselect={false}
          />
          <Select
            label={producido ? 'Unidad' : 'Unidad de compra'}
            description={
              producido
                ? `La unidad en la que se mide; las cantidades de fórmula van en ${UNIDAD_CHICA[f.valores.unidad]}.`
                : `El precio se carga por esta unidad; las cantidades de fórmula van en ${UNIDAD_CHICA[f.valores.unidad]}.`
            }
            data={[
              { value: 'kg', label: 'Kilogramo (kg)' },
              { value: 'l', label: 'Litro (l)' },
              { value: 'unidad', label: 'Unidad' },
            ]}
            value={f.valores.unidad}
            onChange={(v) => f.set('unidad', (v ?? 'kg') as UnidadInsumo)}
            allowDeselect={false}
          />
        </Formulario.Seccion>

        <Formulario.Seccion
          titulo="Origen"
          descripcion="Si Elysium lo fabrica, su costo sale de la composición y no de un precio de lista."
        >
          <Select
            label="Se compra o se produce"
            data={[
              { value: 'comprado', label: 'Se compra' },
              { value: 'producido', label: 'Se produce (MP intermedia)' },
            ]}
            value={f.valores.origen}
            onChange={(v) => f.set('origen', (v ?? 'comprado') as OrigenInsumo)}
            allowDeselect={false}
          />

          {producido ? (
            <CampoNumerico
              label="Rinde de una tanda"
              description="Cuánto sale de producirlo una vez. El costo de la composición se divide por este número."
              unidad={UNIDAD_CHICA[f.valores.unidad]}
              min={0}
              withAsterisk
              value={f.valores.rinde}
              onChange={(v) => f.set('rinde', v)}
              {...f.campo('rinde')}
            />
          ) : (
            <>
              <Select
                label="Proveedor"
                placeholder={
                  proveedores.cargando ? 'Cargando…' : 'Elegí uno o dejalo vacío'
                }
                searchable
                clearable
                data={(proveedores.datos ?? []).map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
                value={f.valores.proveedorId}
                onChange={(v) => f.set('proveedorId', v)}
                {...f.campo('proveedorId')}
              />
              <Text size="xs" c="dimmed" mt={-6}>
                ¿No está en la lista?{' '}
                <Anchor component={Link} to="/admin/insumos/proveedores" size="xs">
                  Cargalo en proveedores
                </Anchor>
                .
              </Text>
              <TextInput
                label="Link de este insumo"
                description="La página exacta del producto, si es distinta de la del proveedor."
                placeholder="https://…"
                {...f.texto('link')}
              />
            </>
          )}
        </Formulario.Seccion>

        <Formulario.Seccion titulo="Otros">
          <Textarea
            label="Notas"
            autosize
            minRows={2}
            maxRows={6}
            {...f.texto('notas')}
          />
          <Switch
            label="Activo"
            description="Un insumo inactivo sigue existiendo para el histórico, pero no se ofrece al cargar fórmulas."
            checked={f.valores.activo}
            onChange={(e) => f.set('activo', e.currentTarget.checked)}
          />
        </Formulario.Seccion>
      </Formulario>
    </Pagina>
  );
}
