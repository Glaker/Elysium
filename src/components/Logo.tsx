import { Box } from '@mantine/core';

/**
 * El logo de Elysium.
 *
 * Sale de `public/logo-256.png` y no de un path escrito acá adentro: el
 * original tiene degradados que no tiene sentido mantener duplicados en dos
 * lugares, y así el logo de la app y el de la pestaña no se pueden separar
 * nunca. Cambiar el dibujo es cambiar esos archivos, y nada más.
 *
 * Se sirve el de 256 y se escala: en 18–44px la reducción del navegador se ve
 * mejor que el PNG chico, que ya viene con su propio antialiasing encima.
 */
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <Box
      component="img"
      src="/logo-256.png"
      alt=""
      aria-hidden
      h={size}
      w={size}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}
