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
 * Los fondos de la app: negros con un tinte violeta muy desaturado.
 * `noche[8]`/`noche[9]` son la barra lateral; `noche[6]` es el fondo de una fila
 * seleccionada. El resto de la UI corre sobre la escala `dark` neutra de Mantine.
 */
const noche: MantineColorsTuple = [
  '#c9c6d2',
  '#a5a1b2',
  '#807b92',
  '#5f5a70',
  '#464253',
  '#332f3e',
  '#2a2733',
  '#1f1d27',
  '#16141d',
  '#100e16',
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
  colors: { cian, violeta, noche, advertencia, error, exito },

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
    altoHeader: 48,
    /** Ancho de la barra lateral abierta / colapsada a íconos. */
    anchoNav: 200,
    anchoNavColapsada: 56,
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
        borderColor: 'dark.6',
        highlightOnHoverColor: 'noche.7',
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
