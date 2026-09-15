import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * Sistema de diseño de Elysium. La documentación de uso vive en `docs/DISENIO.md`.
 *
 * Reglas que este archivo hace cumplir:
 *
 *  - **Cian es el único color de acción.** Botones primarios, enlaces y foco.
 *    Sobre fondo oscuro contrasta mejor que el violeta y no se confunde con
 *    ninguno de los tres estados semánticos.
 *  - **Violeta es identidad, nunca acción.** Vive en la barra lateral y en los
 *    fondos de selección (`noche`), no en un botón.
 *  - **Tres estados semánticos y nada más lleva color:** `advertencia`, `error`,
 *    `exito`. Están acá con nombre propio para que ninguna pantalla escriba
 *    `color="yellow"` y el significado quede en el color en vez de en el nombre.
 *  - **Todo número es tabular.** Ver `tabularNums` en Table y la regla global de
 *    `index.css` para inputs.
 */

/** Cian de acción. Bajado de saturación: Johanna pasa horas en esta pantalla. */
const cian: MantineColorsTuple = [
  '#e0fbff',
  '#cbf2ff',
  '#9ae3ff',
  '#64d4fb',
  '#3ac7f8',
  '#22bff7',
  '#06bbf8',
  '#00a5de',
  '#0093c7',
  '#0080b0',
];

/** Violeta de identidad. Del logo. No se usa en acciones. */
const violeta: MantineColorsTuple = [
  '#f2effa',
  '#dfd9ec',
  '#bcb1d7',
  '#9887c3',
  '#7a64b2',
  '#674da8',
  '#5d42a5',
  '#4d3491',
  '#442d82',
  '#3a2573',
];

/**
 * El gris de toda la app: negro con un tinte violeta muy desaturado.
 *
 * **Es la escala `dark` de Mantine**, no una paleta más (ver `colors` abajo).
 * Antes convivían dos grises —el neutro de Mantine para el fondo y este para
 * las superficies— y el resultado era una pantalla sucia y, sobre todo, con la
 * jerarquía al revés: las tarjetas (`noche[8]`) quedaban **más oscuras** que el
 * fondo (`dark[7]`, #242424), así que se hundían en vez de levantarse.
 *
 * Los índices siguen la convención de Mantine, y el orden es el que importa:
 *
 *  - `[7]` es el fondo de la pantalla (`--mantine-color-body`).
 *  - `[6]` es una superficie **arriba** del fondo: `Paper`, inputs, hover.
 *  - `[5]` es la superficie alta: fila seleccionada, dropdown sobre superficie.
 *  - `[4]` son los bordes (`--mantine-color-default-border`).
 *  - `[8]`/`[9]` van para abajo: son el chrome —barra lateral y encabezado—,
 *    que se hunde a propósito para que el contenido sea lo que flota.
 *  - `[2]` es el texto secundario (`dimmed`) y `[0]` el texto principal.
 */
const noche: MantineColorsTuple = [
  '#f1eff7',
  '#cecad9',
  '#a8a3b7',
  '#847e93',
  '#474155',
  '#332e3f',
  '#272231',
  '#1d1a26',
  '#17141e',
  '#110f18',
];

/** Ámbar: costo incompleto, precio vencido, fórmula que no suma 100. */
const advertencia: MantineColorsTuple = [
  '#fff8e1',
  '#ffefcc',
  '#ffdd9b',
  '#ffca64',
  '#ffba38',
  '#ffb01b',
  '#ffab09',
  '#e39500',
  '#ca8400',
  '#af7100',
];

/** Rojo: stock negativo, ciclo en la composición. */
const error: MantineColorsTuple = [
  '#ffe9e9',
  '#ffd1d1',
  '#fba0a1',
  '#f76d6d',
  '#f34141',
  '#f22625',
  '#f21616',
  '#d8070b',
  '#c10008',
  '#a90003',
];

/** Verde: solo confirmaciones puntuales de acción. Nunca un estado permanente. */
const exito: MantineColorsTuple = [
  '#e5fcf1',
  '#d2f5e5',
  '#a7e9cb',
  '#79dcaf',
  '#53d198',
  '#3bcb89',
  '#2bc880',
  '#1bb06d',
  '#0a9d5f',
  '#00874f',
];

export const theme = createTheme({
  primaryColor: 'cian',
  primaryShade: { light: 6, dark: 4 },

  /**
   * Quien pidió menos movimiento en su sistema no ve ninguno: las transiciones
   * de Mantine —el Collapse del formulario de inicio, entre otras— pasan a durar
   * cero, igual que las animaciones nuestras de `index.css`.
   */
  respectReducedMotion: true,

  /**
   * Texto oscuro sobre los rellenos claros.
   *
   * El cian de acción es un color claro: blanco encima daba 1,9:1 —ilegible por
   * norma y, sobre todo, un botón que se lee peor que el texto gris que tiene al
   * lado—. Con `autoContrast` Mantine mide la luminancia del relleno y elige; el
   * umbral 0.3 es el que deja el cian con texto oscuro y cualquier relleno
   * oscuro con texto claro.
   *
   * Y el "negro" del sistema no es negro: es el escalón más oscuro de `noche`,
   * para que el texto de un botón cian no sea el único punto de tinta pura de la
   * app. Sobre `cian.4` da 9,4:1.
   */
  autoContrast: true,
  luminanceThreshold: 0.3,
  black: '#110f18',
  // `dark: noche` es lo que hace que el gris de Mantine y el de la app sean
  // el mismo: fondo, inputs, bordes, menús y `dimmed` salen todos de acá.
  colors: { cian, violeta, noche, dark: noche, advertencia, error, exito },

  defaultRadius: 'sm',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, "JetBrains Mono", Consolas, monospace',
  headings: { fontWeight: '600' },

  /**
   * Densidades del admin. Son datos del theme y no números sueltos en las
   * pantallas porque la decisión "qué tan compacto" es del sistema, no de cada
   * tabla.
   */
  other: {
    /** Alto de la barra superior del admin. Es el offset del encabezado fijo. */
    altoHeader: 54,
    /** Ancho de la barra lateral abierta / colapsada a íconos. */
    anchoNav: 236,
    anchoNavColapsada: 64,
    /** Padding vertical de una celda de tabla compacta. */
    filaCompacta: 5,
  },

  components: {
    Table: {
      defaultProps: {
        // Sin bordes verticales, separadores horizontales tenues, hover sutil.
        withColumnBorders: false,
        withRowBorders: true,
        highlightOnHover: true,
        horizontalSpacing: 'sm',
        verticalSpacing: 6,
        // La regla más importante del sistema: toda cifra en tabular.
        tabularNums: true,
        borderColor: 'noche.5',
        highlightOnHoverColor: 'noche.6',
      },
    },
    // Densidad compacta por defecto en todo lo que se carga a mano.
    TextInput: { defaultProps: { size: 'sm' } },
    Textarea: { defaultProps: { size: 'sm' } },
    NumberInput: { defaultProps: { size: 'sm' } },
    Select: { defaultProps: { size: 'sm' } },
    Switch: { defaultProps: { size: 'sm' } },
    Button: { defaultProps: { size: 'sm' } },
    ActionIcon: { defaultProps: { size: 'md' } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 250 } },
    Modal: { defaultProps: { centered: true, radius: 'sm' } },
    Anchor: { defaultProps: { underline: 'hover' } },
  },
});
