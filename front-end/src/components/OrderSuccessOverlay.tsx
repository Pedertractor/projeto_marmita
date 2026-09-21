import { motion } from 'motion/react';
import { Check, PartyPopper } from 'lucide-react';

type OrderSuccessOverlayProps = {
  editMode?: boolean;
};

/** Tela de sucesso após enviar a solicitação. */
export function OrderSuccessOverlay({ editMode }: OrderSuccessOverlayProps) {
  return (
    <motion.div
      className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className='relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl'
        initial={{ scale: 0.3, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
      >
        <Check className='size-12' strokeWidth={3} />
        <motion.span
          className='absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full bg-card text-primary shadow-md'
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 16 }}
        >
          <PartyPopper className='size-4' />
        </motion.span>
      </motion.div>

      <motion.h2
        className='mt-6 text-center text-xl font-semibold tracking-tight'
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {editMode ? 'Pedido atualizado!' : 'Solicitação concluída!'}
      </motion.h2>
      <motion.p
        className='mt-2 max-w-xs text-center text-sm text-muted-foreground'
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
      >
        {editMode
          ? 'As alterações foram salvas com sucesso.'
          : 'Sua solicitação de marmitas foi enviada.'}
      </motion.p>
    </motion.div>
  );
}
