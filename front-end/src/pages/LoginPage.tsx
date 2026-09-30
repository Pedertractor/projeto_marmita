import { LoginForm } from '@/components/login-form';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthSceneAnimationProvider } from '@/components/auth-scene-animation';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';
import { cn } from '@/lib/utils';

export function LoginPage() {
  return (
    <AuthSceneAnimationProvider>
      <div className='relative flex h-svh flex-col overflow-hidden bg-background md:bg-transparent md:p-6'>
        <div
          className={cn(
            'relative z-10 mx-auto flex h-full w-full max-w-sm min-h-0 flex-col overflow-hidden isolate',
            'bg-background',
            'md:rounded-2xl md:bg-card md:shadow-card',
          )}
        >
          <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain py-6'>
            <div className='flex flex-col gap-4 pb-2'>
              <a
                href='/'
                className='flex shrink-0 items-center gap-2 self-center text-base font-semibold tracking-tight text-foreground md:gap-2.5 md:text-lg'
              >
                <div className='flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-9'>
                  <MesaSoupIcon size={20} />
                </div>
                Mesa
              </a>
              <LoginForm />
              <div className='px-4 md:px-6'>
                <AuthAttribution />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthSceneAnimationProvider>
  );
}
