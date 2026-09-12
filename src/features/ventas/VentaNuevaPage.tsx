import {
  Alert,
  SegmentedControl,
  Select,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Formulario } from '@/components/ui/Formulario';
import { Pagina } from '@/components/ui/Pagina';
import { listarPersonas } from '@/features/deudores/api';
import { listarUbicaciones } from '@/features/stock/api';
import {
  crearVenta,
  ETIQUETA_TIPO_VENTA,
  listarCuentas,
  type TipoVenta,
} from '@/features/ventas/api';
import { hoyISO } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';
import { useFormulario } from '@/lib/useFormulario';

type Valores = {
  tipo: TipoVenta;
  fecha: string;
  personaId: string | null;
  aNombreDeId: string | null;
  cuentaId: string | null;
  formaPago: string;
  ubicacionId: string | null;
  notas: string;
};

const VACIO: Valores = {
  tipo: 'directa',
  fecha: hoyISO(),
  personaId: null,
  aNombreDeId: null,
  cuentaId: null,
  formaPago: '',
  ubicacionId: null,
  notas: '',
};

/**
 * Cabecera de la venta. Nace en borrador y sin líneas: los productos se cargan
 * en la ficha, que es donde se ve el importe que va a quedar congelado.
 */
export function VentaNuevaPage() {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personas = useAsync(listarPersonas, []);
  const cuentas = useAsync(listarCuentas, []);
  const ubicaciones = useAsync(listarUbicaciones, []);

  const f = useFormulario<Valores>(VACIO, (v) => ({
    fecha: v.fecha ? undefined : 'Falta la fecha.',
  }));

  // §7 pide poder cargar una venta sin nombre, así que la persona no es
  // obligatoria. Pero sin persona no hay deuda posible: no hay a quién cobrarle.
  const sinPersona = !f.valores.personaId && !f.valores.aNombreDeId;

  async function guardar() {
    if (!f.intentar()) return;
    setGuardando(true);
    setError(null);
    try {
      const id = await crearVenta({
        tipo: f.valores.tipo,
        fecha: f.valores.fecha,
        persona_id: f.valores.personaId,
        a_nombre_de_persona_id: f.valores.aNombreDeId,
        cuenta_id: f.valores.cuentaId,
        forma_pago: f.valores.formaPago.trim() || null,
        ubicacion_id: f.valores.ubicacionId,
        notas: f.valores.notas.trim() || null,
      });
      f.reiniciar(f.valores);
      navigate(`/admin/ventas/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  const opcionesPersona = (personas.datos ?? [])
    .filter((p) => p.activo)
    .map((p) => ({ value: p.id, label: p.nombre }));

  return (
    <Pagina
      titulo="Nueva venta"
      volver={{ a: '/admin/ventas', texto: 'Volver a ventas' }}
    >
      <Formulario
        onGuardar={guardar}
        guardando={guardando}
        sucio={f.sucio}
        error={error}
        textoGuardar="Crear y cargar productos"
        onCancelar={() => navigate('/admin/ventas')}
      >
        <Formulario.Seccion
          titulo="Qué tipo de venta"
          descripcion="Define qué importe se va a congelar al confirmar, y no se puede cambiar después."
        >
          <SegmentedControl
            fullWidth
            value={f.valores.tipo}
            onChange={(v) => f.set('tipo', v as TipoVenta)}
            data={Object.entries(ETIQUETA_TIPO_VENTA).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Text size="xs" c="dimmed" mt={-6}>
            {f.valores.tipo === 'directa'
              ? 'Se cobra el precio de venta vigente de cada tamaño.'
              : 'Se cobra el costo con etiqueta: es lo que paga quien se lleva mercadería para revender.'}
          </Text>
        </Formulario.Seccion>

        <Formulario.Seccion titulo="A quién">
          <Select
            label="Persona"
            placeholder={personas.cargando ? 'Cargando…' : 'Opcional'}
            searchable
            clearable
            data={opcionesPersona}
            value={f.valores.personaId}
            onChange={(v) => f.set('personaId', v)}
            {...f.campo('personaId')}
          />

          <Select
            label="A nombre de"
            placeholder="Solo si la compra alguien para otra persona"
            searchable
            clearable
            data={opcionesPersona}
            value={f.valores.aNombreDeId}
            onChange={(v) => f.set('aNombreDeId', v)}
            description="La deuda queda a nombre de quien figure acá si no hay persona."
            {...f.campo('aNombreDeId')}
          />

          {sinPersona && (
            <Alert
              color="advertencia"
              variant="light"
              icon={<IconInfoCircle size={16} />}
              py={8}
            >
              <Text size="xs">
                Sin persona la venta se registra igual y descuenta stock, pero no puede
                generar deuda: no hay a quién imputarle un pago.
              </Text>
            </Alert>
          )}
        </Formulario.Seccion>

        <Formulario.Seccion titulo="Cuándo, de dónde sale y cómo se cobra">
          <TextInput
            type="date"
            label="Fecha"
            description="Los precios y costos que se congelen al confirmar son los vigentes a esta fecha."
            value={f.valores.fecha}
            onChange={(e) => f.set('fecha', e.currentTarget.value)}
            {...f.campo('fecha')}
          />

          <Select
            label="Ubicación de salida"
            placeholder="La de por defecto"
            clearable
            data={(ubicaciones.datos ?? [])
              .filter((u) => u.activo)
              .map((u) => ({ value: u.id, label: u.nombre }))}
            value={f.valores.ubicacionId}
            onChange={(v) => f.set('ubicacionId', v)}
            description="De dónde se descuenta la mercadería al confirmar."
          />

          <Select
            label="Cuenta"
            placeholder={cuentas.cargando ? 'Cargando…' : 'A dónde entra la plata'}
            searchable
            clearable
            data={(cuentas.datos ?? [])
              .filter((c) => c.activo)
              .map((c) => ({
                value: c.id,
                label: c.alias ? `${c.nombre} · ${c.alias}` : c.nombre,
              }))}
            value={f.valores.cuentaId}
            onChange={(v) => f.set('cuentaId', v)}
          />

          <TextInput
            label="Forma de pago"
            placeholder="Transferencia, efectivo…"
            {...f.texto('formaPago')}
          />

          <Textarea label="Notas" autosize minRows={2} {...f.texto('notas')} />
        </Formulario.Seccion>
      </Formulario>
    </Pagina>
  );
}
