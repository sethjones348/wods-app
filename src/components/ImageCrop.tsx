import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropProps {
  src: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
  aspect?: number; // Optional aspect ratio (e.g., 1 for square, 4/3 for 4:3, undefined for free crop)
}

export default function ImageCrop({ src, onCropComplete, onCancel, aspect }: ImageCropProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    if (aspect) {
      // Create a centered crop with the specified aspect ratio
      const crop = makeAspectCrop(
        {
          unit: '%',
          width: 90, // Start with 90% of the image
        },
        aspect,
        width,
        height
      );
      setCrop(centerCrop(crop, width, height));
    } else {
      // Free crop - start with a centered crop covering 90% of the image
      const crop: Crop = {
        unit: '%',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      };
      setCrop(crop);
    }
  }, [aspect]);

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    
    if (!canvas) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to the cropped area
    const pixelRatio = window.devicePixelRatio;
    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    // Convert to base64
    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
    onCropComplete(croppedBase64);
  }, [completedCrop, onCropComplete]);

  const handleDone = () => {
    if (completedCrop) {
      getCroppedImg();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-heading font-bold mb-2">Crop Image</h3>
        <p className="text-sm text-gray-600">
          Adjust the crop area to focus on your workout whiteboard
        </p>
      </div>
      
      <div className="flex justify-center mb-4 max-w-full overflow-hidden">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          className="max-w-full"
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={src}
            style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>

      {/* Hidden canvas for cropping */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          disabled={!completedCrop}
          className="px-4 py-2 bg-cf-red text-white rounded font-semibold hover:bg-cf-red-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Done
        </button>
      </div>
    </div>
  );
}

