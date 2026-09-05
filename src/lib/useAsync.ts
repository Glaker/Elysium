import { useCallback, useEffect, useState } from 'react';

type Resultado<T> = { clave: string; datos: T | null; error: string | null };

/**
 * Ejecuta una promesa y expone carga / error / datos.
 *
 * El estado se escribe solo desde los callbacks de la promesa, nunca en el
 * cuerpo del efecto: `cargando` se deriva de comparar la clave del resultado
 * guardado contra la clave actual de las dependencias. Así no hay renders en
 * cascada y una respuesta vieja no puede pisar a una nueva.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const clave = `${JSON.stringify(deps)}|${tick}`;
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);

  useEffect(() => {
    let vivo = true;
    fn()
      .then((datos) => {
        if (vivo) setResultado({ clave, datos, error: null });
      })
      .catch((e: unknown) => {
        if (vivo)
          setResultado({
            clave,
            datos: null,
            error: e instanceof Error ? e.message : String(e),
          });
      });
    return () => {
      vivo = false;
    };
    // fn se recrea en cada render; la identidad real de la consulta es `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const listo = resultado?.clave === clave;
  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return {
    datos: listo ? resultado.datos : null,
    error: listo ? resultado.error : null,
    cargando: !listo,
    recargar,
  };
}
