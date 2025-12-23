import { useState, useRef, DragEvent } from 'react';
import exifr from 'exifr';

interface ImageUploadProps {
  onUpload: (imageBase64: string, dateTaken?: string) => void;
  isLoading: boolean;
  uploadedImage: string | null;
}

export default function ImageUpload({
  onUpload,
  isLoading,
  uploadedImage,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        onUpload(result, dateTaken);
      }
    };
    reader.readAsDataURL(file);
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
  };

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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-3 border-dashed rounded-lg p-6 sm:p-12 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-cf-red bg-red-50'
          : 'border-gray-300 bg-gray-50 hover:border-cf-red hover:bg-white'
      }`}
      onClick={() => fileInputRef.current?.click()}
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
        <span className="md:hidden">Tap to take a photo or choose from gallery</span>
        <span className="hidden md:inline">Drag and drop your whiteboard photo here, or click to browse</span>
      </p>
      <button
        type="button"
        className="bg-cf-red text-white px-6 py-3 rounded font-semibold uppercase tracking-wider hover:bg-cf-red-hover transition-all min-h-[44px] md:min-h-[44px]"
      >
        <span className="md:hidden">Take Photo</span>
        <span className="hidden md:inline">Choose File</span>
      </button>
    </div>
  );
}

