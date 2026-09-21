import { useAuthSceneAnimation } from '@/components/auth-scene-animation';

export function AuthAttribution() {
  const { footerRef, footerReveal, reduceMotion } = useAuthSceneAnimation();

  const useReveal = reduceMotion !== true;

  return (
    <p
      ref={footerRef}
      className='text-center text-xs text-muted-foreground max-lg:[clip-path:none]'
      style={
        useReveal
          ? {
              clipPath: `inset(0 0 0 ${(1 - footerReveal) * 100}%)`,
            }
          : undefined
      }
    >
      @Mesa - Powered by Automação Pedertractor
    </p>
  );
}
