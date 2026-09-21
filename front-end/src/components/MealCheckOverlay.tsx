import { motion } from 'motion/react';
import { Check } from 'lucide-react';

type MealCheckOverlayProps = {
  recipientName: string;
};

/** Confirmação ao concluir uma marmita (topo do card, após scroll). */
export function MealCheckOverlay({ recipientName }: MealCheckOverlayProps) {
  return (
    <motion.div
      className='flex min-h-[min(52vh,360px)] flex-col items-center justify-start px-6 pt-10 pb-8'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className='flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg'
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 16 }}
      >
        <Check className='size-10' strokeWidth={3} />
      </motion.div>
      <motion.p
        className='mt-4 max-w-xs text-center text-sm font-medium'
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        Marmita de {recipientName || 'destinatário'} pronta
      </motion.p>
    </motion.div>
  );
}
