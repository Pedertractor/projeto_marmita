import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { ROUTES, homeForRole } from '@/routes/constants';
import { canRoleAccessPath } from '@/config/roleAccess';

export function RoleProtectedRoute() {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <p className='text-muted-foreground'>A carregar…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
    );
  }

  if (!canRoleAccessPath(user.role, location.pathname)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}
