import {
  AppShell,
  Box,
  Container,
  Group,
  NavLink,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowsLeftRight,
  IconBoxSeam,
  IconBuildingFactory2,
  IconFlask,
  IconHome,
  IconUser,
  type Icon,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { BandaDeuda } from '@/components/BandaDeuda';
import { cargarDeuda } from '@/components/deuda';
import { Logo } from '@/components/Logo';
import { PantallaCarga } from '@/components/PantallaCarga';
import { ModalCuenta } from '@/features/cuenta/ModalCuenta';
import { useAsync } from '@/lib/useAsync';

type Seccion = { valor: string; texto: string; icono: Icon };

const INICIO: Seccion = { valor: '/', texto: 'Inicio', icono: IconHome };
const PRODUCTOS: Seccion = {
  valor: '/productos',
  texto: 'Productos',
  icono: IconBoxSeam,
};
const MATERIA_PRIMA: Seccion = {
  valor: '/materia-prima',
  texto: 'Materia prima',
  icono: IconFlask,
};
const PRODUCCION: Seccion = {
  valor: '/produccion',
  texto: 'Producción',
  icono: IconBuildingFactory2,
};

/**
 * Mobile-first, pero no mobile-only: abajo de 992px es la columna angosta de
 * siempre —encabezado, deuda, dos subrayados— y arriba de ese ancho es un shell
 * con barra lateral, como el admin. Un menú de dos ítems centrado en una
 * columna de 520px en un monitor de 27" se ve como un teléfono agrandado; la
 * barra usa el espacio que ya está y deja la navegación siempre a la vista.
 *
 * Las dos formas comparten todo lo que importa: las mismas secciones, el mismo
 * encabezado y la misma banda de deuda arriba de todo.
 *
 * El sistema visual está en `docs/DISENIO-USUARIO.md`: fondo negro violáceo, un
 * solo halo de luz detrás del encabezado, cian para la acción y el violeta del
 * logo solo como identidad. La clase `usuario` es la que activa todo eso — el
 * admin cuelga de otro shell y no la toca.
 */
export function AppLayout() {
  const { perfil, persona } = useAuth();
  const [cuenta, setCuenta] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Sin `getInitialValueInEffect` el primer render en pc sería el layout de
  // teléfono y la pantalla saltaría de una forma a la otra a la vista de todos.
  const escritorio = useMediaQuery('(min-width: 992px)', false, {
    getInitialValueInEffect: false,
  });

  // La deuda se pide acá y no dentro de la banda: es parte del arranque, y si
  // llegara después, aparecería arriba de todo y empujaría la pantalla entera
  // hacia abajo justo cuando la persona empezó a leerla.
  const deuda = useAsync(() => cargarDeuda(persona?.id), [persona?.id]);
  const seccion = pathname.startsWith('/materia-prima')
    ? '/materia-prima'
    : pathname.startsWith('/produccion')
      ? '/produccion'
      : pathname.startsWith('/productos')
        ? '/productos'
        : '/';

  // Quien no fabrica lotes no tiene por qué ver la receta (§10): sin la pestaña,
  // materia prima no existe para esa cuenta. La puerta que cuenta está en la
  // base — acá solo se evita ofrecer algo que va a ser rechazado.
  const catalogo =
    perfil?.rol === 'admin' || persona?.esProductor
      ? [PRODUCTOS, MATERIA_PRIMA, PRODUCCION]
      : [PRODUCTOS];
  const secciones = [INICIO, ...catalogo];

  if (deuda.cargando) return <PantallaCarga />;

  const modalCuenta = cuenta && <ModalCuenta onClose={() => setCuenta(false)} />;

  const marca = (
    <Group gap={10} wrap="nowrap">
      <Logo size={24} />
      <Text className="display" fz={19} fw={800} style={{ letterSpacing: '0.14em' }}>
        ELYSIUM
      </Text>
    </Group>
  );

  const acciones = (
    <Group gap={8} wrap="nowrap">
      {/*
        Cambiar de vista es ir y volver entre dos formas de la misma app, no
        entrar a otra pantalla: por eso las dos flechas cruzadas y el mismo
        control acá y en el encabezado del admin, con el nombre del lado al que
        se va. Para un usuario normal no existe.
      */}
      {perfil?.rol === 'admin' && (
        <Tooltip label="Cambiar a la vista de administración">
          <UnstyledButton
            component={Link}
            to="/admin"
            className="chip-encabezado"
            aria-label="Cambiar a la vista de administración"
          >
            <IconArrowsLeftRight size={16} stroke={1.7} />
            <Text fz={13} fw={500} visibleFrom="xs">
              Administración
            </Text>
          </UnstyledButton>
        </Tooltip>
      )}

      {/*
        El nombre es el botón. Antes era un texto al lado de un ícono de apagado
        —y lo único que se podía hacer con la cuenta era perderla de un click
        mal dado. Ahora abre Mi cuenta, y ahí adentro está también la salida.
      */}
      <UnstyledButton
        className="chip-encabezado"
        onClick={() => setCuenta(true)}
        aria-label="Mi cuenta"
      >
        <IconUser size={17} stroke={1.7} />
        <Text fz={13} fw={500} visibleFrom="xs">
          {perfil?.nombre ?? 'Mi cuenta'}
        </Text>
      </UnstyledButton>
    </Group>
  );

  const item = (s: Seccion) => (
    <NavLink
      key={s.valor}
      component={RouterLink}
      to={s.valor}
      active={s.valor === seccion}
      // Un `Link` pelado y la marca de página puesta a mano: el `NavLink` de
      // react-router pone `aria-current` por prefijo, y Mantine lo pinta como
      // activo —con `/` eso es "Inicio activo en todas las pantallas".
      aria-current={s.valor === seccion ? 'page' : undefined}
      color="cian"
      variant="light"
      label={s.texto}
      leftSection={<s.icono size={19} stroke={1.6} />}
      py={9}
      styles={{
        root: { borderRadius: 'var(--mantine-radius-md)' },
        label: { fontSize: 15 },
      }}
    />
  );

  if (escritorio) {
    return (
      <>
        <AppShell
          className="usuario"
          header={{ height: 64 }}
          navbar={{ width: 236, breakpoint: 0 }}
          padding="xl"
          styles={{
            header: {
              background: 'var(--ely-fondo)',
              borderColor: 'var(--ely-borde-tenue)',
            },
            navbar: {
              background: 'var(--ely-superficie)',
              borderColor: 'var(--ely-borde-tenue)',
            },
            main: { background: 'var(--ely-fondo)' },
          }}
        >
          <AppShell.Header>
            <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
              {marca}
              {acciones}
            </Group>
          </AppShell.Header>

          <AppShell.Navbar p="sm" style={{ overflow: 'hidden' }}>
            {/* El mismo foco de luz que en el teléfono cae detrás del encabezado. */}
            <Box className="halo" top={-230} left={-110} w={340} h={340} />
            <Stack gap={4} style={{ position: 'relative' }}>
              {item(INICIO)}
              {/*
              El rótulo con su línea agrupa lo que se mira seguido y separa el
              inicio, que es de donde se sale. Es el mismo recurso que la barra
              del admin, con la tipografía de acá.
            */}
              <Text
                className="rotulo"
                px={8}
                pt={14}
                pb={5}
                mb={2}
                style={{ borderBottom: '1px solid var(--ely-borde-tenue)' }}
              >
                Tu catálogo
              </Text>
              {catalogo.map(item)}
            </Stack>
          </AppShell.Navbar>

          <AppShell.Main>
            <Container size={700} px={0}>
              {(deuda.datos?.total ?? 0) > 0 && (
                <Box mb="lg">
                  <BandaDeuda deuda={deuda.datos} />
                </Box>
              )}
              <Outlet />
            </Container>
          </AppShell.Main>
        </AppShell>
        {modalCuenta}
      </>
    );
  }

  return (
    <Box
      className="usuario"
      mih="100dvh"
      style={{ position: 'relative', overflowX: 'clip' }}
    >
      {/*
        El halo cuelga del contenedor y no de la ventana: así en un teléfono cae
        detrás del encabezado y en una pantalla ancha sigue al contenido en vez
        de quedar abandonado en la esquina.
      */}
      <Box component="header">
        <Container size={520} px="md" py={18} style={{ position: 'relative' }}>
          <Box className="halo" top={-190} left={-120} w={360} h={360} />
          <Group justify="space-between" wrap="nowrap">
            {marca}
            {acciones}
          </Group>
        </Container>
      </Box>

      <Container size={520} px="md" pt={4} style={{ position: 'relative' }}>
        <BandaDeuda deuda={deuda.datos} />
      </Container>

      {/*
        Dos subrayados y no un SegmentedControl: son dos vistas de lo mismo, no
        un control con un valor elegido, y la pastilla gris competía con el
        único botón que importa en cada fila.
      */}
      <Box style={{ borderBottom: '1px solid var(--ely-borde-tenue)' }}>
        <Container size={520} px="md">
          <Group gap={22} wrap="nowrap" pt={18}>
            {secciones.map((s) => {
              const activa = s.valor === seccion;
              return (
                <UnstyledButton
                  key={s.valor}
                  onClick={() => navigate(s.valor)}
                  pb={10}
                  style={{
                    borderBottom: `2px solid ${
                      activa ? 'var(--mantine-color-cian-4)' : 'transparent'
                    }`,
                    marginBottom: -1,
                  }}
                >
                  <Text
                    fz={14}
                    fw={activa ? 600 : 500}
                    c={activa ? 'var(--ely-texto)' : 'var(--ely-texto-2)'}
                  >
                    {s.texto}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Container>
      </Box>

      <Container size={520} px="md" py="lg">
        <Outlet />
      </Container>

      {modalCuenta}
    </Box>
  );
}
