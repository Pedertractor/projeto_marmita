import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCroppedImage } from '@/lib/crop-image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataUrl: string) => void;
};

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    },
    [],
  );

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const dataUrl = await getCroppedImage(imageSrc, croppedAreaPixels);
      onConfirm(dataUrl);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível recortar a foto.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Ajuste sua foto</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-1'>
          <div className='relative h-72 w-full overflow-hidden rounded-xl bg-muted'>
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape='round'
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='avatar-zoom'>Zoom</Label>
            <Slider
              id='avatar-zoom'
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            onClick={() => void handleConfirm()}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                Processando…
              </>
            ) : (
              'Usar foto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
