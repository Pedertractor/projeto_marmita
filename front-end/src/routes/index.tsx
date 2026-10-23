import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/RoleProtectedRoute';
import { RoleHomeRedirect } from '@/components/RoleHomeRedirect';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RequesterHomePage } from '@/pages/requester/RequesterHomePage';
import { MyOrdersPage } from '@/pages/requester/MyOrdersPage';
import { NewOrderPage } from '@/pages/requester/NewOrderPage';
import { RequesterOrderDetailPage } from '@/pages/requester/RequesterOrderDetailPage';
import { RhDashboardPage } from '@/pages/rh/RhDashboardPage';
import { CompaniesPage } from '@/pages/rh/CompaniesPage';
import { MealPricePage } from '@/pages/rh/MealPricePage';
import { RegistrationRequestsPage } from '@/pages/rh/RegistrationRequestsPage';
import { SpecialOrderNewPage } from '@/pages/rh/SpecialOrderNewPage';
import { RestaurantDashboardPage } from '@/pages/restaurant/RestaurantDashboardPage';
import { MenuListPage } from '@/pages/restaurant/MenuListPage';
import { MenuEditPage } from '@/pages/restaurant/MenuEditPage';
import { OrdersListPage } from '@/pages/orders/OrdersListPage';
import { AdminOrderDetailPage } from '@/pages/orders/AdminOrderDetailPage';
import { UserListPage } from '@/pages/Usuarios/UserListPage';
import { NewUserPage } from '@/pages/Usuarios/NewUserPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { ROUTES } from './constants';

export { ROUTES } from './constants';

const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <ResetPasswordPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleProtectedRoute />,
        children: [
          {
            path: ROUTES.HOME,
            element: <RoleHomeRedirect />,
          },
          {
            element: <MainLayout />,
            children: [
              {
                path: ROUTES.PROFILE,
                element: <ProfilePage />,
              },
              {
                path: ROUTES.REQUESTER_HOME,
                element: <RequesterHomePage />,
              },
              {
                path: ROUTES.REQUESTER_ORDERS,
                element: <MyOrdersPage />,
              },
              {
                path: ROUTES.REQUESTER_ORDER_NEW,
                element: <NewOrderPage />,
              },
              {
                path: ROUTES.REQUESTER_ORDER_WIZARD,
                element: <NewOrderPage />,
              },
              {
                path: ROUTES.REQUESTER_ORDER_DETAIL,
                element: <RequesterOrderDetailPage />,
              },
              {
                path: ROUTES.REQUESTER_ORDER_EDIT,
                element: <NewOrderPage editMode />,
              },
              {
                path: ROUTES.DASHBOARD_RH,
                element: <RhDashboardPage />,
              },
              {
                path: ROUTES.DASHBOARD_RESTAURANT,
                element: <RestaurantDashboardPage />,
              },
              {
                path: ROUTES.ORDERS,
                element: <OrdersListPage />,
              },
              {
                path: ROUTES.SPECIAL_ORDER_NEW,
                element: <SpecialOrderNewPage />,
              },
              {
                path: ROUTES.SPECIAL_ORDER_WIZARD,
                element: <NewOrderPage specialMode />,
              },
              {
                path: ROUTES.SPECIAL_ORDER_EDIT,
                element: <NewOrderPage editMode specialMode />,
              },
              {
                path: ROUTES.ORDER_DETAIL,
                element: <AdminOrderDetailPage />,
              },
              {
                path: ROUTES.MENUS,
                element: <MenuListPage />,
              },
              {
                path: ROUTES.MENU_EDIT,
                element: <MenuEditPage />,
              },
              {
                path: ROUTES.COMPANIES,
                element: <CompaniesPage />,
              },
              {
                path: ROUTES.REPORTS,
                element: <Navigate to={ROUTES.DASHBOARD_RH} replace />,
              },
              {
                path: ROUTES.MEAL_PRICES,
                element: <MealPricePage />,
              },
              {
                path: ROUTES.REGISTRATIONS,
                element: <RegistrationRequestsPage />,
              },
              {
                path: ROUTES.USUARIOS,
                element: <UserListPage />,
              },
              {
                path: ROUTES.USUARIOS_NOVO,
                element: <NewUserPage />,
              },
              {
                path: ROUTES.AUDIT,
                element: <AuditLogsPage />,
              },
              {
                path: ROUTES.NOT_FOUND,
                element: <NotFoundPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
