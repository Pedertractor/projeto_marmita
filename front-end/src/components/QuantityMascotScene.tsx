import { AnimatePresence, motion } from 'motion/react';

type QuantityMascotSceneProps = {
  quantity: number;
};

type MarmitaPose = {
  /** % left da imagem do mascote */
  x: number;
  /** % top da imagem do mascote */
  y: number;
  /** % da largura da imagem do mascote */
  w: number;
  z: number;
};

/**
 * Posições em % da arte do mascote. A bandeja ocupa ~3–35% x e ~42–56% y.
 * A base de cada pilha encosta nessa elipse; as de cima nascem sobre as de baixo.
 * 1 central · 2 lado a lado · 3 pirâmide · 4 grade 2×2 · 5 grade + topo · 6 pirâmide 3-2-1.
 */
const STACK_LAYOUTS: Record<number, MarmitaPose[]> = {
  1: [{ x: 8.3, y: 34.1, w: 21.2, z: 1 }],
  2: [
    { x: 4.5, y: 36.8, w: 16.8, z: 1 },
    { x: 16.5, y: 36.8, w: 16.8, z: 2 },
  ],
  3: [
    { x: 5.4, y: 37.5, w: 15.9, z: 1 },
    { x: 16.6, y: 37.5, w: 15.9, z: 2 },
    { x: 11.3, y: 32.8, w: 15.2, z: 3 },
  ],
  4: [
    { x: 7.9, y: 34.7, w: 14.3, z: 1 },
    { x: 15.9, y: 34.7, w: 14.3, z: 2 },
    { x: 6.7, y: 39.1, w: 14.3, z: 3 },
    { x: 16.9, y: 39.1, w: 14.3, z: 4 },
  ],
  5: [
    { x: 7.9, y: 34.7, w: 14.3, z: 1 },
    { x: 15.9, y: 34.7, w: 14.3, z: 2 },
    { x: 6.7, y: 39.1, w: 14.3, z: 3 },
    { x: 16.9, y: 39.1, w: 14.3, z: 4 },
    { x: 12, y: 33.4, w: 13.9, z: 5 },
  ],
  6: [
    { x: 4.1, y: 40.1, w: 12.5, z: 1 },
    { x: 12.7, y: 40.1, w: 12.5, z: 2 },
    { x: 21.3, y: 40.1, w: 12.5, z: 3 },
    { x: 8.5, y: 35, w: 12.3, z: 4 },
    { x: 17.1, y: 35, w: 12.3, z: 5 },
    { x: 13, y: 30.3, w: 11.9, z: 6 },
  ],
};

const MAX_VISIBLE = 6;

function posesForQuantity(quantity: number): MarmitaPose[] {
  const n = Math.min(Math.max(quantity, 1), MAX_VISIBLE);
  return STACK_LAYOUTS[n] ?? STACK_LAYOUTS[MAX_VISIBLE];
}

/** Tigela metade fora à direita, com marmitas empilhadas na bandeja. */
export function QuantityMascotScene({ quantity }: QuantityMascotSceneProps) {
  const poses = posesForQuantity(quantity);
  const visibleCount = Math.min(Math.max(quantity, 0), MAX_VISIBLE);

  return (
    <div className='relative min-h-0 flex-1 overflow-hidden' aria-hidden>
      <div className='pointer-events-none absolute right-0 bottom-0 w-[min(96vw,28rem)] translate-x-[40%] translate-y-[6%] select-none'>
        <div className='relative w-full'>
          <img
            src='/tigela_with_plate.png'
            alt=''
            draggable={false}
            className='block h-auto w-full'
          />

          <AnimatePresence initial={false}>
            {poses.slice(0, visibleCount).map((pose, index) => (
              <motion.img
                key={index}
                src='/marmita.png'
                alt=''
                draggable={false}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 24,
                  mass: 0.7,
                }}
                className='absolute h-auto'
                style={{
                  left: `${pose.x}%`,
                  top: `${pose.y}%`,
                  width: `${pose.w}%`,
                  zIndex: pose.z,
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
