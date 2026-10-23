import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTES, specialOrderWizardPath } from '@/routes/constants';
import { companiesApi } from '@/services/companies';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { todayISODate, formatDate } from '@/utils/format';

export function SpecialOrderNewPage() {
  const navigate = useNavigate();
  const today = todayISODate();
  const [companyId, setCompanyId] = useState<string>('');

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  });

  const activeCompanies = companies.filter((c) => c.active);

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
  });

  const availableItems = menu?.items.filter((i) => i.available) ?? [];
  const canStart = Boolean(menu && availableItems.length > 0 && companyId);

  const startMutation = useMutation({
    mutationFn: () =>
      ordersApi.start(menu!.id, { companyId }),
    onSuccess: (order) => {
      navigate(specialOrderWizardPath(order.id));
    },
    onError: (err: unknown) => {
      const message =
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message === 'string'
          ? err.message
          : 'Não foi possível iniciar a solicitação especial.';
      toast.error(message);
    },
  });

  return (
    <div className='mx-auto w-full max-w-lg space-y-4'>
      <div className='flex items-center gap-2'>
        <Button asChild variant='ghost' size='icon-sm'>
          <Link to={ROUTES.ORDERS}>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <div>
          <h1 className='text-xl font-semibold tracking-tight'>
            Solicitação especial
          </h1>
          <p className='text-sm text-muted-foreground'>
            Pedido do RH — disponível a qualquer horário
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Sparkles className='size-5 text-primary' />
            Nova solicitação
          </CardTitle>
          <CardDescription>
            Escolha a empresa que será cobrada. Cardápio de{' '}
            {formatDate(today)}.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {menuLoading || companiesLoading ? (
            <p className='text-sm text-muted-foreground'>Carregando…</p>
          ) : !menu || availableItems.length === 0 ? (
            <p className='text-sm text-amber-700'>
              Não há cardápio com itens disponíveis para hoje.
            </p>
          ) : (
            <>
              <div className='space-y-2'>
                <Label htmlFor='company'>Empresa</Label>
                <Select
                  value={companyId || undefined}
                  onValueChange={setCompanyId}
                >
                  <SelectTrigger id='company' className='w-full'>
                    <SelectValue placeholder='Selecione a empresa' />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeCompanies.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>
                    Nenhuma empresa ativa cadastrada.
                  </p>
                ) : null}
              </div>

              <Button
                className='w-full'
                disabled={!canStart || startMutation.isPending}
                onClick={() => startMutation.mutate()}
              >
                {startMutation.isPending
                  ? 'Iniciando…'
                  : 'Continuar solicitação'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
