import { createTheme } from '@mantine/core';

/**
 * Theme base de la app. Todo lo que no se define acá cae en los defaults de
 * Mantine, así que conviene ir agregando tokens a medida que aparezcan, en vez
 * de copiar el theme entero.
 */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontWeight: '600',
  },
});
