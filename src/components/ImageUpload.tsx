import { useState, useRef, DragEvent } from 'react';
import exifr from 'exifr';
import ImageCrop from './ImageCrop';

interface ImageUploadProps {
  onUpload: (imageBase64: string, dateTaken?: string) => void;
  onTextSubmit?: (text: string) => void;
  isLoading: boolean;
  uploadedImage: string | null;
}

export default function ImageUpload({
  onUpload,
  onTextSubmit,
  isLoading,
  uploadedImage,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [exifDate, setExifDate] = useState<string | undefined>(undefined);
  const [entryMode, setEntryMode] = useState<'upload' | 'manual'>('upload');
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Try to extract EXIF date
    let dateTaken: string | undefined;
    try {
      const exifData = await exifr.parse(file, { 
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] 
      });
      
      // Try DateTimeOriginal first, then CreateDate, then ModifyDate
      const dateValue = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
      if (dateValue) {
        // exifr returns dates in various formats, convert to ISO string
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (!isNaN(date.getTime())) {
          dateTaken = date.toISOString();
        }
      }
    } catch (err) {
      console.warn('Failed to extract EXIF date:', err);
      // Continue without date - will default to upload date
    }

    // Store EXIF date for later use
    setExifDate(dateTaken);

    // Load image for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageToCrop(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setImageToCrop(null);
    onUpload(croppedImageBase64, exifDate);
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
    setExifDate(undefined);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim() && onTextSubmit) {
      onTextSubmit(manualText.trim());
      setManualText('');
    }
  };

  // Show crop interface if image is ready to be cropped
  if (imageToCrop) {
    return (
      <ImageCrop
        src={imageToCrop}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    );
  }

  // Show uploaded image with extraction status
  if (uploadedImage) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <img
          src={uploadedImage}
          alt="Uploaded workout"
          className="max-w-full rounded-lg mb-4"
        />
        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cf-red"></div>
            <p className="mt-2 text-gray-600">Extracting workout data...</p>
          </div>
        )}
      </div>
    );
  }

  // Manual text entry mode
  if (entryMode === 'manual') {
    return (
      <div className="border-3 border-dashed rounded-lg p-6 sm:p-12 bg-gray-50">
        <div className="text-4xl sm:text-5xl mb-4 text-center">✍️</div>
        <h3 className="text-lg sm:text-xl font-heading font-bold mb-2 text-center">
          Manual Entry
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 px-2 text-center">
          Describe your workout in text format
        </p>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Example:&#10;E5MOM&#10;5 Deadlifts 315 lbs&#10;10 Burpees&#10;15 Wall Balls 20 lbs&#10;&#10;Finish Time: 15:00"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-cf-red outline-none resize-y min-h-[200px] font-mono text-sm"
          rows={10}
        />
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button
            type="button"
            onClick={handleManualTextSubmit}
            disabled={!manualText.trim() || isLoading}
            className="bg-cf-red text-white px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Process Text'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('upload');
              setManualText('');
            }}
            className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded font-semibold uppercase tracking-wider hover:border-gray-400 transition-all min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-3 border-dashed rounded-lg p-6 sm:p-12 text-center transition-all ${
        isDragging
          ? 'border-cf-red bg-red-50'
          : 'border-gray-300 bg-gray-50 hover:border-cf-red hover:bg-white'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="text-4xl sm:text-5xl mb-4">📸</div>
      <h3 className="text-lg sm:text-xl font-heading font-bold mb-2">
        Upload Workout Photo
      </h3>
      <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">
        <span className="md:hidden">Upload a photo of your workout whiteboard</span>
        <span className="hidden md:inline">Drag and drop your whiteboard photo here, or click to browse</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={handleUploadClick}
          className="bg-cf-red text-white px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px]"
        >
          Upload Photo
        </button>
        <button
          type="button"
          onClick={handleCameraClick}
          className="bg-white border-2 border-cf-red text-cf-red px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-red-50 transition-all min-h-[44px] md:hidden"
        >
          📷 Take Photo
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('manual')}
          className="bg-white border-2 border-cf-red text-cf-red px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-red-50 transition-all min-h-[44px]"
        >
          ✍️ Manual Entry
        </button>
      </div>
    </div>
  );
}

