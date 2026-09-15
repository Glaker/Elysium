import { useOutletContext } from 'react-router';

/**
 * Lo que el shell del admin le presta a sus pantallas.
 *
 * Existe por una sola cosa: la marca de pedidos pendientes vive en la barra
 * lateral, y quien los resuelve es la pantalla de pedidos. Sin este canal la
 * barra seguiría diciendo "3" después de haberlos atendido. Va por el contexto
 * del Outlet y no por un estado global porque es exactamente una relación de
 * padre a hijo.
 */
export type ContextoAdmin = {
  refrescarPendientes: () => void;
};

export const useContextoAdmin = () => useOutletContext<ContextoAdmin>();
