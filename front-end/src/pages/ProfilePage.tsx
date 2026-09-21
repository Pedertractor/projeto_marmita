import { useAuth } from '@/contexts/useAuth';
import { formattedRoles } from '@/utils/roles';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className='mx-auto w-full max-w-lg'>
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Seus dados de acesso</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <div>
            <p className='text-muted-foreground'>Nome</p>
            <p className='font-medium'>{user.name}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>E-mail</p>
            <p className='font-medium'>{user.email}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Papel</p>
            <p className='font-medium'>{formattedRoles[user.role]}</p>
          </div>
          {user.company?.name ? (
            <div>
              <p className='text-muted-foreground'>Empresa</p>
              <p className='font-medium'>{user.company.name}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
