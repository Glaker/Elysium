import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Rol = Database['public']['Enums']['rol_usuario'];

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administradora',
  usuario: 'Usuaria',
};

/**
 * Una invitación no tiene columna de estado: se deduce de dos fechas. Guardarla
 * obligaría a un job que marque las vencidas, y una fila que dice "pendiente"
 * cuando ya venció es peor que no tener la columna.
 */
export type EstadoInvitacion = 'pendiente' | 'usada' | 'vencida';

export type Invitacion = {
  id: string;
  email: string | null;
  rol: Rol;
  token: string;
  personaId: string | null;
  persona: string | null;
  creadaEn: string;
  expiraEn: string | null;
  usadaEn: string | null;
  estado: EstadoInvitacion;
};

/** El link que se manda por WhatsApp. Es toda la credencial del alta (§10). */
export const linkDe = (inv: Invitacion) =>
  `${window.location.origin}/invitacion/${inv.token}`;

function estadoDe(usadaEn: string | null, expiraEn: string | null): EstadoInvitacion {
  if (usadaEn) return 'usada';
  if (expiraEn && new Date(expiraEn) < new Date()) return 'vencida';
  return 'pendiente';
}

export async function listarInvitaciones(): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitaciones')
    .select(
      'id, email, rol, token, persona_id, creada_en, expira_en, usada_en, personas (nombre)',
    )
    .order('creada_en', { ascending: false });
  if (error) throw new Error(error.message);

  const filas = data as unknown as {
    id: string;
    email: string | null;
    rol: Rol;
    token: string;
    persona_id: string | null;
    creada_en: string;
    expira_en: string | null;
    usada_en: string | null;
    personas: { nombre: string } | null;
  }[];

  return filas.map((f) => ({
    id: f.id,
    email: f.email,
    rol: f.rol,
    token: f.token,
    personaId: f.persona_id,
    persona: f.personas?.nombre ?? null,
    creadaEn: f.creada_en,
    expiraEn: f.expira_en,
    usadaEn: f.usada_en,
    estado: estadoDe(f.usada_en, f.expira_en),
  }));
}

/**
 * El token lo genera la base (`crear_invitacion`), no el navegador: es la única
 * credencial del alta y no debería depender de qué cliente la pidió.
 */
export async function crearInvitacion(datos: {
  rol: Rol;
  personaId: string | null;
  email: string | null;
  dias: number | null;
}): Promise<Invitacion> {
  const { data, error } = await supabase.rpc('crear_invitacion', {
    p_rol: datos.rol,
    p_persona_id: datos.personaId ?? undefined,
    p_email: datos.email ?? undefined,
    p_dias: datos.dias ?? 0,
  });
  if (error) throw new Error(error.message);

  const inv = data as unknown as {
    id: string;
    email: string | null;
    rol: Rol;
    token: string;
    persona_id: string | null;
    creada_en: string;
    expira_en: string | null;
    usada_en: string | null;
  };

  return {
    id: inv.id,
    email: inv.email,
    rol: inv.rol,
    token: inv.token,
    personaId: inv.persona_id,
    persona: null,
    creadaEn: inv.creada_en,
    expiraEn: inv.expira_en,
    usadaEn: inv.usada_en,
    estado: estadoDe(inv.usada_en, inv.expira_en),
  };
}

/**
 * Revocar es borrar la fila: el link deja de existir. Una invitación ya usada no
 * se borra —es el rastro de cómo entró esa cuenta— y la pantalla no lo ofrece.
 */
export async function revocarInvitacion(id: string) {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
