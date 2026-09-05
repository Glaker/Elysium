import {
  Box,
  Button,
  EmptyState,
  Group,
  Skeleton,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconSelector,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type Columna<T> = {
  clave: string;
  titulo: string;
  /** Alinea a la derecha. Toda columna de cifras la lleva. */
  numerica?: boolean;
  ancho?: number | string;
  /** Valor por el que ordena la columna. Sin esto, la columna no es ordenable. */
  orden?: (f: T) => string | number | null | undefined;
  render: (f: T) => React.ReactNode;
};

type Props<T> = {
  filas: T[] | null;
  idDe: (f: T) => string;
  columnas: Columna<T>[];
  cargando?: boolean;
  /** Texto sobre el que corre el buscador. Sin esto no hay buscador. */
  textoBusqueda?: (f: T) => string;
  placeholderBusqueda?: string;
  /** Un ícono al final de la fila, o un menú si son más de dos acciones. */
  acciones?: (f: T) => React.ReactNode;
  /** Lo que va a la derecha del buscador: la acción principal, algún filtro. */
  herramientas?: React.ReactNode;
  /** Filtros propios del área. Solo donde hagan falta de verdad. */
  filtros?: React.ReactNode;
  vacio: { titulo: string; descripcion?: string; accion?: React.ReactNode };
  onFila?: (f: T) => void;
  /** Alto del área scrolleable. El encabezado queda fijo arriba. */
  alto?: string | number;
  anchoMinimo?: number;
};

type Orden = { clave: string; desc: boolean } | null;

/**
 * La tabla del admin. Es el componente central del área: densidad compacta,
 * encabezado fijo al scrollear, números a la derecha, sin bordes verticales,
 * hover sutil.
 *
 * Trae de fábrica lo que toda tabla necesita y ninguna debería reimplementar:
 * búsqueda por texto, ordenamiento por columna, estado vacío con la acción para
 * cargar el primero, y skeleton mientras carga (no un spinner: el skeleton
 * conserva la forma de la tabla y no hace saltar el layout).
 */
export function Tabla<T>({
  filas,
  idDe,
  columnas,
  cargando,
  textoBusqueda,
  placeholderBusqueda = 'Buscar…',
  acciones,
  herramientas,
  filtros,
  vacio,
  onFila,
  alto = 'calc(100vh - 200px)',
  anchoMinimo = 720,
}: Props<T>) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>(null);
  const buscador = useRef<HTMLInputElement>(null);

  // Sesiones largas de teclado: `/` va al buscador desde cualquier lado.
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      const activo = document.activeElement?.tagName;
      if (e.key === '/' && activo !== 'INPUT' && activo !== 'TEXTAREA') {
        e.preventDefault();
        buscador.current?.focus();
      }
    }
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, []);

  const visibles = useMemo(() => {
    let out = filas ?? [];

    if (busqueda.trim() && textoBusqueda) {
      const q = busqueda.trim().toLowerCase();
      out = out.filter((f) => textoBusqueda(f).toLowerCase().includes(q));
    }

    const col = orden && columnas.find((c) => c.clave === orden.clave);
    if (col?.orden) {
      const dir = orden?.desc ? -1 : 1;
      out = [...out].sort((a, b) => {
        const va = col.orden!(a);
        const vb = col.orden!(b);
        // Lo desconocido va siempre al final, ordene como ordene la columna:
        // un dato que falta no compite por posición con uno que existe.
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), 'es') * dir;
      });
    }

    return out;
  }, [filas, busqueda, textoBusqueda, orden, columnas]);

  const cabecera = (
    <Table.Tr>
      {columnas.map((c) => {
        const activa = orden?.clave === c.clave;
        const Icono = !activa
          ? IconSelector
          : orden.desc
            ? IconChevronDown
            : IconChevronUp;
        return (
          <Table.Th key={c.clave} w={c.ancho} ta={c.numerica ? 'right' : undefined}>
            {c.orden ? (
              <UnstyledButton
                onClick={() =>
                  setOrden((o) =>
                    o?.clave === c.clave
                      ? { clave: c.clave, desc: !o.desc }
                      : { clave: c.clave, desc: false },
                  )
                }
                w="100%"
              >
                <Group
                  gap={3}
                  wrap="nowrap"
                  justify={c.numerica ? 'flex-end' : 'flex-start'}
                >
                  <Text size="xs" fw={600} c={activa ? undefined : 'dimmed'}>
                    {c.titulo}
                  </Text>
                  <Icono size={12} opacity={activa ? 1 : 0.4} />
                </Group>
              </UnstyledButton>
            ) : (
              <Text size="xs" fw={600} c="dimmed">
                {c.titulo}
              </Text>
            )}
          </Table.Th>
        );
      })}
      {acciones && <Table.Th w={44} />}
    </Table.Tr>
  );

  const cuerpo = cargando
    ? [...Array(6)].map((_, i) => (
        <Table.Tr key={i}>
          {columnas.map((c) => (
            <Table.Td key={c.clave}>
              <Skeleton
                h={12}
                w={c.numerica ? '60%' : '85%'}
                ml={c.numerica ? 'auto' : 0}
              />
            </Table.Td>
          ))}
          {acciones && <Table.Td />}
        </Table.Tr>
      ))
    : visibles.map((f) => (
        <Table.Tr
          key={idDe(f)}
          onClick={onFila ? () => onFila(f) : undefined}
          style={onFila ? { cursor: 'pointer' } : undefined}
        >
          {columnas.map((c) => (
            <Table.Td key={c.clave} ta={c.numerica ? 'right' : undefined}>
              {c.numerica ? (
                <Group gap={0} justify="flex-end" wrap="nowrap">
                  {c.render(f)}
                </Group>
              ) : (
                c.render(f)
              )}
            </Table.Td>
          ))}
          {acciones && (
            <Table.Td
              onClick={(e) => e.stopPropagation()}
              style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
            >
              {acciones(f)}
            </Table.Td>
          )}
        </Table.Tr>
      ));

  const sinNada = !cargando && (filas?.length ?? 0) === 0;
  const sinCoincidencias = !cargando && !sinNada && visibles.length === 0;

  return (
    <Box>
      {(textoBusqueda || herramientas || filtros) && (
        <Group justify="space-between" align="center" mb="xs" gap="sm" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            {textoBusqueda && (
              <TextInput
                ref={buscador}
                placeholder={placeholderBusqueda}
                value={busqueda}
                onChange={(e) => setBusqueda(e.currentTarget.value)}
                leftSection={<IconSearch size={14} />}
                w={260}
                aria-label="Buscar"
              />
            )}
            {filtros}
          </Group>
          {herramientas}
        </Group>
      )}

      {sinNada ? (
        <EmptyState
          py="xl"
          title={vacio.titulo}
          description={vacio.descripcion}
          align="center"
        >
          {vacio.accion && <EmptyState.Actions>{vacio.accion}</EmptyState.Actions>}
        </EmptyState>
      ) : (
        <Table.ScrollContainer minWidth={anchoMinimo} maxHeight={alto} type="native">
          <Table stickyHeader highlightOnHover={!!onFila} layout="auto">
            <Table.Thead
              style={{ background: 'var(--mantine-color-noche-8)', zIndex: 2 }}
            >
              {cabecera}
            </Table.Thead>
            <Table.Tbody>{cuerpo}</Table.Tbody>
          </Table>

          {sinCoincidencias && (
            <Group justify="center" py="lg" gap="sm">
              <Text size="sm" c="dimmed">
                Nada coincide con «{busqueda}».
              </Text>
              <Button variant="subtle" size="compact-sm" onClick={() => setBusqueda('')}>
                Limpiar búsqueda
              </Button>
            </Group>
          )}
        </Table.ScrollContainer>
      )}
    </Box>
  );
}
