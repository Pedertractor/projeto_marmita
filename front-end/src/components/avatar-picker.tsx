import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarCropDialog } from '@/components/avatar-crop-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/get-initials';
import { resolveAvatarUrl } from '@/utils/avatar-url';

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

type AvatarPickerProps = {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  className?: string;
  label?: string;
  hint?: string;
  /** Só o avatar clicável (sem botão e texto de ajuda). */
  compact?: boolean;
};

export function AvatarPicker({
  value,
  onChange,
  name = '',
  required = false,
  disabled = false,
  uploading = false,
  className,
  label = 'Sua foto',
  hint,
  compact = false,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const preview = value?.startsWith('data:')
    ? value
    : resolveAvatarUrl(value);

  function openFilePicker() {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('A imagem deve ter no máximo 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        toast.error('Não foi possível ler a imagem.');
        return;
      }
      setCropSrc(result);
      setCropOpen(true);
    };
    reader.onerror = () => {
      toast.error('Não foi possível ler a imagem.');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <p className='text-sm font-medium leading-none'>
          {label}
          {required ? <span className='text-destructive'> *</span> : null}
        </p>
      ) : null}

      <div className={cn('flex items-center', !compact && 'gap-4')}>
        <button
          type='button'
          onClick={openFilePicker}
          disabled={disabled || uploading}
          className={cn(
            'group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
            (disabled || uploading) && 'pointer-events-none opacity-60',
          )}
          aria-label={value ? 'Trocar foto' : 'Adicionar foto'}
        >
          <Avatar className='size-20'>
            <AvatarImage src={preview} alt={name || 'Foto do usuário'} />
            <AvatarFallback className='bg-muted text-base'>
              {uploading ? (
                <Loader2 className='size-5 animate-spin text-muted-foreground' />
              ) : name ? (
                getInitials(name)
              ) : (
                <Camera className='size-6 text-muted-foreground' />
              )}
            </AvatarFallback>
          </Avatar>
          <span className='absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
            <Camera className='size-5 text-white' />
          </span>
        </button>

        {!compact ? (
          <div className='min-w-0 flex-1 space-y-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={openFilePicker}
              disabled={disabled || uploading}
            >
              {value ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            {hint ? (
              <p className='text-xs text-muted-foreground'>{hint}</p>
            ) : (
              <p className='text-xs text-muted-foreground'>
                {required
                  ? 'Obrigatória. Selecione a região do rosto para o avatar.'
                  : 'Selecione a região do rosto para o avatar.'}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        capture='user'
        className='hidden'
        onChange={handleFileChange}
      />

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setCropSrc(null);
        }}
        onConfirm={(dataUrl) => {
          onChange(dataUrl);
          setCropSrc(null);
        }}
      />
    </div>
  );
}
