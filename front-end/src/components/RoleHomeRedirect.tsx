import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { homeForRole, ROUTES } from '@/routes/constants';

/** Redireciona `/` para a home adequada ao papel. */
export function RoleHomeRedirect() {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <p className='text-muted-foreground'>A carregar…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Navigate to={homeForRole(user.role)} replace />;
}
