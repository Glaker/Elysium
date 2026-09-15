import {
  Alert,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { CampoNumerico } from '@/components/ui/CampoNumerico';
import { Formulario } from '@/components/ui/Formulario';
import { Pagina } from '@/components/ui/Pagina';
import { listarInsumos } from '@/features/insumos/api';
import { listarPersonas } from '@/features/deudores/api';
import { crearLote, type DestinoLote } from '@/features/lotes/api';
import {
  etiquetaTamano,
  ETIQUETA_VARIANTE,
  listarProductos,
  type Variante,
} from '@/features/productos/api';
import { cantidad, hoyISO, UNIDAD_CHICA } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  destino: DestinoLote;
  variante: Variante;
  tamanoId: string | null;
  insumoId: string | null;
  unidades: number | string;
  fecha: string;
  codigo: string;
  responsableId: string | null;
  notas: string;
};

const VACIO: Valores = {
  destino: 'producto',
  variante: 'elysium',
  tamanoId: null,
  insumoId: null,
  unidades: '',
  fecha: hoyISO(),
  codigo: '',
  responsableId: null,
  notas: '',
};

/**
 * Planificar un lote.
 *
 * Al guardar, la app crea el lote y corre `lote_planificar`, que baja la
 * fórmula (o la composición, si produce una MP intermedia) y arma el plan de
 * consumo. Nada de eso toca el stock todavía: eso pasa recién al cerrarlo.
 */
export function LoteNuevoPage() {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productos = useAsync(listarProductos, []);
  const insumos = useAsync(listarInsumos, []);
  const personas = useAsync(listarPersonas, []);

  const f = useFormulario<Valores>(VACIO, (v) => ({
    tamanoId:
      v.destino === 'producto' && !v.tamanoId
        ? 'Elegí qué tamaño se va a producir.'
        : undefined,
    insumoId:
      v.destino === 'mp' && !v.insumoId
        ? 'Elegí qué materia prima se va a producir.'
        : undefined,
    unidades:
      v.unidades === '' || Number(v.unidades) <= 0
        ? 'Cuánto se planifica producir.'
        : undefined,
    fecha: v.fecha ? undefined : 'Falta la fecha.',
  }));

  const producto = f.valores.destino === 'producto';
  const mp = (insumos.datos ?? []).find((i) => i.id === f.valores.insumoId);
  const unidadChica = mp ? UNIDAD_CHICA[mp.unidad] : '';

  // Para una MP intermedia, las unidades planificadas van en unidad chica y no
  // en tandas (MODELO §Producción). Mostrar a cuántas tandas equivale es lo que
  // evita que alguien cargue "2" queriendo decir dos tandas de 500 ml.
  const tandas =
    mp?.rinde && f.valores.unidades !== '' ? Number(f.valores.unidades) / mp.rinde : null;

  const tamanos = (productos.datos ?? [])
    .flatMap((p) => p.tamanos.map((t) => ({ p, t })))
    .filter(({ t }) => t.activo);

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const id = await crearLote({
        codigo: f.valores.codigo.trim() || null,
        fecha: f.valores.fecha,
        variante: f.valores.variante,
        tamano_id: producto ? f.valores.tamanoId : null,
        insumo_producido_id: producto ? null : f.valores.insumoId,
        unidades_planificadas: Number(f.valores.unidades),
        responsable_persona_id: f.valores.responsableId,
        notas: f.valores.notas.trim() || null,
      });
      f.reiniciar(f.valores);
      navigate(`/admin/lotes/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pagina titulo="Nuevo lote" volver={{ a: '/admin/lotes', texto: 'Volver a lotes' }}>
      <Formulario
        onGuardar={guardar}
        guardando={guardando}
        sucio={f.sucio}
        error={error}
        textoGuardar="Crear y planificar"
        onCancelar={() => navigate('/admin/lotes')}
      >
        <Formulario.Seccion
          titulo="Qué se produce"
          descripcion="Un lote hace un producto terminado o una materia prima intermedia. Nunca las dos cosas."
        >
          <SegmentedControl
            fullWidth
            value={f.valores.destino}
            onChange={(v) => f.set('destino', v as DestinoLote)}
            data={[
              { value: 'producto', label: 'Producto terminado' },
              { value: 'mp', label: 'Materia prima intermedia' },
            ]}
          />

          {producto ? (
            <Select
              label="Tamaño"
              placeholder={productos.cargando ? 'Cargando…' : 'Elegí el tamaño'}
              searchable
              withAsterisk
              data={tamanos.map(({ p, t }) => ({
                value: t.id,
                label: `${p.nombre} · ${etiquetaTamano(t)}`,
              }))}
              value={f.valores.tamanoId}
              onChange={(v) => f.set('tamanoId', v)}
              description="El plan de insumos sale de la fórmula de este tamaño."
              {...f.campo('tamanoId')}
            />
          ) : (
            <Select
              label="Materia prima"
              placeholder={insumos.cargando ? 'Cargando…' : 'Elegí la materia prima'}
              searchable
              withAsterisk
              data={(insumos.datos ?? [])
                .filter((i) => i.origen === 'producido')
                .map((i) => ({ value: i.id, label: i.nombre }))}
              value={f.valores.insumoId}
              onChange={(v) => f.set('insumoId', v)}
              description="Solo las que Elysium fabrica. El plan sale de su composición."
              {...f.campo('insumoId')}
            />
          )}

          {producto && (
            <Select
              label="Variante"
              data={Object.entries(ETIQUETA_VARIANTE).map(([value, label]) => ({
                value,
                label,
              }))}
              value={f.valores.variante}
              onChange={(v) => f.set('variante', (v ?? 'elysium') as Variante)}
              allowDeselect={false}
              description="Define qué líneas de la fórmula se planifican: la marca blanca no lleva la etiqueta Elysium, y por lo tanto tampoco la consume del stock."
            />
          )}

          <CampoNumerico
            label={producto ? 'Unidades a producir' : 'Cantidad a producir'}
            description={
              producto
                ? 'Cuántas unidades salen de este lote si todo va bien.'
                : 'La cantidad total, en la unidad chica de la materia prima. No es la cantidad de tandas.'
            }
            unidad={producto ? 'u' : unidadChica}
            min={0}
            withAsterisk
            value={f.valores.unidades}
            onChange={(v) => f.set('unidades', v)}
            {...f.campo('unidades')}
          />

          {tandas != null && (
            <Text size="xs" c="dimmed" mt={-6}>
              Equivale a{' '}
              <Text component="span" className="tabular" c="bright">
                {cantidad(tandas)}
              </Text>{' '}
              {tandas === 1 ? 'tanda' : 'tandas'} de {cantidad(mp!.rinde!)} {unidadChica}.
            </Text>
          )}
        </Formulario.Seccion>

        <Formulario.Seccion titulo="Cuándo y quién">
          <TextInput
            type="date"
            label="Fecha"
            description="Los precios y parámetros que se congelen al cerrar son los vigentes a esta fecha."
            value={f.valores.fecha}
            onChange={(e) => f.set('fecha', e.currentTarget.value)}
            {...f.campo('fecha')}
          />

          <TextInput
            label="Código"
            description="Opcional. Cómo lo vas a llamar: L-2026-03, Shampoo marzo…"
            {...f.texto('codigo')}
          />

          <Select
            label="Responsable"
            placeholder={personas.cargando ? 'Cargando…' : 'Opcional'}
            searchable
            clearable
            data={(personas.datos ?? [])
              .filter((p) => p.activo || p.id === f.valores.responsableId)
              .map((p) => ({
                value: p.id,
                label: p.esProductor ? `${p.nombreCompleto} · produce` : p.nombreCompleto,
              }))}
            value={f.valores.responsableId}
            onChange={(v) => f.set('responsableId', v)}
            description="Quien lo fabrica puede registrar el resultado sin ver los costos."
            {...f.campo('responsableId')}
          />

          <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />
        </Formulario.Seccion>

        <Alert color="advertencia" variant="light" icon={<IconInfoCircle size={16} />}>
          <Stack gap={2}>
            <Text size="sm">Crear el lote no toca el stock.</Text>
            <Text size="xs" c="dimmed">
              Se arma el plan de consumo desde la fórmula. Los insumos salen del stock y
              las unidades entran recién cuando cerrás el lote.
            </Text>
          </Stack>
        </Alert>
      </Formulario>
    </Pagina>
  );
}
