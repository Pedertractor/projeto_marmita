import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';

const RIDER_ORGANIZED = '/entregador_organizado.png';
const RIDER_CHAOS = '/entregador.png';
const RESTAURANT = '/restaurante.png';
const LOMBADA = '/lombada.png';

const DURATION_S = 16;
const DESKTOP_MQ = '(min-width: 1024px)';

/** Horizontal path (vw): rider crosses in front of the restaurant on the left. */
const RIDER_X_FROM = '105vw';
const RIDER_X_TO = '-28vw';

/** Lombada near the bottom-left of the login/register card. */
const LOMBADA_LEFT = 'calc(14.5vw + min(17.6vw, 207px))';

type AuthSceneAnimationContextValue = {
  footerRef: RefObject<HTMLParagraphElement | null>;
  footerReveal: number;
  reduceMotion: boolean | null;
};

const AuthSceneAnimationContext =
  createContext<AuthSceneAnimationContextValue | null>(null);

function isDesktopScene() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

/** Scooter faces left: front wheel on the leading (left) edge, rear on the right. */
const FRONT_WHEEL_X_RATIO = 0.14;
const REAR_WHEEL_X_RATIO = 0.88;

function riderSpriteForLombadaCrossing(
  rider: DOMRect,
  lombada: DOMRect,
  progress: number,
): typeof RIDER_ORGANIZED | typeof RIDER_CHAOS {
  if (progress < 0.008) return RIDER_ORGANIZED;

  const frontWheelX = rider.left + rider.width * FRONT_WHEEL_X_RATIO;
  /** Moving left: swap when the front wheel reaches the lombada (right edge first). */
  const frontWheelOnLombada = frontWheelX <= lombada.right;

  return frontWheelOnLombada ? RIDER_CHAOS : RIDER_ORGANIZED;
}

function computeFooterReveal(
  footer: DOMRect,
  rider: DOMRect,
  progress: number,
): number {
  if (progress < 0.015) return 0;

  const wheelX = rider.left + rider.width * REAR_WHEEL_X_RATIO;

  if (wheelX >= footer.right) return 0;
  if (wheelX <= footer.left) return 1;

  return (footer.right - wheelX) / footer.width;
}

export function AuthSceneAnimationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const x = useTransform(progress, [0, 1], [RIDER_X_FROM, RIDER_X_TO]);
  const riderRef = useRef<HTMLDivElement>(null);
  const lombadaRef = useRef<HTMLImageElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);
  const [footerReveal, setFooterReveal] = useState(0);
  const [riderSrc, setRiderSrc] = useState(RIDER_ORGANIZED);

  const updateFooterReveal = useCallback(() => {
    if (reduceMotion) {
      setFooterReveal(1);
      return;
    }

    if (!isDesktopScene()) {
      setFooterReveal(1);
      return;
    }

    const footerEl = footerRef.current;
    const riderEl = riderRef.current;
    if (!footerEl || !riderEl) {
      setFooterReveal(0);
      return;
    }

    const reveal = computeFooterReveal(
      footerEl.getBoundingClientRect(),
      riderEl.getBoundingClientRect(),
      progress.get(),
    );
    setFooterReveal(reveal);
  }, [progress, reduceMotion]);

  const updateRiderSprite = useCallback(() => {
    if (reduceMotion) return;

    const riderEl = riderRef.current;
    const lombadaEl = lombadaRef.current;
    if (!riderEl || !lombadaEl) return;

    const next = riderSpriteForLombadaCrossing(
      riderEl.getBoundingClientRect(),
      lombadaEl.getBoundingClientRect(),
      progress.get(),
    );
    setRiderSrc((prev) => (prev === next ? prev : next));
  }, [progress, reduceMotion]);

  useMotionValueEvent(progress, 'change', () => {
    updateRiderSprite();
    updateFooterReveal();
  });

  useEffect(() => {
    if (reduceMotion) {
      progress.set(0);
      setRiderSrc(RIDER_ORGANIZED);
      setFooterReveal(1);
      return;
    }

    const controls = animate(progress, 1, {
      duration: DURATION_S,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
    });

    return () => controls.stop();
  }, [progress, reduceMotion]);

  useEffect(() => {
    updateRiderSprite();
    updateFooterReveal();
    window.addEventListener('resize', updateRiderSprite);
    window.addEventListener('resize', updateFooterReveal);
    return () => {
      window.removeEventListener('resize', updateRiderSprite);
      window.removeEventListener('resize', updateFooterReveal);
    };
  }, [updateFooterReveal, updateRiderSprite]);

  return (
    <AuthSceneAnimationContext.Provider
      value={{ footerRef, footerReveal, reduceMotion }}
    >
      <div
        className='pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block'
        aria-hidden
      >
        <img
          src={RESTAURANT}
          alt=''
          className='absolute bottom-0 -left-[min(22vw,240px)] w-[min(48vw,560px)] origin-bottom-left select-none object-contain object-left-bottom opacity-90'
          draggable={false}
        />

        <img
          ref={lombadaRef}
          src={LOMBADA}
          alt=''
          className='absolute bottom-0 w-[min(16vw,190px)] -translate-x-1/2 translate-y-[32%] select-none object-contain drop-shadow-sm'
          style={{ left: LOMBADA_LEFT }}
          draggable={false}
        />

        {!reduceMotion ? (
          <motion.div
            ref={riderRef}
            className='absolute bottom-[2%] left-0 h-[min(14vw,165px)] w-[min(20vw,235px)]'
            style={{ x }}
          >
            <img
              src={riderSrc}
              alt=''
              className='size-full select-none object-contain object-left-bottom drop-shadow-sm'
              draggable={false}
            />
          </motion.div>
        ) : null}
      </div>
      {children}
    </AuthSceneAnimationContext.Provider>
  );
}

export function useAuthSceneAnimation() {
  const ctx = useContext(AuthSceneAnimationContext);
  if (!ctx) {
    throw new Error(
      'useAuthSceneAnimation must be used within AuthSceneAnimationProvider',
    );
  }
  return ctx;
}
