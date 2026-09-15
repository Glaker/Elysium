import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';

export type Rol = 'admin' | 'usuario';
export type Perfil = { id: string; nombre: string | null; rol: Rol };
export type Persona = {
  id: string;
  /** El nombre completo: es el que se muestra. */
  nombre: string;
  /** De pila y apellido por separado, que es como se editan en Mi cuenta. */
  nombrePila: string;
  apellido: string | null;
  telefono: string | null;
  esRevendedor: boolean;
  esProductor: boolean;
};

export type AuthCtxValor = {
  session: Session | null;
  perfil: Perfil | null;
  persona: Persona | null;
  cargando: boolean;
  refrescarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
};

/** El contexto vive en su propio archivo para no romper Fast Refresh. */
export const AuthCtx = createContext<AuthCtxValor | null>(null);
