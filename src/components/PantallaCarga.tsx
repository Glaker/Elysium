import { Box } from '@mantine/core';

import { Logo } from '@/components/Logo';

/**
 * El arranque de la app: sesión, perfil, persona y deuda.
 *
 * Existe porque sin ella el arranque se ve como tres saltos — un spinner gris,
 * después el shell vacío, después el contenido acomodándose. Es una sola cosa
 * que pasa, así que se muestra como una sola cosa.
 *
 * **Aparece recién a los 150ms** (`animation-delay`). Si los datos llegan antes
 * —que es lo normal con la sesión ya en el navegador— nunca se ve: un splash
 * que parpadea 80ms y se va molesta más que el salto que vino a evitar.
 *
 * No lleva spinner ni texto. La marca latiendo alcanza para decir "esperá", y
 * un "Cargando…" que se ve medio segundo no lo lee nadie.
 */
export function PantallaCarga() {
  return (
    <Box
      className="pantalla-carga"
      mih="100dvh"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#17141f',
      }}
    >
      <Logo size={44} />
    </Box>
  );
}
