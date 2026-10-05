import { LoginForm } from '@/components/login-form';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthFoodRainBackground } from '@/components/auth-food-rain';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';
import { cn } from '@/lib/utils';

export function LoginPage() {
  return (
    <div className='relative flex h-svh flex-col overflow-hidden md:p-4'>
      <AuthFoodRainBackground />
      <div className='relative z-10 mx-auto flex h-full w-full max-w-sm flex-col justify-evenly gap-2 py-2 md:justify-center md:gap-3 md:py-0'>
        <a
          href='/'
          className='hidden shrink-0 items-center gap-2 self-center text-base font-semibold tracking-tight text-foreground md:flex md:gap-2.5 md:text-lg'
        >
          <div className='flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <MarmitaSoupIcon size={20} />
          </div>
          Marmita
        </a>

        <div
          className={cn(
            'flex min-h-0 shrink flex-col isolate',
            'bg-background/95 backdrop-blur-[2px]',
            'md:rounded-2xl md:bg-card md:shadow-card md:backdrop-blur-none',
          )}
        >
          <div className='py-4 md:py-5'>
            <div className='flex flex-col gap-2'>
              <a
                href='/'
                className='flex shrink-0 items-center gap-2 self-center text-base font-semibold tracking-tight text-foreground md:hidden'
              >
                <div className='flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                  <MarmitaSoupIcon size={20} />
                </div>
                Marmita
              </a>
              <LoginForm />
              <div className='px-4 md:hidden'>
                <AuthAttribution />
              </div>
            </div>
          </div>
        </div>

        <div className='hidden shrink-0 md:block'>
          <AuthAttribution />
        </div>
      </div>
    </div>
  );
}
