'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { getLargeThumbnailUrl } from '@/lib/utils/google-drive';

export default function PhotoUpload({
  onFileSelect,
  onUploadError,
  userName,
  currentImageUrl,
  disabled = false,
  required = false,
  showMessage = false,
}: {
  onFileSelect: (file: File | null) => void;
  onUploadError?: (error: string) => void;
  userName: string;
  currentImageUrl?: string;
  disabled?: boolean;
  required?: boolean;
  showMessage?: boolean;
}) {
  // Initialize preview with current image URL if available (convert to thumbnail)
  const getPreviewUrl = (url: string | null | undefined) => {
    if (!url) return null;
    // Use larger thumbnail for better quality
    return getLargeThumbnailUrl(url) || url;
  };

  // Declare all state and refs first, before useEffect
  const [preview, setPreview] = useState<string | null>(getPreviewUrl(currentImageUrl));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadedUrlRef = useRef<string | null>(null); // Track the last URL we uploaded to prevent preview reset

  // Update preview when currentImageUrl changes (e.g., after page refresh)
  // But don't override if we just uploaded a new photo
  useEffect(() => {
    // Skip update if this is the URL we just uploaded (prevents race condition)
    if (lastUploadedUrlRef.current && currentImageUrl === lastUploadedUrlRef.current) {
      return; // Don't update, we already have the correct preview set
    }

    if (currentImageUrl) {
      // Convert to thumbnail URL for display
      const thumbnailUrl = getLargeThumbnailUrl(currentImageUrl);
      setPreview(thumbnailUrl || currentImageUrl);
      // Don't automatically mark as success on initial load - only on actual upload
    } else {
      // Only clear preview if we're not currently uploading
      if (!uploading) {
        setPreview(null);
        setUploadSuccess(false);
      }
    }
  }, [currentImageUrl, uploading]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent any default form behavior
    e.stopPropagation(); // Stop event bubbling

    const file = e.target.files?.[0];
    if (!file) return;

    // Reset success state when selecting a new file
    setUploadSuccess(false);
    setShowSuccessMessage(false);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      if (onUploadError) onUploadError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // File size check removed as per requirement (unlimited uploads)

    // Create temporary preview (will be replaced with actual URL after upload)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Compress and Upload
    try {
      setUploading(true);
      // Optional: Set a "Compressing..." state here if you want granular UI updates

      const { compressImage } = await import('@/lib/utils/image-compression');
      const compressedFile = await compressImage(file, { maxWidth: 1000, quality: 0.7 });

      console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`);

      // Pass file to parent
      onFileSelect(compressedFile);
    } catch (error: any) {
      console.error('Compression error:', error);
      // Fallback to original file if compression fails
      onFileSelect(file);
      if (onUploadError) onUploadError('Image compression failed, using original file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    // Don't allow removal if photo is required
    if (required) {
      return;
    }
    setPreview(null);
    setUploadSuccess(false); // Reset success state when removing
    setShowSuccessMessage(false); // Hide success message when removing
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null);
  };

  // Check if location is required but not provided
  // Removed location check as upload is deferred
  const isLocationRequired = false;
  const isUploadDisabled = disabled || uploading || isLocationRequired;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event bubbling
    if (!isUploadDisabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Profile Photo {required && <span className="text-red-500">*</span>}
      </label>

      {showMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Hare Krishna!</span> Please upload your own personal photo (not a Deity photo).
            This helps senior authorities to identify devotees when needed.
          </p>
        </div>
      )}

      {isLocationRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
          <p className="text-sm text-amber-800">
            Please fill in State, City, and Center above to enable photo upload. This helps organize photos in the correct folder.
          </p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* Preview */}
        {preview && (
          <div className="relative">
            <Image
              src={preview}
              alt="Profile preview"
              width={80}
              height={80}
              unoptimized={true}
              className={`w-20 h-20 rounded-full object-cover border-2 transition-all ${uploadSuccess
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-300'
                }`}
            />
            {uploadSuccess && (
              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 animate-in fade-in zoom-in duration-200">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
            {!isUploadDisabled && !required && !uploadSuccess && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            onClick={(e) => {
              // Prevent any form submission when clicking file input
              e.stopPropagation();
            }}
            className="hidden"
            disabled={isUploadDisabled}
            required={required && !isLocationRequired}
          />

          <button
            type="button"
            onClick={handleClick}
            disabled={isUploadDisabled}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${uploadSuccess
              ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 shadow-sm'
              : required && !preview && !isLocationRequired
                ? 'border-primary-400 bg-primary-50 text-primary-700 hover:bg-primary-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>Processing...</span>
              </>
            ) : preview ? (
              <>
                <ImageIcon className="h-4 w-4" />
                <span>Update Photo</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{required ? 'Upload Your Photo *' : 'Upload Photo'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showSuccessMessage && uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2 animate-fadeIn">
          <p className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 animate-scaleIn" />
            <span className="font-medium">Photo uploaded successfully!</span>
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Supported formats: JPEG, PNG, GIF, WebP
      </p>
    </div>
  );
}
