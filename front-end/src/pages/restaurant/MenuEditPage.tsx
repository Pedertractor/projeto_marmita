import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MenuForm } from '@/pages/restaurant/MenuForm';
import { ROUTES } from '@/routes/constants';
import { todayISODate } from '@/utils/format';
import { Button } from '@/components/ui/button';

export function MenuEditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialDate = params.get('date') || todayISODate();

  return (
    <div className='mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3'>
      <div className='flex shrink-0 items-center gap-2'>
        <Button asChild variant='ghost' size='icon-sm'>
          <Link to={ROUTES.MENUS} aria-label='Voltar'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <h1 className='text-xl font-semibold md:text-2xl'>Cardápio do dia</h1>
      </div>

      <MenuForm
        initialDate={initialDate}
        syncItemsOnDateChange
        layout='page'
        onSaved={() => navigate(ROUTES.MENUS)}
      />
    </div>
  );
}
