import { createBrowserRouter, Navigate } from 'react-router';

import { RutaProtegida } from '@/components/RutaProtegida';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { InsumoFormPage } from '@/features/insumos/InsumoFormPage';
import { InsumoPage } from '@/features/insumos/InsumoPage';
import { InsumosPage } from '@/features/insumos/InsumosPage';
import { ProveedoresPage } from '@/features/insumos/ProveedoresPage';
import { InvitacionPage } from '@/pages/InvitacionPage';
import { LoginPage } from '@/pages/LoginPage';
import { MateriaPrimaPage } from '@/pages/MateriaPrimaPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProductosPage } from '@/pages/ProductosPage';

export const router = createBrowserRouter([
  { path: '/entrar', element: <LoginPage /> },
  { path: '/invitacion/:token', element: <InvitacionPage /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <ProductosPage /> },
          { path: 'materia-prima', element: <MateriaPrimaPage /> },
        ],
      },
    ],
  },
  {
    // Cada área del admin es una ruta, y cada subsección también: no hay tabs
    // anidados en ningún lado.
    element: <RutaProtegida rol="admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/insumos" replace /> },
          { path: 'insumos', element: <InsumosPage /> },
          { path: 'insumos/nuevo', element: <InsumoFormPage /> },
          { path: 'insumos/proveedores', element: <ProveedoresPage /> },
          { path: 'insumos/:id', element: <InsumoPage /> },
          { path: 'insumos/:id/editar', element: <InsumoFormPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
