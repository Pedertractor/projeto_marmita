import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  registrationRequestsApi,
  type RegistrationRequest,
  type RegistrationStatus,
} from '@/services/registration-requests';
import { isSyntheticInternalEmail } from '@/constants/company-kind';
import { formatDateTime } from '@/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useClientPagination } from '@/hooks/use-client-pagination';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow, TableSection } from '@/components/ui/table-section';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/get-initials';
import { resolveAvatarUrl } from '@/utils/avatar-url';

const STATUS_TABS: Array<{ value: RegistrationStatus | 'ALL'; label: string }> =
  [
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'APPROVED', label: 'Aprovadas' },
    { value: 'REJECTED', label: 'Rejeitadas' },
    { value: 'ALL', label: 'Todas' },
  ];

const KIND_LABEL: Record<string, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
  OTHER: 'Outra',
};

const STATUS_VARIANT: Record<
  RegistrationStatus,
  'default' | 'secondary' | 'destructive'
> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
};

function registrationEmailDisplay(row: RegistrationRequest): string {
  if (row.companyKind === 'OTHER') {
    return row.email;
  }
  const isSynthetic = isSyntheticInternalEmail(row.email);
  const contactEmail = isSynthetic ? null : row.email;
  if (contactEmail && row.cardNumber) {
    return `${contactEmail} · Cartão ${row.cardNumber}`;
  }
  if (contactEmail) return contactEmail;
  return row.cardNumber ? `Cartão ${row.cardNumber}` : '—';
}

export function RegistrationRequestsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RegistrationStatus | 'ALL'>('PENDING');
  const [approveItem, setApproveItem] = useState<RegistrationRequest | null>(
    null,
  );
  const [rejectItem, setRejectItem] = useState<RegistrationRequest | null>(
    null,
  );
  const [mealPriceAmount, setMealPriceAmount] = useState('20');
  const [approveCompanyName, setApproveCompanyName] = useState('');
  const [requiresWorkLocation, setRequiresWorkLocation] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const statusFilter = tab === 'ALL' ? undefined : tab;

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['registration-requests', statusFilter ?? 'ALL'],
    queryFn: () => registrationRequestsApi.list(statusFilter),
  });

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.status === 'PENDING').length,
    [registrations],
  );

  const { page, setPage, totalPages, pageItems } =
    useClientPagination(registrations);

  const approveMutation = useMutation({
    mutationFn: () =>
      registrationRequestsApi.approve(approveItem!.id, {
        mealPriceAmount: Number(mealPriceAmount),
        companyName:
          approveItem?.companyKind === 'OTHER'
            ? approveCompanyName.trim() || undefined
            : undefined,
        requiresWorkLocation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['meal-price'] });
      toast.success('Solicitação aprovada.');
      setApproveItem(null);
      setRequiresWorkLocation(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      registrationRequestsApi.reject(rejectItem!.id, {
        note: rejectNote.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      toast.success('Solicitação rejeitada.');
      setRejectItem(null);
      setRejectNote('');
    },
  });

  function openApprove(item: RegistrationRequest) {
    setApproveItem(item);
    setMealPriceAmount('20');
    setApproveCompanyName(item.companyName);
    setRequiresWorkLocation(false);
  }

  function openReject(item: RegistrationRequest) {
    setRejectItem(item);
    setRejectNote('');
  }

  return (
    <div className='space-y-4'>
      <div>
        <h1 className='text-2xl font-semibold'>Solicitações de cadastro</h1>
        <p className='text-sm text-muted-foreground'>
          Aprove ou rejeite pedidos de acesso
          {tab === 'PENDING' && pendingCount > 0
            ? ` · ${pendingCount} pendente(s)`
            : ''}
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {STATUS_TABS.map((t) => (
          <Button
            key={t.value}
            size='sm'
            variant={tab === t.value ? 'default' : 'outline'}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : (
        <TableSection
          pagination={{
            page,
            totalPages,
            onPageChange: setPage,
            summary: `${registrations.length} solicitação(ões)`,
          }}
        >
            <TableHeader>
              <TableRow>
                <TableHead className='w-[22%]'>Nome</TableHead>
                <TableHead className='w-[14%]'>Acesso</TableHead>
                <TableHead className='w-[18%]'>Empresa</TableHead>
                <TableHead className='w-[14%]'>Contato</TableHead>
                <TableHead className='w-[10%]'>Status</TableHead>
                <TableHead className='w-[18%]'>Criada em</TableHead>
                <TableHead className='w-10 px-1' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableEmptyRow colSpan={7}>
                  Nenhuma solicitação neste filtro.
                </TableEmptyRow>
              ) : null}
              {pageItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='truncate font-medium' title={row.name}>
                    <div className='flex min-w-0 items-center gap-2.5'>
                      <Avatar className='size-8 shrink-0'>
                        <AvatarImage
                          src={resolveAvatarUrl(row.avatarUrl)}
                          alt={row.name}
                        />
                        <AvatarFallback className='text-xs'>
                          {getInitials(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className='truncate'>{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className='truncate' title={registrationEmailDisplay(row)}>
                    {registrationEmailDisplay(row)}
                  </TableCell>
                  <TableCell className='truncate'>
                    <span className='block truncate' title={row.companyName}>
                      {row.companyName}
                    </span>
                    <span className='block truncate text-xs text-muted-foreground'>
                      {KIND_LABEL[row.companyKind] ?? row.companyKind}
                    </span>
                  </TableCell>
                  <TableCell className='truncate whitespace-nowrap'>
                    {row.phone}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[row.status]}
                      className={cn(
                        row.status === 'PENDING' && 'bg-amber-500/15 text-amber-700',
                      )}
                    >
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className='truncate text-xs whitespace-nowrap text-muted-foreground'>
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className='px-1 text-right'>
                    {row.status === 'PENDING' ? (
                      <TableRowActions label='Ações da solicitação'>
                        <DropdownMenuItem onClick={() => openApprove(row)}>
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant='destructive'
                          onClick={() => openReject(row)}
                        >
                          Rejeitar
                        </DropdownMenuItem>
                      </TableRowActions>
                    ) : row.reviewNote ? (
                      <span
                        className='block max-w-28 truncate text-xs text-muted-foreground'
                        title={row.reviewNote}
                      >
                        {row.reviewNote}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </TableSection>
      )}

      <Dialog
        open={approveItem !== null}
        onOpenChange={(v) => !v && setApproveItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar solicitação</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='flex items-center gap-3'>
              <Avatar className='size-14 shrink-0'>
                <AvatarImage
                  src={resolveAvatarUrl(approveItem?.avatarUrl)}
                  alt={approveItem?.name ?? ''}
                />
                <AvatarFallback>
                  {approveItem ? getInitials(approveItem.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <p className='text-sm text-muted-foreground'>
                {approveItem?.name} ·{' '}
                {approveItem ? registrationEmailDisplay(approveItem) : ''}
              </p>
            </div>
            {approveItem?.companyKind === 'OTHER' ? (
              <div className='space-y-1.5'>
                <Label htmlFor='approve-company'>Nome da empresa</Label>
                <Input
                  id='approve-company'
                  value={approveCompanyName}
                  onChange={(e) => setApproveCompanyName(e.target.value)}
                />
              </div>
            ) : null}
            <div className='space-y-1.5'>
              <Label htmlFor='approve-price'>
                Preço da marmita (R$) *
              </Label>
              <Input
                id='approve-price'
                type='number'
                min={0.01}
                step='0.01'
                value={mealPriceAmount}
                onChange={(e) => setMealPriceAmount(e.target.value)}
                required
              />
            </div>
            <div className='flex items-start gap-2 pt-1'>
              <Checkbox
                id='approve-work-location'
                checked={requiresWorkLocation}
                onCheckedChange={(v) => setRequiresWorkLocation(Boolean(v))}
              />
              <div className='space-y-0.5'>
                <Label htmlFor='approve-work-location' className='font-normal'>
                  Exigir local de trabalho nas marmitas
                </Label>
                <p className='text-xs text-muted-foreground'>
                  Se marcado, este usuário precisará informar onde cada pessoa
                  está trabalhando ao solicitar marmitas.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setApproveItem(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !mealPriceAmount ||
                Number(mealPriceAmount) <= 0 ||
                approveMutation.isPending
              }
              onClick={() => approveMutation.mutate()}
            >
              {approveMutation.isPending ? 'Aprovando…' : 'Confirmar aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectItem !== null}
        onOpenChange={(v) => !v && setRejectItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='flex items-center gap-3'>
              <Avatar className='size-14 shrink-0'>
                <AvatarImage
                  src={resolveAvatarUrl(rejectItem?.avatarUrl)}
                  alt={rejectItem?.name ?? ''}
                />
                <AvatarFallback>
                  {rejectItem ? getInitials(rejectItem.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <p className='text-sm text-muted-foreground'>
                {rejectItem?.name} ·{' '}
                {rejectItem ? registrationEmailDisplay(rejectItem) : ''}
              </p>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='reject-note'>Motivo (opcional)</Label>
              <Textarea
                id='reject-note'
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRejectItem(null)}>
              Cancelar
            </Button>
            <Button
              variant='destructive'
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
            >
              {rejectMutation.isPending ? 'Rejeitando…' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
