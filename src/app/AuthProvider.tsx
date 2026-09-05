import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
        .select('id, nombre, es_revendedor, es_productor')
        .eq('perfil_id', uid)
        .maybeSingle(),
    ]);
    setPerfil(p ? { id: p.id, nombre: p.nombre, rol: p.rol as Rol } : null);
    setPersona(
      per
        ? {
            id: per.id,
            nombre: per.nombre,
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
      await cargarPerfil(data.session?.user.id);
      if (vivo) setCargando(false);
    });

    // `cargando` cubre también el perfil: entre que llega la sesión y llega el
    // perfil hay un instante en que el rol se desconoce, y quien mire `perfil`
    // en ese momento (el redirect del login, la ruta protegida) concluiría que
    // la cuenta no está activada.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      setCargando(true);
      void cargarPerfil(s?.user.id).finally(() => {
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
