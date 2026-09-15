import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AuthCtx,
  type AuthCtxValor,
  type Perfil,
  type Persona,
  type Rol,
} from '@/app/authContext';
import { supabase } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [cargando, setCargando] = useState(true);
  // Qué usuario tenemos cargado ahora mismo, para distinguir un cambio real de
  // sesión de los avisos que Supabase repite por cada refresco de token.
  const uidActual = useRef<string | undefined>(undefined);

  const cargarPerfil = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setPerfil(null);
      setPersona(null);
      return;
    }
    // Las dos consultas pasan por RLS: cada uno lee solo su propia fila.
    const [{ data: p }, { data: per }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, rol').eq('id', uid).maybeSingle(),
      supabase
        .from('personas')
        .select(
          'id, nombre, apellido, nombre_completo, telefono, es_revendedor, es_productor',
        )
        .eq('perfil_id', uid)
        .maybeSingle(),
    ]);
    setPerfil(p ? { id: p.id, nombre: p.nombre, rol: p.rol as Rol } : null);
    setPersona(
      per
        ? {
            id: per.id,
            nombre: per.nombre_completo ?? '',
            nombrePila: per.nombre,
            apellido: per.apellido,
            telefono: per.telefono,
            esRevendedor: per.es_revendedor,
            esProductor: per.es_productor,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    let vivo = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      uidActual.current = data.session?.user.id;
      await cargarPerfil(data.session?.user.id);
      if (vivo) setCargando(false);
    });

    // `cargando` cubre también el perfil: entre que llega la sesión y llega el
    // perfil hay un instante en que el rol se desconoce, y quien mire `perfil`
    // en ese momento (el redirect del login, la ruta protegida) concluiría que
    // la cuenta no está activada.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      // Al volver a la pestaña, Supabase reemite SIGNED_IN / TOKEN_REFRESHED con
      // el mismo usuario. Si volviéramos a poner `cargando`, la ruta protegida
      // mostraría la pantalla de carga y desmontaría la página entera, que es lo
      // que se veía como una recarga al cambiar de pestaña.
      const uid = s?.user.id;
      if (uid === uidActual.current) return;
      uidActual.current = uid;
      setCargando(true);
      void cargarPerfil(uid).finally(() => {
        if (vivo) setCargando(false);
      });
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  const valor = useMemo<AuthCtxValor>(
    () => ({
      session,
      perfil,
      persona,
      cargando,
      refrescarPerfil: () => cargarPerfil(session?.user.id),
      salir: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, perfil, persona, cargando, cargarPerfil],
  );

  return <AuthCtx value={valor}>{children}</AuthCtx>;
}
