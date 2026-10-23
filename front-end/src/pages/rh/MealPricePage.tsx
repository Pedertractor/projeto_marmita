import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from 'sonner';

import {

  Building2,

  CircleDollarSign,

  History,

  Loader2,

  TrendingDown,

  TrendingUp,

  Wallet,

} from 'lucide-react';

import { companiesApi } from '@/services/companies';

import { mealPricesApi } from '@/services/meal-prices';

import {
  formatCurrency,
  formatDateTime,
  toDateTimeLocal,
} from '@/utils/format';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

import { DatePicker } from '@/components/ui/date-picker';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from '@/components/ui/card';

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from '@/components/ui/select';

import { useClientPagination } from '@/hooks/use-client-pagination';

import {

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from '@/components/ui/table';

import { TableEmptyRow, TableSection } from '@/components/ui/table-section';



function parseAmount(value: string): number | null {

  const n = Number(value);

  if (!value.trim() || Number.isNaN(n)) return null;

  return n;

}



export function MealPricePage() {

  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = useState('');

  const [amount, setAmount] = useState('20');

  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>();
  const [effectiveTime, setEffectiveTime] = useState('00:00');



  const { data: companies = [], isLoading: companiesLoading } = useQuery({

    queryKey: ['companies'],

    queryFn: () => companiesApi.list(),

  });



  useEffect(() => {

    if (!companyId && companies.length > 0) {

      setCompanyId(companies[0]!.id);

    }

  }, [companies, companyId]);



  const { data: current, isLoading: currentLoading } = useQuery({

    queryKey: ['meal-price-current', companyId],

    queryFn: () => mealPricesApi.getCurrent(companyId),

    enabled: Boolean(companyId),

  });



  const { data: history = [], isLoading: historyLoading } = useQuery({

    queryKey: ['meal-price-history', companyId],

    queryFn: () => mealPricesApi.history(companyId),

    enabled: Boolean(companyId),

  });



  const createMutation = useMutation({

    mutationFn: () =>

      mealPricesApi.create({

        companyId,

        amount: Number(amount),

        effectiveFrom: effectiveDate
          ? toDateTimeLocal(effectiveDate, effectiveTime)
          : undefined,

      }),

    onSuccess: () => {

      queryClient.invalidateQueries({

        queryKey: ['meal-price-current', companyId],

      });

      queryClient.invalidateQueries({

        queryKey: ['meal-price-history', companyId],

      });

      toast.success('Novo preço definido.');

      setEffectiveDate(undefined);
      setEffectiveTime('00:00');

    },

  });



  const selectedCompany = companies.find((c) => c.id === companyId);



  const {

    page: historyPage,

    setPage: setHistoryPage,

    totalPages: historyTotalPages,

    pageItems: historyPageItems,

  } = useClientPagination(history);



  useEffect(() => {

    setHistoryPage(1);

  }, [companyId, setHistoryPage]);



  const draftAmount = parseAmount(amount);

  const currentAmount =

    current != null ? Number(current.amount) : null;

  const priceDelta = useMemo(() => {

    if (draftAmount == null || currentAmount == null) return null;

    if (draftAmount === currentAmount) return null;

    return draftAmount - currentAmount;

  }, [currentAmount, draftAmount]);



  const canSave =

    draftAmount != null && draftAmount > 0 && !createMutation.isPending;



  const companyLabel = selectedCompany

    ? `${selectedCompany.name}${selectedCompany.code ? ` (${selectedCompany.code})` : ''}`

    : '';



  return (

    <div className='space-y-4'>

      <div>

        <h1 className='text-2xl font-semibold'>Preço da marmita</h1>

        <p className='text-sm text-muted-foreground'>

          Valor vigente e histórico por empresa — usado no cálculo dos pedidos

        </p>

        <div className='mt-3 flex flex-wrap items-end gap-x-4 gap-y-3'>

          <div className='grid min-w-[min(100%,16rem)] flex-1 gap-1.5 sm:max-w-xs'>

            <Label htmlFor='meal-price-company'>Empresa</Label>

            <Select

              value={companyId}

              onValueChange={setCompanyId}

              disabled={companiesLoading || companies.length === 0}

            >

              <SelectTrigger

                id='meal-price-company'

              >

                <Building2

                  className='mr-1.5 size-3.5 shrink-0 text-muted-foreground'

                  aria-hidden

                />

                <SelectValue placeholder='Selecione a empresa' />

              </SelectTrigger>

              <SelectContent>

                {companies.map((c) => (

                  <SelectItem key={c.id} value={c.id}>

                    {c.name}

                    {c.code ? ` (${c.code})` : ''}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          {companyId ? (

            <p className='pb-1.5 text-xs text-muted-foreground'>

              {history.length} alteração(ões) registrada(s)

            </p>

          ) : null}

        </div>

      </div>



      {companiesLoading ? (

        <div className='flex items-center gap-2 text-sm text-muted-foreground'>

          <Loader2 className='size-4 animate-spin text-primary' aria-hidden />

          Carregando empresas…

        </div>

      ) : !companyId ? (

        <Card variant='compact'>

          <CardContent className='px-4 py-8 text-center'>

            <CircleDollarSign

              className='mx-auto mb-2 size-8 text-primary/40'

              aria-hidden

            />

            <p className='text-sm text-muted-foreground'>

              {companies.length === 0

                ? 'Nenhuma empresa cadastrada ainda.'

                : 'Selecione uma empresa para ver e definir preços.'}

            </p>

          </CardContent>

        </Card>

      ) : (

        <>

          <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'>

            <Card

              variant='compact'

              className='relative h-full overflow-hidden'

            >

              <div className='relative flex min-h-46 flex-1 flex-col bg-linear-to-br from-primary/12 via-primary/6 to-primary/4 px-4 py-5 sm:min-h-50 sm:px-5 sm:py-6'>

                {current ? (

                  <Badge

                    variant='secondary'

                    className='absolute top-4 right-4 z-20 border-primary/15 bg-primary/10 text-primary sm:top-5 sm:right-5'

                  >

                    Ativo

                  </Badge>

                ) : null}



                <div className='relative z-10 min-w-0'>

                  <div className='min-w-0 space-y-1'>

                    <p className='flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary/80'>

                      <Wallet className='size-3.5' aria-hidden />

                      Preço vigente

                    </p>

                    <p className='truncate text-sm text-muted-foreground'>

                      {companyLabel}

                    </p>

                  </div>



                  {currentLoading ? (

                    <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>

                      <Loader2

                        className='size-4 animate-spin text-primary'

                        aria-hidden

                      />

                      Carregando preço…

                    </div>

                  ) : (

                    <>

                      <p className='mt-4 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl'>

                        {current ? formatCurrency(current.amount) : '—'}

                      </p>

                      <p className='mt-2 text-xs text-muted-foreground'>

                        {current

                          ? `Vigente desde ${formatDateTime(current.effectiveFrom)}`

                          : 'Nenhum preço cadastrado para esta empresa.'}

                      </p>

                    </>

                  )}

                </div>

              </div>

            </Card>



            <Card variant='compact'>

              <CardHeader className='space-y-0.5 px-4 pt-4 pb-0'>

                <CardTitle className='flex items-center gap-1.5 text-sm font-medium'>

                  <CircleDollarSign

                    className='size-3.5 text-primary'

                    aria-hidden

                  />

                  Definir novo preço

                </CardTitle>

                <CardDescription className='text-xs'>

                  Substitui o valor vigente a partir da data informada

                </CardDescription>

              </CardHeader>

              <CardContent className='space-y-0 px-4 pb-4 pt-3'>

                <div className='grid gap-1.5 pb-3'>

                  <Label htmlFor='amount' className='text-sm'>

                    Valor (R$)

                  </Label>

                  <Input

                    id='amount'

                    type='number'

                    min={0.01}

                    step='0.01'

                    className='w-36 tabular-nums'

                    value={amount}

                    onChange={(e) => setAmount(e.target.value)}

                  />

                </div>

                <Separator className='bg-primary/10' />

                <div className='space-y-3 py-3'>

                  <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>

                    <div className='grid min-w-0 flex-1 gap-1.5'>

                      <Label htmlFor='effectiveFrom-date' className='text-sm'>

                        Data de vigência (opcional)

                      </Label>

                      <DatePicker

                        id='effectiveFrom-date'

                        placeholder='Selecione a data'

                        value={effectiveDate}

                        onChange={setEffectiveDate}

                      />

                    </div>

                    <div className='grid w-full gap-1.5 sm:w-auto'>

                      <Label htmlFor='effectiveFrom-time' className='text-sm'>

                        Horário

                      </Label>

                      <Input

                        id='effectiveFrom-time'

                        type='time'

                        disabled={!effectiveDate}

                        className='w-full sm:w-36'

                        value={effectiveTime}

                        onChange={(e) => setEffectiveTime(e.target.value)}

                      />

                    </div>

                  </div>

                  <p className='text-[11px] leading-snug text-muted-foreground'>

                    Se a data ficar vazia, o novo valor passa a valer

                    imediatamente.

                  </p>

                </div>

                {priceDelta != null ? (

                  <div

                    className={cn(

                      'mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs',

                      priceDelta > 0

                        ? 'border-primary/20 bg-primary/6 text-primary'

                        : 'border-amber-500/25 bg-amber-500/6 text-amber-900 dark:text-amber-200',

                    )}

                  >

                    {priceDelta > 0 ? (

                      <TrendingUp className='size-3.5 shrink-0' aria-hidden />

                    ) : (

                      <TrendingDown className='size-3.5 shrink-0' aria-hidden />

                    )}

                    <span>

                      {priceDelta > 0 ? 'Aumento' : 'Redução'} de{' '}

                      <strong className='tabular-nums'>

                        {formatCurrency(Math.abs(priceDelta))}

                      </strong>{' '}

                      em relação ao vigente

                    </span>

                  </div>

                ) : null}

                <Separator className='mb-3 bg-primary/10' />

                <Button

                  className='w-full'

                  disabled={!canSave}

                  onClick={() => createMutation.mutate()}

                >

                  {createMutation.isPending ? (

                    <>

                      <Loader2

                        className='size-4 animate-spin'

                        aria-hidden

                      />

                      Salvando…

                    </>

                  ) : (

                    'Salvar preço'

                  )}

                </Button>

              </CardContent>

            </Card>

          </div>



          <div className='space-y-2'>

            <div className='flex items-center gap-1.5 px-0.5'>

              <History className='size-3.5 text-primary' aria-hidden />

              <h2 className='text-sm font-medium'>Histórico de alterações</h2>

            </div>



            {historyLoading ? (

              <div className='flex items-center gap-2 text-sm text-muted-foreground'>

                <Loader2

                  className='size-4 animate-spin text-primary'

                  aria-hidden

                />

                Carregando histórico…

              </div>

            ) : (

              <TableSection

                className='text-sm'

                tableClassName='table-auto'

                pagination={{

                  page: historyPage,

                  totalPages: historyTotalPages,

                  onPageChange: setHistoryPage,

                  summary: `${history.length} registro(s)`,

                }}

              >

                <TableHeader>

                  <TableRow>

                    <TableHead className='w-[22%]'>Valor</TableHead>

                    <TableHead className='w-[38%]'>Vigência</TableHead>

                    <TableHead className='w-[40%]'>Registrado em</TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {historyPageItems.length === 0 ? (

                    <TableEmptyRow colSpan={3}>

                      Sem histórico para esta empresa.

                    </TableEmptyRow>

                  ) : (

                    historyPageItems.map((row) => {

                      const isCurrent = current?.id === row.id;

                      return (

                        <TableRow

                          key={row.id}

                          className={cn(

                            isCurrent &&

                              'bg-primary/4 hover:bg-primary/6',

                          )}

                        >

                          <TableCell className='whitespace-nowrap'>

                            <span className='flex items-center gap-2 font-medium tabular-nums'>

                              {formatCurrency(row.amount)}

                              {isCurrent ? (

                                <Badge

                                  variant='outline'

                                  className='h-5 border-primary/25 px-1.5 text-[10px] font-normal text-primary'

                                >

                                  Vigente

                                </Badge>

                              ) : null}

                            </span>

                          </TableCell>

                          <TableCell className='truncate text-muted-foreground'>

                            {formatDateTime(row.effectiveFrom)}

                          </TableCell>

                          <TableCell className='truncate text-muted-foreground'>

                            {formatDateTime(row.createdAt)}

                          </TableCell>

                        </TableRow>

                      );

                    })

                  )}

                </TableBody>

              </TableSection>

            )}

          </div>

        </>

      )}

    </div>

  );

}

