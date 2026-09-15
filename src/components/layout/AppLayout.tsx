import {
  ActionIcon,
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
  IconBoxSeam,
  IconFlask,
  IconHome,
  IconLayoutGrid,
  IconPower,
  type Icon,
} from '@tabler/icons-react';
import {
  Link,
  NavLink as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router';

import { useAuth } from '@/app/useAuth';
import { BandaDeuda } from '@/components/BandaDeuda';
import { cargarDeuda } from '@/components/deuda';
import { Logo } from '@/components/Logo';
import { PantallaCarga } from '@/components/PantallaCarga';
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
  const { perfil, persona, salir } = useAuth();
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
    : pathname.startsWith('/productos')
      ? '/productos'
      : '/';

  // Quien no fabrica lotes no tiene por qué ver la receta (§10): sin la pestaña,
  // materia prima no existe para esa cuenta. La puerta que cuenta está en la
  // base — acá solo se evita ofrecer algo que va a ser rechazado.
  const catalogo =
    perfil?.rol === 'admin' || persona?.esProductor
      ? [PRODUCTOS, MATERIA_PRIMA]
      : [PRODUCTOS];
  const secciones = [INICIO, ...catalogo];

  if (deuda.cargando) return <PantallaCarga />;

  const marca = (
    <Group gap={10} wrap="nowrap">
      <Logo size={24} />
      <Text className="display" fz={19} fw={800} style={{ letterSpacing: '0.14em' }}>
        ELYSIUM
      </Text>
    </Group>
  );

  const acciones = (
    <Group gap="sm" wrap="nowrap">
      {/*
        Un admin entra por acá igual que cualquiera: esta es la pantalla de su
        cuenta. Sin este atajo tendría que escribir /admin a mano para llegar al
        panel, que es la clase de cosa que se sabe una vez y se olvida. Para un
        usuario normal no existe.
      */}
      {perfil?.rol === 'admin' && (
        <Tooltip label="Ir a administración">
          <ActionIcon
            component={Link}
            to="/admin"
            variant="subtle"
            color="violeta"
            aria-label="Ir a administración"
          >
            <IconLayoutGrid size={19} />
          </ActionIcon>
        </Tooltip>
      )}
      <Text fz={14} c="var(--ely-texto-2)" visibleFrom="xs">
        {perfil?.nombre}
      </Text>
      <Tooltip label="Salir">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Salir"
          onClick={() => void salir()}
        >
          <IconPower size={19} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  const item = (s: Seccion) => (
    <NavLink
      key={s.valor}
      component={RouterLink}
      to={s.valor}
      active={s.valor === seccion}
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
    </Box>
  );
}
