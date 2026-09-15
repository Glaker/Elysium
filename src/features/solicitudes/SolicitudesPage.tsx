import { Alert, Button, Group, Select, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useContextoAdmin } from '@/components/layout/contextoAdmin';
import { BadgeEstado } from '@/components/ui/BadgeEstado';
import { Pagina } from '@/components/ui/Pagina';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { ModalSolicitud } from '@/features/solicitudes/ModalSolicitud';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  listarSolicitudes,
  type Solicitud,
} from '@/features/solicitudes/api';
import { cantidad as fmtCantidad, fecha as fmtFecha } from '@/lib/formato';
import { useAsync } from '@/lib/useAsync';

type Filtro = 'pendientes' | 'resueltos' | 'todos';

/** Qué pidió, en una línea. La tabla es para barrer, el detalle está en el modal. */
function resumen(s: Solicitud): string {
  if (s.tipo === 'materia_prima') {
    return s.tamanoObjetivo
      ? `Insumos para ${fmtCantidad(s.unidadesObjetivo ?? 0)} u de ${s.tamanoObjetivo}`
      : 'Materia prima';
  }
  if (s.lineas.length === 0) return 'Sin líneas';
  const [primera, ...resto] = s.lineas;
  const uno = `${fmtCantidad(primera.cantidad)} × ${primera.descripcion}`;
  return resto.length ? `${uno} y ${resto.length} más` : uno;
}

/**
 * La bandeja de pedidos: lo que la gente pidió desde su teléfono y todavía no
 * tuvo respuesta.
 *
 * Existe porque un pedido que entra a la base y nadie ve es peor que el WhatsApp
 * que venía a reemplazar (§11). Un pedido no es una venta y no aparta stock: de
 * acá sale, como mucho, una venta en borrador.
 */
export function SolicitudesPage() {
  const { refrescarPendientes } = useContextoAdmin();
  const solicitudes = useAsync(listarSolicitudes, []);
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [abierta, setAbierta] = useState<string | null>(null);

  const filas = useMemo(() => {
    const todas = solicitudes.datos ?? [];
    if (filtro === 'todos') return todas;
    const pendiente = filtro === 'pendientes';
    return todas.filter((s) => (s.estado === 'pendiente') === pendiente);
  }, [solicitudes.datos, filtro]);

  // Se busca en la lista viva y no en la fila congelada al abrir: después de
  // resolver, el modal tiene que mostrar el estado nuevo.
  const seleccionada = (solicitudes.datos ?? []).find((s) => s.id === abierta) ?? null;

  const columnas: Columna<Solicitud>[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      ancho: 110,
      orden: (s) => s.fecha,
      render: (s) => (
        <Text size="sm" className="tabular">
          {fmtFecha(s.fecha)}
        </Text>
      ),
    },
    {
      clave: 'persona',
      titulo: 'Quién',
      ancho: 250,
      orden: (s) => s.persona,
      // Sin `nowrap`: con un nombre largo, el badge se comprimía hasta
      // "Reven…", que es peor que bajarlo un renglón.
      render: (s) => (
        <Group gap={6}>
          <Text size="sm" fw={500}>
            {s.persona}
          </Text>
          {s.esRevendedor && (
            <BadgeEstado ayuda="Se lleva mercadería para revender: paga el costo, no el precio de lista.">
              Revende
            </BadgeEstado>
          )}
        </Group>
      ),
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 140,
      orden: (s) => s.tipo,
      render: (s) => (
        <Text size="sm" c="dimmed">
          {ETIQUETA_TIPO[s.tipo]}
        </Text>
      ),
    },
    {
      clave: 'pedido',
      titulo: 'Qué pidió',
      orden: (s) => resumen(s),
      render: (s) => (
        <Text size="sm" lineClamp={1}>
          {resumen(s)}
        </Text>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 120,
      orden: (s) => s.estado,
      render: (s) =>
        s.estado === 'pendiente' ? (
          <BadgeEstado tono="advertencia" ayuda="Todavía no tuvo respuesta.">
            Pendiente
          </BadgeEstado>
        ) : (
          <BadgeEstado>{ETIQUETA_ESTADO[s.estado]}</BadgeEstado>
        ),
    },
  ];

  const pendientes = (solicitudes.datos ?? []).filter(
    (s) => s.estado === 'pendiente',
  ).length;

  return (
    <Pagina
      titulo="Pedidos"
      descripcion="Lo que te pidieron desde la app. Un pedido es un aviso: no aparta stock ni es una venta hasta que vos la crees."
      volver={{ a: '/admin/ventas', texto: 'Volver a ventas' }}
      acciones={
        <Button
          variant="default"
          component={Link}
          to="/admin/ventas"
          rightSection={<IconArrowRight size={15} />}
        >
          Ver las ventas
        </Button>
      }
    >
      {solicitudes.error && (
        <Alert color="error" variant="light" title="No se pudieron cargar los pedidos">
          {solicitudes.error}
        </Alert>
      )}

      <Tabla
        filas={filas}
        idDe={(s) => s.id}
        columnas={columnas}
        cargando={solicitudes.cargando}
        textoBusqueda={(s) => `${s.persona} ${resumen(s)} ${s.notas ?? ''}`}
        placeholderBusqueda="Buscar por persona o producto…  (/)"
        anchoMinimo={880}
        onFila={(s) => setAbierta(s.id)}
        filtros={
          <Select
            w={190}
            aria-label="Qué pedidos"
            value={filtro}
            onChange={(v) => setFiltro((v ?? 'pendientes') as Filtro)}
            allowDeselect={false}
            data={[
              {
                value: 'pendientes',
                label: pendientes ? `Pendientes (${pendientes})` : 'Pendientes',
              },
              { value: 'resueltos', label: 'Resueltos' },
              { value: 'todos', label: 'Todos' },
            ]}
          />
        }
        vacio={{
          titulo:
            filtro === 'pendientes'
              ? 'No hay pedidos pendientes'
              : 'Todavía no hay pedidos',
          descripcion:
            'Cuando alguien pida un producto o materia prima desde su cuenta, te aparece acá.',
        }}
      />

      {seleccionada && (
        <ModalSolicitud
          solicitud={seleccionada}
          onClose={() => setAbierta(null)}
          onResuelta={() => {
            solicitudes.recargar();
            refrescarPendientes();
          }}
        />
      )}
    </Pagina>
  );
}
