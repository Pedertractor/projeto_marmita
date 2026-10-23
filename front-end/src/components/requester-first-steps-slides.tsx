import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';

export type FirstStep = {
  id: string;
  title: string;
  points: string[];
  description?: string;
  Preview: () => ReactNode;
};

export function slideBodyText(slide: FirstStep) {
  return slide.description ?? slide.points.join(' ');
}

export function SlideBody({ slide }: { slide: FirstStep }) {
  if (slide.description) {
    return (
      <p className='mt-3 text-center text-sm leading-relaxed text-muted-foreground md:text-left'>
        {slide.description}
      </p>
    );
  }
  return <SlidePoints points={slide.points} />;
}

export function SlidePoints({ points }: { points: string[] }) {
  return (
    <ul className='mt-3 list-disc space-y-1.5 pl-5 text-left text-sm leading-relaxed text-muted-foreground'>
      {points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  );
}

function AppPreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className='mx-auto flex w-full max-w-60 flex-col overflow-hidden rounded-[1.6rem] bg-background shadow-card ring-1 ring-border'
    >
      <div className='flex h-6 items-center justify-center bg-muted/60'>
        <span className='h-1 w-10 rounded-full bg-foreground/15' />
      </div>
      <div className='flex flex-col gap-2 px-3 pt-2 pb-3'>{children}</div>
    </div>
  );
}

function WelcomePreview() {
  return (
    <div className='flex flex-col items-center' aria-hidden>
      <div className='relative mb-3 max-w-66 rounded-2xl bg-card px-3.5 py-2.5 text-center text-sm leading-snug font-medium shadow-card ring-1 ring-border'>
        Oi, eu sou o Tigela e vou te mostrar como funciona o sistema!
        <span className='absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-border' />
        <span className='absolute top-full left-1/2 -mt-px -translate-x-1/2 border-x-[7px] border-t-[7px] border-x-transparent border-t-card' />
      </div>
      <img
        src='/tigela_logo.png'
        alt=''
        draggable={false}
        className='h-44 w-auto object-contain md:h-52'
      />
    </div>
  );
}

function HomePreview() {
  return (
    <AppPreviewFrame>
      <p className='text-xs font-semibold'>Início</p>
      <div className='relative flex items-center overflow-hidden rounded-xl bg-card px-2.5 py-2 shadow-sm'>
        <img
          src='/tigela_sad_logo.png'
          alt=''
          aria-hidden
          draggable={false}
          className='pointer-events-none absolute top-1/2 -right-2 h-[130%] w-[42%] -translate-y-1/2 object-contain object-right'
        />
        <div className='relative z-10 w-[58%]'>
          <p className='text-[11px] font-medium'>Pedidos de hoje</p>
          <p className='mt-0.5 text-[10px] leading-snug text-muted-foreground'>
            Nenhuma solicitação
          </p>
        </div>
      </div>
      <div className='rounded-xl bg-primary/10 px-2.5 py-2'>
        <p className='flex items-center gap-1 text-[11px] font-medium'>
          <MarmitaSoupIcon size={12} className='text-primary' />
          Cardápio de hoje
        </p>
        <div className='mt-1.5 flex flex-wrap gap-1'>
          {['Arroz', 'Feijão', 'Frango'].map((item) => (
            <span
              key={item}
              className='rounded-full bg-background px-2 py-0.5 text-[10px] shadow-sm'
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className='rounded-full bg-primary px-2 py-1.5 text-center text-[11px] font-medium text-primary-foreground'>
        Solicitar marmitas
      </div>
    </AppPreviewFrame>
  );
}

function OrdersPreview() {
  return (
    <AppPreviewFrame>
      <div className='flex items-center justify-between'>
        <p className='text-xs font-semibold'>Meus pedidos</p>
        <span className='rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground'>
          Novo
        </span>
      </div>
      <div className='flex items-center justify-between gap-2 rounded-xl bg-muted/70 px-2.5 py-2'>
        <div>
          <p className='text-[11px] font-medium'>#1042</p>
          <p className='text-[10px] text-muted-foreground'>
            2 marmitas
          </p>
        </div>
        <span className='rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800'>
          Enviado
        </span>
      </div>
      <div className='flex items-center justify-between gap-2 rounded-xl bg-muted/70 px-2.5 py-2'>
        <div>
          <p className='text-[11px] font-medium'>Rascunho</p>
          <p className='text-[10px] text-muted-foreground'>
            #1043 · continue de onde parou
          </p>
        </div>
        <span className='inline-flex items-center text-[10px] font-medium text-primary'>
          Continuar
          <ChevronRight className='size-3' />
        </span>
      </div>
    </AppPreviewFrame>
  );
}

const ORDER_STEPS = [
  { title: 'Quantidade', detail: 'Quantas marmitas' },
  { title: 'Destinatários', detail: 'Nome de quem recebe' },
  { title: 'Cardápio', detail: 'Itens e observações' },
  { title: 'Finalizar', detail: 'Confira e envie' },
];

function FlowPreview() {
  return (
    <AppPreviewFrame>
      <p className='text-xs font-semibold'>Novo pedido</p>
      <ol className='space-y-1.5'>
        {ORDER_STEPS.map((step, index) => (
          <li key={step.title} className='flex items-center gap-2'>
            <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground'>
              {index + 1}
            </span>
            <span className='min-w-0'>
              <span className='block text-[11px] leading-tight font-medium'>
                {step.title}
              </span>
              <span className='block text-[10px] leading-tight text-muted-foreground'>
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </AppPreviewFrame>
  );
}

export const FIRST_STEPS: FirstStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo!',
    points: [],
    description:
      'Seu usuário foi aprovado e vamos te mostrar como funciona a plataforma para fazer os pedidos das marmitas!',
    Preview: WelcomePreview,
  },
  {
    id: 'home',
    title: 'Início',
    points: [
      'Você pode verificar se já realizou um pedido e acompanhar o preparo da sua marmita.',
      'Aqui, será exibido o cardápio do dia, caso ele já tenha sido cadastrado pelo restaurante.',
      'Clique em "Solicitar marmita" para iniciar um novo pedido!',
    ],
    Preview: HomePreview,
  },
  {
    id: 'orders',
    title: 'Pedidos',
    points: [
      'A lista mostra o código, a quantidade e o status.',
      'Um rascunho continua de onde você parou.',
      'Um pedido enviado abre o acompanhamento.',
    ],
    Preview: OrdersPreview,
  },
  {
    id: 'flow',
    title: 'Como pedir',
    points: [
      'Informe a quantidade e quem vai receber.',
      'Ajuste o cardápio e as observações.',
      'Confira o resumo e finalize o pedido.',
    ],
    Preview: FlowPreview,
  },
];
