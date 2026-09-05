import { use } from 'react';

import { AuthCtx, type Rol } from '@/app/authContext';

/** Sesión, perfil y persona del usuario logueado. */
export function useAuth() {
  const ctx = use(AuthCtx);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}

/** Rol del usuario logueado. null mientras carga o si todavía no tiene perfil. */
export function useRol(): Rol | null {
  return useAuth().perfil?.rol ?? null;
}
