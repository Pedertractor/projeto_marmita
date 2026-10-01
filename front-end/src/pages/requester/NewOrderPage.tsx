import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { MealBagsProgress } from '@/components/MealBagsProgress';
import { MealCheckOverlay } from '@/components/MealCheckOverlay';
import { MealPlate } from '@/components/MealPlate';
import { MenuItemsCarousel } from '@/components/MenuItemsCarousel';
import { MenuItemsGrid } from '@/components/MenuItemsGrid';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { OrderSuccessOverlay } from '@/components/OrderSuccessOverlay';
import { QuantityMascotScene } from '@/components/QuantityMascotScene';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { ROUTES, requesterOrderPath } from '@/routes/constants';
import { todayISODate } from '@/utils/format';
import { generateOrderCode } from '@/utils/order-code';
import { canEditSubmittedOrder } from '@/utils/order-status';
import type { OrderFulfillmentType } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MealDraft = {
  recipientName: string;
  notes: string;
  itemIds: string[];
};

const STEPS = [
  'Quantidade',
  'Destinatários',
  'Cardápio',
  'Finalizar',
] as const;

const CHECK_DURATION_MS = 1100;
const SCROLL_TO_TOP_MS = 320;
const SUCCESS_DURATION_MS = 1800;

export function NewOrderPage({ editMode = false }: { editMode?: boolean }) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayISODate();
  const isLocalNew = !editMode && !orderId;

  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentType, setFulfillmentType] =
    useState<OrderFulfillmentType | null>(null);
  const [meals, setMeals] = useState<MealDraft[]>([
    { recipientName: '', notes: '', itemIds: [] },
  ]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(() =>
    isLocalNew ? generateOrderCode() : null,
  );
  const [hydrated, setHydrated] = useState(isLocalNew);
  const [recipientIndex, setRecipientIndex] = useState(0);
  const [mealIndex, setMealIndex] = useState(0);
  const [showMealCheck, setShowMealCheck] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mealCheckTimersRef = useRef<number[]>([]);

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
  });

  const { data: existing, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: Boolean(orderId),
  });

  useEffect(() => {
    if (menu?.id) setMenuId(menu.id);
  }, [menu?.id]);

  useEffect(() => {
    if (isLocalNew || !existing || hydrated) return;

    if (editMode && existing.status !== 'SUBMITTED') {
      toast.error('Só é possível editar pedidos enviados.');
      navigate(requesterOrderPath(existing.id), { replace: true });
      return;
    }

    if (editMode && !canEditSubmittedOrder(existing)) {
      toast.error('O prazo de 5 minutos para editar o pedido expirou.');
      navigate(requesterOrderPath(existing.id), { replace: true });
      return;
    }

    if (!editMode && existing.status !== 'DRAFT') {
      navigate(requesterOrderPath(existing.id), { replace: true });
      return;
    }

    setOrderCode(existing.orderCode);
    setQuantity(existing.quantity);
    setMenuId(existing.menuId);
    setFulfillmentType(existing.fulfillmentType ?? null);
    setMeals(
      existing.meals.length > 0
        ? existing.meals.map((m) => ({
            recipientName: m.recipientName,
            notes: m.notes ?? '',
            itemIds: m.items
              .map((i) => i.menuItemId)
              .filter((id): id is string => Boolean(id)),
          }))
        : Array.from({ length: existing.quantity }, () => ({
            recipientName: '',
            notes: '',
            itemIds: [] as string[],
          })),
    );
    setHydrated(true);
  }, [editMode, existing, hydrated, isLocalNew, navigate]);

  const availableItems = useMemo(
    () => (menu?.items ?? []).filter((i) => i.available),
    [menu],
  );

  const allItemIds = useMemo(
    () => availableItems.map((i) => i.id),
    [availableItems],
  );

  useEffect(() => {
    setMeals((prev) => {
      if (prev.length === quantity) return prev;
      if (prev.length < quantity) {
        return [
          ...prev,
          ...Array.from({ length: quantity - prev.length }, () => ({
            recipientName: '',
            notes: '',
            itemIds: [] as string[],
          })),
        ];
      }
      return prev.slice(0, quantity);
    });
  }, [quantity]);

  /** Ao entrar no cardápio, preenche todas as opções e começa na 1ª marmita. */
  useEffect(() => {
    if (step !== 2 || allItemIds.length === 0) return;
    setMealIndex(0);
    setShowMealCheck(false);
    setMeals((prev) =>
      prev.map((meal) =>
        meal.itemIds.length === 0 ? { ...meal, itemIds: allItemIds } : meal,
      ),
    );
  }, [step, allItemIds]);

  function buildPayload() {
    if (!menuId) throw new Error('Cardápio indisponível');
    return {
      menuId,
      quantity,
      fulfillmentType,
      meals: meals.map((m) => ({
        recipientName: m.recipientName.trim(),
        notes: m.notes.trim() || null,
        itemIds: m.itemIds,
      })),
    };
  }

  async function persistDraft() {
    if (isLocalNew) return;
    if (!orderId || !menuId) return;
    setSavingDraft(true);
    try {
      await ordersApi.update(orderId, buildPayload());
    } catch {
      toast.error('Não foi possível salvar o rascunho.');
      throw new Error('draft save failed');
    } finally {
      setSavingDraft(false);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!menuId) throw new Error('Pedido indisponível');
      const payload = buildPayload();
      if (isLocalNew) {
        let code = orderCode ?? generateOrderCode();
        try {
          return await ordersApi.create(
            {
              ...payload,
              fulfillmentType: fulfillmentType!,
              orderCode: code,
            },
            { skipErrorToast: true },
          );
        } catch (err: unknown) {
          const status =
            err && typeof err === 'object' && 'status' in err
              ? (err as { status?: number }).status
              : undefined;
          if (status === 409) {
            code = generateOrderCode();
            setOrderCode(code);
            return await ordersApi.create(
              {
                ...payload,
                fulfillmentType: fulfillmentType!,
                orderCode: code,
              },
              { skipErrorToast: true },
            );
          }
          throw err;
        }
      }
      if (!orderId) throw new Error('Pedido indisponível');
      await ordersApi.update(orderId, payload);
      if (editMode) {
        return ordersApi.getById(orderId);
      }
      return ordersApi.submit(orderId);
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      setShowOrderSuccess(true);
      window.setTimeout(() => {
        navigate(requesterOrderPath(order.id));
      }, SUCCESS_DURATION_MS);
    },
    onError: () => {
      toast.error(
        editMode
          ? 'Não foi possível salvar as alterações.'
          : 'Não foi possível enviar o pedido. Confira os dados.',
      );
    },
  });

  function validateStep(): boolean {
    if (step === 0) {
      if (quantity < 1) {
        toast.error('Informe ao menos 1 marmita.');
        return false;
      }
      if (!menuId) {
        toast.error('Não há cardápio para hoje.');
        return false;
      }
      return true;
    }
    if (step === 1) {
      return validateCurrentRecipient(false);
    }
    if (step === 2) {
      for (const meal of meals) {
        if (meal.itemIds.length === 0) {
          toast.error(
            `Selecione itens para ${meal.recipientName || 'a marmita'}.`,
          );
          return false;
        }
      }
      return true;
    }
    return true;
  }

  async function next() {
    if (!validateStep()) return;
    try {
      await persistDraft();
    } catch {
      return;
    }
    if (step === 0) setRecipientIndex(0);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function validateCurrentRecipient(showToast = true): boolean {
    const meal = meals[recipientIndex];
    const name = meal?.recipientName.trim() ?? '';
    if (!name) {
      if (showToast) toast.error('Informe o nome desta marmita.');
      return false;
    }
    const normalized = name.toLowerCase();
    const duplicate = meals.some(
      (m, i) =>
        i !== recipientIndex &&
        m.recipientName.trim().toLowerCase() === normalized,
    );
    if (duplicate) {
      if (showToast) toast.error('Este nome já foi usado em outra marmita.');
      return false;
    }
    return true;
  }

  async function confirmCurrentRecipient() {
    if (!validateCurrentRecipient()) return;
    if (recipientIndex < meals.length - 1) {
      setRecipientIndex((i) => i + 1);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      await persistDraft();
    } catch {
      return;
    }
    setStep(2);
  }

  function back() {
    if (step === 2 && mealIndex > 0 && !showMealCheck) {
      setMealIndex((i) => i - 1);
      return;
    }
    if (step === 1 && recipientIndex > 0) {
      setRecipientIndex((i) => i - 1);
      return;
    }
    if (step === 2) {
      setRecipientIndex(Math.max(0, meals.length - 1));
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function notesFromExcludedItems(itemIds: string[]): string {
    return availableItems
      .filter((item) => !itemIds.includes(item.id))
      .map((item) => `sem ${item.name.toLowerCase()}`)
      .join('; ');
  }

  function toggleItem(itemId: string) {
    setMeals((prev) =>
      prev.map((meal, i) => {
        if (i !== mealIndex) return meal;
        const has = meal.itemIds.includes(itemId);
        const itemIds = has
          ? meal.itemIds.filter((id) => id !== itemId)
          : [...meal.itemIds, itemId];
        return {
          ...meal,
          itemIds,
          notes: notesFromExcludedItems(itemIds),
        };
      }),
    );
  }

  useEffect(() => {
    return () => {
      mealCheckTimersRef.current.forEach((id) => window.clearTimeout(id));
      mealCheckTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (step !== 2) {
      setShowScrollHint(false);
      return;
    }
    setShowScrollHint(true);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [step, mealIndex]);

  async function advanceAfterMealCheck(confirmedIndex: number) {
    setShowMealCheck(false);
    if (confirmedIndex < meals.length - 1) {
      const nextIndex = confirmedIndex + 1;
      setMealIndex(nextIndex);
      setMeals((prev) =>
        prev.map((m, i) =>
          i === nextIndex && m.itemIds.length === 0
            ? { ...m, itemIds: allItemIds }
            : m,
        ),
      );
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      try {
        await persistDraft();
      } catch {
        return;
      }
      setStep(3);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function confirmCurrentMeal() {
    const meal = meals[mealIndex];
    if (!meal || meal.itemIds.length === 0) {
      toast.error('Selecione ao menos um item para esta marmita.');
      return;
    }

    const confirmedIndex = mealIndex;
    mealCheckTimersRef.current.forEach((id) => window.clearTimeout(id));
    mealCheckTimersRef.current = [];

    setShowMealCheck(false);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    const showTimer = window.setTimeout(() => {
      setShowMealCheck(true);
      const advanceTimer = window.setTimeout(() => {
        void advanceAfterMealCheck(confirmedIndex);
      }, CHECK_DURATION_MS);
      mealCheckTimersRef.current.push(advanceTimer);
    }, SCROLL_TO_TOP_MS);
    mealCheckTimersRef.current.push(showTimer);
  }

  const currentMeal = meals[mealIndex];
  const plateItems = availableItems
    .filter((item) => currentMeal?.itemIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      iconKey: item.iconKey,
    }));

  if (!hydrated || (!isLocalNew && orderLoading)) {
    return (
      <div className='-mx-4 -mb-4 flex h-dvh min-h-0 flex-col overflow-hidden bg-white px-4 pb-4'>
        <p className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
          Carregando pedido…
        </p>
      </div>
    );
  }

  return (
    <div className='relative -mx-4 -mb-4 flex h-dvh min-h-0 flex-col overflow-hidden bg-white px-4 pb-4'>
      <div
        ref={scrollContainerRef}
        className='flex min-h-0 flex-1 flex-col overflow-y-auto'
        onScroll={(e) => {
          if (e.currentTarget.scrollTop > 20) {
            setShowScrollHint(false);
          }
        }}
      >
        <div className='mx-auto w-full max-w-2xl shrink-0 space-y-4 pt-2'>
          <div className='flex items-center gap-2'>
            <SidebarTrigger className='-ml-1' />
            <Button asChild variant='ghost' size='icon-sm'>
              <Link
                to={
                  editMode && orderId
                    ? requesterOrderPath(orderId)
                    : ROUTES.REQUESTER_HOME
                }
              >
                <ArrowLeft className='size-4' />
              </Link>
            </Button>
            <div>
              <h1 className='text-xl font-semibold tracking-tight'>
                {orderCode ? `#${orderCode}` : 'Pedido'}
              </h1>
              <p className='text-xs text-muted-foreground'>
                {editMode ? 'Editar · ' : ''}
                Passo {step + 1} de {STEPS.length}: {STEPS[step]}
              </p>
            </div>
          </div>

          <div className='flex gap-1'>
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            'mx-auto mt-4 flex w-full max-w-2xl flex-1 flex-col',
            step === 0 ? 'gap-0' : 'gap-4',
          )}
        >
          {step === 0 ? (
            <QuantityMascotScene quantity={quantity} />
          ) : (
            <MealBagsProgress
              count={quantity}
              currentIndex={
                step === 1
                  ? recipientIndex
                  : step === 2 && !showMealCheck
                    ? mealIndex
                    : -1
              }
              completedCount={
                step === 1
                  ? recipientIndex
                  : step === 2
                    ? showMealCheck
                      ? mealIndex + 1
                      : mealIndex
                    : step >= 3
                      ? quantity
                      : 0
              }
            />
          )}

          {step === 1 && meals[recipientIndex] ? (
            <Card className='mx-auto w-full max-w-sm'>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={recipientIndex}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -28 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base'>
                      Marmita {recipientIndex + 1}
                    </CardTitle>
                    <CardDescription>Informe o nome completo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      id={`recipient-${recipientIndex}`}
                      value={meals[recipientIndex].recipientName}
                      autoComplete='name'
                      aria-label='Nome completo'
                      className='h-11'
                      onChange={(e) =>
                        setMeals((prev) =>
                          prev.map((m, i) =>
                            i === recipientIndex
                              ? { ...m, recipientName: e.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder='Nome completo'
                    />
                  </CardContent>
                </motion.div>
              </AnimatePresence>
            </Card>
          ) : null}

          {step === 2 && currentMeal ? (
            <Card className='relative overflow-hidden'>
              {showMealCheck ? (
                <MealCheckOverlay recipientName={currentMeal.recipientName} />
              ) : (
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={mealIndex}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-base'>
                        {currentMeal.recipientName ||
                          `Marmita ${mealIndex + 1}`}
                      </CardTitle>
                      <CardDescription className='md:hidden'>
                        Arraste para o lado e toque nos itens para tirar ou
                        colocar no prato.
                      </CardDescription>
                      <CardDescription className='hidden md:block'>
                        Todos os itens começam no prato. Desmarque o que não
                        quiser.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-5'>
                      <MealPlate items={plateItems} />

                      <MenuItemsCarousel
                        items={availableItems}
                        selectedIds={currentMeal.itemIds}
                        onToggle={toggleItem}
                      />
                      <MenuItemsGrid
                        items={availableItems}
                        selectedIds={currentMeal.itemIds}
                        onToggle={toggleItem}
                      />

                      <div className='space-y-1.5'>
                        <Label htmlFor={`notes-${mealIndex}`}>
                          Observações
                        </Label>
                        <Textarea
                          id={`notes-${mealIndex}`}
                          value={currentMeal.notes}
                          className='resize-none'
                          onChange={(e) =>
                            setMeals((prev) =>
                              prev.map((m, i) =>
                                i === mealIndex
                                  ? { ...m, notes: e.target.value }
                                  : m,
                              ),
                            )
                          }
                          placeholder='Ex.: sem cebola'
                        />
                      </div>
                    </CardContent>
                  </motion.div>
                </AnimatePresence>
              )}
            </Card>
          ) : null}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Finalizar pedido</CardTitle>
                <CardDescription>
                  Confira as {quantity} marmita{quantity > 1 ? 's' : ''} e escolha
                  como prefere receber
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-5'>
                {meals.map((meal, index) => (
                  <div
                    key={index}
                    className='rounded-2xl border p-3 text-sm'
                  >
                    <p className='mb-2 font-medium'>{meal.recipientName}</p>
                    <ul className='flex flex-wrap gap-1.5'>
                      {meal.itemIds.map((id) => {
                        const item = availableItems.find((i) => i.id === id);
                        return (
                          <li
                            key={id}
                            className='inline-flex max-w-full flex-col gap-0.5 rounded-2xl bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary'
                          >
                            <span className='inline-flex items-center gap-1'>
                              <MenuItemIcon
                                iconKey={item?.iconKey}
                                size={12}
                                className='text-primary'
                              />
                              {item?.name ?? id}
                            </span>
                            {item?.description?.trim() ? (
                              <span className='text-[10px] font-normal leading-snug text-primary/80'>
                                {item.description}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {meal.notes ? (
                      <p className='mt-2 text-xs text-muted-foreground'>
                        Obs.: {meal.notes}
                      </p>
                    ) : null}
                  </div>
                ))}

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Como prefere receber?</p>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      type='button'
                      onClick={() => setFulfillmentType('PICKUP')}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm transition',
                        fulfillmentType === 'PICKUP'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/60 bg-muted/30 text-muted-foreground',
                      )}
                    >
                      <ShoppingBag className='size-5' />
                      <span className='font-medium'>Retirada</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => setFulfillmentType('DELIVERY')}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm transition',
                        fulfillmentType === 'DELIVERY'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/60 bg-muted/30 text-muted-foreground',
                      )}
                    >
                      <Truck className='size-5' />
                      <span className='font-medium'>Entrega</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 0 && (
            <Card
              variant='compact'
              className='mx-auto mt-auto w-full max-w-md py-3'
            >
              <CardHeader className='gap-1 px-4 pb-2'>
                <CardTitle className='text-base'>Quantas marmitas?</CardTitle>
                {menuLoading ? (
                  <CardDescription>Carregando cardápio…</CardDescription>
                ) : !menu ? (
                  <CardDescription>Sem cardápio para hoje</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className='px-4 pb-1'>
                <div className='flex max-w-xs items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-9 shrink-0 rounded-xl'
                    disabled={quantity <= 1}
                    aria-label='Diminuir quantidade'
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className='size-4' />
                  </Button>
                  <Input
                    id='qty'
                    type='number'
                    min={1}
                    max={50}
                    inputMode='numeric'
                    aria-label='Quantidade de marmitas'
                    value={quantity}
                    className='h-9 flex-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (!Number.isFinite(parsed)) return;
                      setQuantity(Math.min(50, Math.max(1, parsed)));
                    }}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-9 shrink-0 rounded-xl'
                    disabled={quantity >= 50}
                    aria-label='Aumentar quantidade'
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  >
                    <Plus className='size-4' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div
            className={cn(
              'flex gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
              step !== 0 && 'mt-auto',
            )}
          >
            {step > 0 ? (
              <Button
                variant='outline'
                className='flex-1'
                disabled={showMealCheck || showOrderSuccess || savingDraft}
                onClick={back}
              >
                Voltar
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                className='flex-1'
                disabled={savingDraft}
                onClick={() => void confirmCurrentRecipient()}
              >
                <span className='inline-flex items-center justify-center gap-2'>
                  {recipientIndex < meals.length - 1 ? 'Próximo' : 'Continuar'}
                  <ArrowRight className='size-4' />
                </span>
              </Button>
            ) : step === 2 ? (
              <Button
                className='flex-1'
                disabled={showMealCheck || showOrderSuccess || savingDraft}
                onClick={confirmCurrentMeal}
              >
                <span className='inline-flex items-center justify-center gap-2'>
                  {mealIndex < meals.length - 1 ? 'OK' : 'Concluir cardápio'}
                  <Check className='size-4' />
                </span>
              </Button>
            ) : step === 3 ? (
              <Button
                className='flex-1'
                disabled={saveMutation.isPending || showOrderSuccess}
                onClick={() => {
                  if (!fulfillmentType) {
                    toast.error('Escolha retirada ou entrega.');
                    return;
                  }
                  saveMutation.mutate();
                }}
              >
                <span className='inline-flex items-center justify-center gap-2'>
                  <Check className='size-4' />
                  {saveMutation.isPending
                    ? 'Enviando…'
                    : editMode
                      ? 'Salvar alterações'
                      : 'Finalizar pedido'}
                </span>
              </Button>
            ) : step === 0 ? (
              <Button
                className='flex-1'
                disabled={savingDraft}
                onClick={() => void next()}
              >
                <span className='inline-flex items-center justify-center gap-2'>
                  Continuar
                  <ArrowRight className='size-4' />
                </span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {step === 2 && showScrollHint && !showMealCheck ? (
        <div
          className='pointer-events-none absolute right-6 bottom-6 z-20'
          aria-hidden
        >
          <span className='relative flex size-11 items-center justify-center'>
            <span className='absolute inline-flex size-full animate-ping rounded-full bg-primary/35' />
            <span className='relative flex size-10 animate-bounce items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md'>
              <ArrowDown className='size-5' strokeWidth={2.5} />
            </span>
          </span>
        </div>
      ) : null}

      <AnimatePresence>
        {showOrderSuccess ? (
          <OrderSuccessOverlay editMode={editMode} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

