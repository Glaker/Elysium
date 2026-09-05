import { useCallback, useState } from 'react';

export type Errores<V> = Partial<Record<keyof V, string>>;

/**
 * Estado de un formulario del admin.
 *
 * La decisión que este hook hace cumplir es **cuándo se muestra un error**:
 * al salir del campo o al intentar guardar, nunca mientras se tipea. Los
 * validadores corren siempre (para saber si el formulario está válido), pero
 * el error de un campo solo se hace visible cuando ese campo ya se tocó.
 */
export function useFormulario<V extends object>(
  inicial: V,
  validar?: (valores: V) => Errores<V>,
) {
  const [valores, setValores] = useState<V>(inicial);
  const [base, setBase] = useState<V>(inicial);
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  // Los validadores corren en cada render y no en un memo: son funciones puras
  // y baratas sobre un objeto chico, y memoizarlas obliga a estabilizar la
  // identidad del validador en cada pantalla para nada.
  const errores: Errores<V> = validar?.(valores) ?? {};

  const set = useCallback(<K extends keyof V>(campo: K, valor: V[K]) => {
    setValores((v) => ({ ...v, [campo]: valor }));
  }, []);

  const tocar = useCallback((campo: keyof V) => {
    setTocados((t) => new Set(t).add(String(campo)));
  }, []);

  /** Reemplaza valores y base: lo que se acaba de cargar o de guardar. */
  const reiniciar = useCallback((v: V) => {
    setValores(v);
    setBase(v);
    setTocados(new Set());
    setIntentoGuardar(false);
  }, []);

  const errorDe = (campo: keyof V) =>
    tocados.has(String(campo)) || intentoGuardar ? errores[campo] : undefined;

  /** Props comunes a cualquier campo: error visible y validación al salir. */
  const campo = (c: keyof V) => ({
    error: errorDe(c),
    onBlur: () => tocar(c),
  });

  /** Props de un campo de texto, incluido el onChange. */
  const texto = (c: keyof V) => ({
    ...campo(c),
    value: (valores[c] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(c, e.currentTarget.value as V[typeof c]),
  });

  const valido = Object.values(errores).every((e) => !e);
  const sucio = JSON.stringify(valores) !== JSON.stringify(base);

  /** Se llama al enviar: marca el intento y responde si se puede guardar. */
  const intentar = () => {
    setIntentoGuardar(true);
    return valido;
  };

  return {
    valores,
    set,
    campo,
    texto,
    tocar,
    errores,
    valido,
    sucio,
    intentar,
    reiniciar,
  };
}
