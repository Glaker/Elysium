import { createBrowserRouter, Navigate } from 'react-router';

import { RutaProtegida } from '@/components/RutaProtegida';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { InsumoFormPage } from '@/features/insumos/InsumoFormPage';
import { InsumoPage } from '@/features/insumos/InsumoPage';
import { InsumosPage } from '@/features/insumos/InsumosPage';
import { ProveedoresPage } from '@/features/insumos/ProveedoresPage';
import { LoteNuevoPage } from '@/features/lotes/LoteNuevoPage';
import { LotePage } from '@/features/lotes/LotePage';
import { LotesPage } from '@/features/lotes/LotesPage';
import { LineasPage } from '@/features/productos/LineasPage';
import { ProductoFormPage } from '@/features/productos/ProductoFormPage';
import { ProductoPage } from '@/features/productos/ProductoPage';
import { ProductosPage as ProductosAdminPage } from '@/features/productos/ProductosPage';
import { TamanoPage } from '@/features/productos/TamanoPage';
import { MovimientosPage } from '@/features/stock/MovimientosPage';
import { RecuentoPage } from '@/features/stock/RecuentoPage';
import { RecuentosPage } from '@/features/stock/RecuentosPage';
import { StockInsumosPage } from '@/features/stock/StockInsumosPage';
import { StockPage } from '@/features/stock/StockPage';
import { UbicacionesPage } from '@/features/stock/UbicacionesPage';
import { CuentasPage } from '@/features/ventas/CuentasPage';
import { VentaNuevaPage } from '@/features/ventas/VentaNuevaPage';
import { VentaPage } from '@/features/ventas/VentaPage';
import { VentasPage } from '@/features/ventas/VentasPage';
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
          { path: 'productos', element: <ProductosAdminPage /> },
          { path: 'productos/nuevo', element: <ProductoFormPage /> },
          { path: 'productos/lineas', element: <LineasPage /> },
          // El tamaño cuelga de /productos y no de /productos/:id/tamanos/:tid:
          // es una entidad con identidad propia (es el SKU), y su ficha se
          // alcanza desde stock, lotes y ventas, no solo desde su producto.
          { path: 'productos/tamanos/:id', element: <TamanoPage /> },
          { path: 'productos/:id', element: <ProductoPage /> },
          { path: 'productos/:id/editar', element: <ProductoFormPage /> },
          { path: 'lotes', element: <LotesPage /> },
          { path: 'lotes/nuevo', element: <LoteNuevoPage /> },
          { path: 'lotes/:id', element: <LotePage /> },
          { path: 'stock', element: <StockPage /> },
          { path: 'stock/insumos', element: <StockInsumosPage /> },
          { path: 'stock/movimientos', element: <MovimientosPage /> },
          { path: 'stock/ubicaciones', element: <UbicacionesPage /> },
          { path: 'stock/recuentos', element: <RecuentosPage /> },
          { path: 'stock/recuentos/:id', element: <RecuentoPage /> },
          { path: 'ventas', element: <VentasPage /> },
          { path: 'ventas/nueva', element: <VentaNuevaPage /> },
          { path: 'ventas/cuentas', element: <CuentasPage /> },
          { path: 'ventas/:id', element: <VentaPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
