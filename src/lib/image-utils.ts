import imageCompression from 'browser-image-compression';

export async function compressAndResizeImage(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 256,
    useWebWorker: true,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    return compressedBlob;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

export function getImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export async function getCroppedImage(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  rotation: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Set canvas size to the crop size
      canvas.width = crop.width;
      canvas.height = crop.height;

      // Apply rotation if needed
      if (rotation) {
        ctx.translate(crop.width / 2, crop.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-crop.width / 2, -crop.height / 2);
      }

      // Draw cropped image
      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => reject(new Error('Failed to load image'));
  });
}
