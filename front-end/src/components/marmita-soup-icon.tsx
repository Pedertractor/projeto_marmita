import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type MarmitaSoupIconProps = {
  size?: number;
  className?: string;
};

export function MarmitaSoupIcon({ size = 24, className }: MarmitaSoupIconProps) {
  const reduceMotion = useReducedMotion();

  const steamAnimate = reduceMotion
    ? undefined
    : {
        opacity: [0.35, 1, 0.35],
        y: [1, -2.5, 1],
      };

  const steamTransition = (delay: number) =>
    reduceMotion
      ? undefined
      : {
          duration: 1.75,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay,
        };

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z' />
      <path d='M7 21h10' />
      <path d='M19.5 12 22 6' />
      <motion.path
        d='M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62'
        animate={steamAnimate}
        transition={steamTransition(0)}
      />
      <motion.path
        d='M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62'
        animate={steamAnimate}
        transition={steamTransition(0.22)}
      />
      <motion.path
        d='M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62'
        animate={steamAnimate}
        transition={steamTransition(0.44)}
      />
    </svg>
  );
}
