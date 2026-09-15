import {
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowsLeftRight,
  IconBoxSeam,
  IconHome,
  IconInbox,
  IconBuildingFactory2,
  IconCalculator,
  IconFlask,
  IconUser,
  IconReceipt2,
  IconPackages,
  IconShoppingCart,
  IconTestPipe,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/app/useAuth';
import { Logo } from '@/components/Logo';
import type { ContextoAdmin } from '@/components/layout/contextoAdmin';
import { ModalCuenta } from '@/features/cuenta/ModalCuenta';
import { contarPendientes } from '@/features/solicitudes/api';
import { useAsync } from '@/lib/useAsync';

type Area = { nombre: string; ruta: string; icono: Icon };
type Grupo = { titulo?: string; areas: Area[] };

/**
 * Las áreas del admin, agrupadas por la cabeza con la que se entra a cada una y
 * no por el orden en que se construyeron.
 *
 * **Producción** es el catálogo y la fábrica: qué existe, con qué se hace y qué
 * salió. **Stock** es cuánto hay de eso, y va justo debajo porque es la misma
 * materia mirada de otra manera — de ahí que repita los dos nombres, insumos y
 * productos: son las dos mitades del stock, cada una con su unidad y su libro.
 * Los pedidos van ahí abajo y no en caja: lo que se pide es mercadería, y se
 * responde mirando lo que hay —todavía no es una venta.
 * **Caja** es todo lo que mueve plata, y por eso ventas encabeza el grupo: es de
 * donde sale, y gastos y deudores son sus dos consecuencias. Al final el padrón,
 * que se abre cuando entra alguien nuevo, no a diario.
 */
const GRUPOS: Grupo[] = [
  { areas: [{ nombre: 'Inicio', ruta: '/admin', icono: IconHome }] },
  {
    titulo: 'Producción',
    areas: [
      { nombre: 'Insumos', ruta: '/admin/insumos', icono: IconFlask },
      { nombre: 'Productos', ruta: '/admin/productos', icono: IconBoxSeam },
      { nombre: 'Lotes', ruta: '/admin/lotes', icono: IconBuildingFactory2 },
    ],
  },
  {
    titulo: 'Stock',
    areas: [
      { nombre: 'Insumos', ruta: '/admin/stock/insumos', icono: IconTestPipe },
      { nombre: 'Productos', ruta: '/admin/stock/productos', icono: IconPackages },
      { nombre: 'Pedidos', ruta: '/admin/stock/pedidos', icono: IconInbox },
    ],
  },
  {
    titulo: 'Caja',
    areas: [
      { nombre: 'Ventas', ruta: '/admin/ventas', icono: IconShoppingCart },
      { nombre: 'Gastos', ruta: '/admin/gastos', icono: IconReceipt2 },
      { nombre: 'Deudores', ruta: '/admin/deudores', icono: IconUsersGroup },
      { nombre: 'Simulador', ruta: '/admin/simulador', icono: IconCalculator },
    ],
  },
  {
    titulo: 'Usuarios',
    areas: [{ nombre: 'Personas', ruta: '/admin/personas', icono: IconUsers }],
  },
];

/**
 * El shell del admin. Es lo opuesto al front del usuario normal: escritorio,
 * sesiones largas, densidad sobre aire. La barra lateral es fija y colapsa a
 * íconos en pantallas angostas — que no se rompa en tablet alcanza, no es
 * mobile-first.
 *
 * El tinte violeta de la barra es la única aparición de la identidad en la UI.
 * Ninguna acción es violeta.
 */
export function AdminLayout() {
  const { perfil } = useAuth();
  const { pathname } = useLocation();
  const [cuenta, setCuenta] = useState(false);
  const angosta = useMediaQuery('(max-width: 1080px)');
  const ancho = angosta ? 64 : 236;

  // Los pedidos entran solos, desde el teléfono de otra persona: si la barra no
  // los cuenta, la bandeja es una pantalla que hay que acordarse de abrir.
  // Ámbar y no el color de acción: es algo que espera respuesta, no un botón.
  const pendientes = useAsync(contarPendientes, []);
  const sinResponder = pendientes.datos ?? 0;

  return (
    <AppShell
      header={{ height: 54 }}
      navbar={{ width: ancho, breakpoint: 0 }}
      padding="lg"
      // Menos aire arriba: el logo ya está separado de lo de abajo por la línea
      // del encabezado. El offset del header NO se toca —es lo que corre el
      // contenido debajo de una barra fija— y solo se achica el padding que se
      // le suma.
      styles={{
        main: {
          paddingTop:
            'calc(var(--app-shell-header-offset, 0rem) + var(--mantine-spacing-md))',
        },
      }}
    >
      <AppShell.Header withBorder bg="noche.9">
        <Group h="100%" pr="md" justify="space-between" wrap="nowrap">
          {/*
            La marca ocupa exactamente la columna de la barra lateral: el logo y
            el nombre terminan donde termina la barra, y la línea vertical de la
            barra sigue hacia arriba sin cortar nada por la mitad. Colapsada a
            íconos entra solo el logo, centrado en sus 64px.
          */}
          <Group
            w={ancho}
            h="100%"
            px={angosta ? 0 : 'md'}
            gap={10}
            wrap="nowrap"
            justify={angosta ? 'center' : 'flex-start'}
            style={{
              flexShrink: 0,
              borderRight: '1px solid var(--app-shell-border-color)',
            }}
          >
            <Logo size={36} />
            {!angosta && (
              <Text fw={800} fz={27} lh={1} style={{ letterSpacing: 1 }}>
                ELYSIUM
              </Text>
            )}
          </Group>

          {/*
            Qué app es esto va después de esa línea, del lado del contenido y no
            pegado al nombre: no es parte de la marca, es dónde está parado el
            que mira. En el rótulo de la barra, que es el mismo tono de voz que
            los de los grupos.
          */}
          <Text
            fz={12}
            fw={700}
            c="dimmed"
            tt="uppercase"
            pl="lg"
            style={{ letterSpacing: '0.09em' }}
          >
            Administración
          </Text>

          <Box style={{ flexGrow: 1 }} />
          {/*
            Los dos controles de la derecha son los mismos que en la app del
            usuario y dicen lo mismo: a qué vista se cambia, y de quién es la
            sesión. Salir ya no vive acá —está adentro de Mi cuenta— porque un
            botón de apagado pegado al nombre es un click de distancia entre
            mirar el padrón y quedarse afuera.
          */}
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Cambiar a la vista de usuario">
              <Button
                component={RouterLink}
                to="/"
                variant="default"
                size="compact-sm"
                radius="xl"
                leftSection={<IconArrowsLeftRight size={15} />}
              >
                Vista usuario
              </Button>
            </Tooltip>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              radius="xl"
              leftSection={<IconUser size={15} />}
              onClick={() => setCuenta(true)}
            >
              {perfil?.nombre ?? 'Mi cuenta'}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        withBorder
        className="nav-admin"
        p={angosta ? 4 : 'xs'}
        pt={angosta ? 4 : 6}
      >
        <ScrollArea>
          <Stack gap={2}>
            {GRUPOS.map((g, gi) => (
              <Box key={g.titulo ?? 'inicio'} mt={gi === 0 ? 0 : 10}>
                {/*
                  El rótulo con su línea separa los grupos sin dibujar cajas: es
                  el mismo recurso que usa el resto del admin —un filete y un
                  texto chico en mayúsculas— y no suma un borde más a una barra
                  que ya tiene el suyo. Colapsada a íconos no hay lugar para el
                  rótulo, así que queda solo la línea.
                */}
                {g.titulo &&
                  (angosta ? (
                    <Box
                      mx={6}
                      mb={6}
                      style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}
                    />
                  ) : (
                    <Text
                      px={8}
                      pb={5}
                      mb={4}
                      fz={11}
                      fw={700}
                      c="dimmed"
                      tt="uppercase"
                      style={{
                        letterSpacing: '0.09em',
                        borderBottom: '1px solid var(--mantine-color-dark-4)',
                      }}
                    >
                      {g.titulo}
                    </Text>
                  ))}

                <Stack gap={2}>
                  {g.areas.map((a) => {
                    // Dos excepciones al `startsWith`: Inicio es la raíz del
                    // admin y estaría activa en todas las pantallas, y las
                    // subsecciones compartidas del stock —movimientos,
                    // ubicaciones, recuentos— cuelgan de productos, que es
                    // desde donde se entra a las tres.
                    const activa =
                      a.ruta === '/admin'
                        ? pathname === '/admin'
                        : a.ruta === '/admin/stock/productos'
                          ? pathname.startsWith('/admin/stock') &&
                            !pathname.startsWith('/admin/stock/insumos') &&
                            !pathname.startsWith('/admin/stock/pedidos')
                          : pathname.startsWith(a.ruta);
                    const icono = <a.icono size={20} stroke={1.6} />;
                    const marca = a.ruta === '/admin/stock/pedidos' ? sinResponder : 0;

                    const comunes = {
                      active: activa,
                      // El `active` de Mantine pinta con `data-active`, pero su
                      // CSS trata `aria-current="page"` como lo mismo. El
                      // `NavLink` de react-router lo pone solo, y por prefijo:
                      // con `/admin` eso significa "activo en todas las
                      // pantallas del admin", que es justo lo que este cálculo
                      // evita. Por eso el link es un `Link` pelado y la marca de
                      // página la ponemos nosotros, con la misma regla.
                      'aria-current': activa ? ('page' as const) : undefined,
                      color: 'violeta',
                      variant: 'light',
                      label: angosta ? undefined : a.nombre,
                      leftSection: icono,
                      rightSection:
                        marca > 0 && !angosta ? (
                          <Badge
                            size="sm"
                            variant="light"
                            color="advertencia"
                            radius="sm"
                          >
                            {marca}
                          </Badge>
                        ) : undefined,
                      py: 9,
                      styles: {
                        root: { borderRadius: 'var(--mantine-radius-sm)' },
                        label: { fontSize: 15 },
                        section: angosta ? { marginInlineEnd: 0 } : undefined,
                      },
                    } as const;

                    const item = (
                      <NavLink
                        key={a.ruta}
                        component={RouterLink}
                        to={a.ruta}
                        {...comunes}
                      />
                    );

                    // Colapsada a íconos, el nombre solo existe en el tooltip.
                    return angosta ? (
                      <Tooltip
                        key={a.ruta}
                        label={
                          marca > 0 ? `${a.nombre} · ${marca} sin responder` : a.nombre
                        }
                        position="right"
                      >
                        <Box>{item}</Box>
                      </Tooltip>
                    ) : (
                      item
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet
          context={{ refrescarPendientes: pendientes.recargar } satisfies ContextoAdmin}
        />
        {cuenta && <ModalCuenta onClose={() => setCuenta(false)} tema="admin" />}
      </AppShell.Main>
    </AppShell>
  );
}
