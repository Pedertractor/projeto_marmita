import { LoginForm } from '@/components/login-form';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthSceneAnimationProvider } from '@/components/auth-scene-animation';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';

export function LoginPage() {
  return (
    <AuthSceneAnimationProvider>
      <div className='relative flex h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10'>
        <div className='relative z-10 flex w-full max-w-sm flex-col gap-6'>
          <div className='flex flex-col gap-2'>
            <a
              href='/'
              className='flex items-center gap-2.5 self-center text-lg font-semibold'
            >
              <div className='flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                <MesaSoupIcon size={20} />
              </div>
              Mesa
            </a>
            <LoginForm />
          </div>
          <AuthAttribution />
        </div>
      </div>
    </AuthSceneAnimationProvider>
  );
}
