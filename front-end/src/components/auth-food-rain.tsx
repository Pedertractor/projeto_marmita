import {
  Apple,
  ChefHat,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';

type Drop = {
  Icon: LucideIcon;
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
};

/** Fixed layout so hydration stays stable and the rain feels intentional, not noisy. */
const DROPS: Drop[] = [
  { Icon: Soup, left: '6%', size: 22, duration: 14, delay: 0, opacity: 0.22, drift: -18 },
  { Icon: Coffee, left: '14%', size: 18, duration: 16, delay: 2.4, opacity: 0.18, drift: 12 },
  { Icon: Pizza, left: '22%', size: 26, duration: 13, delay: 5.1, opacity: 0.2, drift: -10 },
  { Icon: Salad, left: '31%', size: 20, duration: 17, delay: 1.2, opacity: 0.16, drift: 16 },
  { Icon: Cookie, left: '40%', size: 17, duration: 15, delay: 7.8, opacity: 0.2, drift: -14 },
  { Icon: CookingPot, left: '48%', size: 24, duration: 18, delay: 3.6, opacity: 0.15, drift: 8 },
  { Icon: ChefHat, left: '56%', size: 21, duration: 14.5, delay: 9.2, opacity: 0.19, drift: -20 },
  { Icon: UtensilsCrossed, left: '64%', size: 19, duration: 16.5, delay: 0.8, opacity: 0.17, drift: 14 },
  { Icon: Sandwich, left: '72%', size: 23, duration: 13.5, delay: 6.4, opacity: 0.21, drift: -8 },
  { Icon: Croissant, left: '80%', size: 20, duration: 17.5, delay: 4.2, opacity: 0.16, drift: 18 },
  { Icon: Apple, left: '88%', size: 18, duration: 15.5, delay: 11, opacity: 0.18, drift: -12 },
  { Icon: Soup, left: '10%', size: 16, duration: 19, delay: 12.5, opacity: 0.14, drift: 10 },
  { Icon: Pizza, left: '36%', size: 15, duration: 18.5, delay: 8.6, opacity: 0.13, drift: -16 },
  { Icon: Coffee, left: '68%', size: 17, duration: 16, delay: 13.8, opacity: 0.15, drift: 11 },
  { Icon: Cookie, left: '92%', size: 21, duration: 14, delay: 2.1, opacity: 0.17, drift: -9 },
  { Icon: Salad, left: '26%', size: 19, duration: 20, delay: 15.2, opacity: 0.12, drift: 15 },
];

export function AuthFoodRainBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className='pointer-events-none absolute inset-0 z-0 overflow-hidden'
      aria-hidden
    >
      <div className='absolute inset-0 bg-[linear-gradient(160deg,hsl(0_0%_100%)_0%,hsl(152_40%_98%)_42%,hsl(152_35%_96%)_72%,hsl(40_30%_97%)_100%)]' />

      {!reduceMotion
        ? DROPS.map((drop, index) => (
            <span
              key={index}
              className='auth-food-rain-drop absolute top-0 text-primary'
              style={{
                left: drop.left,
                opacity: drop.opacity,
                ['--auth-rain-duration' as string]: `${drop.duration}s`,
                ['--auth-rain-delay' as string]: `${drop.delay}s`,
                ['--auth-rain-drift' as string]: `${drop.drift}px`,
              }}
            >
              <drop.Icon size={drop.size} strokeWidth={1.5} />
            </span>
          ))
        : null}
    </div>
  );
}
