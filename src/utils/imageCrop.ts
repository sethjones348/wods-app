/**
 * Crop an image to the specified region
 * @param imageSrc - Source image (base64 data URL or image element)
 * @param crop - Crop region with x, y, width, height (in pixels or percentages)
 * @param pixelCrop - Whether crop values are in pixels (true) or percentages (false)
 * @returns Base64 encoded cropped image
 */
export async function cropImage(
  imageSrc: string | HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  pixelCrop: boolean = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSrc === 'string' ? new Image() : imageSrc;
    
    if (typeof imageSrc === 'string') {
      img.onload = () => performCrop();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    } else {
      performCrop();
    }
    
    function performCrop() {
      try {
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        
        // Convert crop coordinates to pixels if needed
        const pixelX = pixelCrop ? crop.x : (crop.x / 100) * img.naturalWidth;
        const pixelY = pixelCrop ? crop.y : (crop.y / 100) * img.naturalHeight;
        const pixelWidth = pixelCrop ? crop.width : (crop.width / 100) * img.naturalWidth;
        const pixelHeight = pixelCrop ? crop.height : (crop.height / 100) * img.naturalHeight;
        
        // Create canvas for cropped image
        const canvas = document.createElement('canvas');
        canvas.width = pixelWidth * scaleX;
        canvas.height = pixelHeight * scaleY;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw cropped portion
        ctx.drawImage(
          img,
          pixelX * scaleX,
          pixelY * scaleY,
          pixelWidth * scaleX,
          pixelHeight * scaleY,
          0,
          0,
          pixelWidth * scaleX,
          pixelHeight * scaleY
        );
        
        // Convert to base64
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedBase64);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to crop image'));
      }
    }
  });
}


