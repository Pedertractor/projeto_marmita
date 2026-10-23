export type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () =>
      reject(new Error('Não foi possível carregar a imagem.')),
    );
    image.src = src;
  });
}

export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas não disponível.');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  const webp = canvas.toDataURL('image/webp', 0.85);
  if (webp.startsWith('data:image/webp')) {
    return webp;
  }
  return canvas.toDataURL('image/jpeg', 0.85);
}
