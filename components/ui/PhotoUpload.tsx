'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';

interface PhotoUploadProps {
  onUploadComplete: (fileUrl: string) => void;
  onUploadError: (error: string) => void;
  userName: string;
  currentImageUrl?: string;
  disabled?: boolean;
  required?: boolean;
  showMessage?: boolean;
  state?: string;
  city?: string;
  center?: string;
}

export default function PhotoUpload({
  onUploadComplete,
  onUploadError,
  userName,
  currentImageUrl,
  disabled = false,
  required = false,
  showMessage = false,
  state,
  city,
  center,
}: PhotoUploadProps) {
  // Initialize preview with current image URL if available (convert to thumbnail)
  const getPreviewUrl = (url: string | null | undefined) => {
    if (!url) return null;
    // Use thumbnail URL for display
    return getSmallThumbnailUrl(url) || url;
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
      const thumbnailUrl = getSmallThumbnailUrl(currentImageUrl);
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
      onUploadError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      onUploadError('File size exceeds 5MB limit. Please choose a smaller image.');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

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

      // Upload the compressed file
      await uploadFile(compressedFile);
    } catch (error: any) {
      console.error('Compression/Upload error:', error);
      onUploadError(error.message || 'Failed to process image');
      setUploading(false); // Ensure uploading state is reset
      // Reset preview on error if no previous image
      if (!currentImageUrl) {
        setPreview(null);
      }
    }

    // Don't reset file input here - keep it so user can change photo if needed
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setShowSuccessMessage(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userName', userName);

      // Add location data if provided (for folder structure)
      if (state) formData.append('state', state);
      if (city) formData.append('city', city);
      if (center) formData.append('center', center);

      const response = await fetch('/api/upload/google-drive', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      console.log('Upload response:', data);

      if (data.success && data.data) {
        // Use directImageUrl (for embedding) or webViewLink (for viewing) from Google Drive
        // directImageUrl format: https://drive.google.com/uc?export=view&id=FILE_ID
        const imageUrl = data.data.directImageUrl || data.data.webViewLink || data.data.webContentLink || data.data.fileId;

        console.log('Extracted image URL:', imageUrl);

        if (!imageUrl) {
          throw new Error('Upload failed: No image URL returned');
        }

        // Store this URL as the last uploaded URL to prevent useEffect from resetting preview
        lastUploadedUrlRef.current = imageUrl;

        // Update preview with thumbnail URL for display (but store full URL)
        const thumbnailUrl = getSmallThumbnailUrl(imageUrl);
        const displayUrl = thumbnailUrl || imageUrl;
        setPreview(displayUrl);

        // Call the callback with the full image URL (for storage)
        console.log('Calling onUploadComplete with URL:', imageUrl);
        onUploadComplete(imageUrl);
        setUploadProgress(100);
        setUploadSuccess(true); // Mark upload as successful
        setShowSuccessMessage(true); // Show success message

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);

        // Clear the ref after parent has updated (2 seconds should be enough)
        // This allows useEffect to handle future prop changes normally
        setTimeout(() => {
          lastUploadedUrlRef.current = null;
        }, 2000);
      } else {
        throw new Error('Upload failed: No data returned');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError(error.message || 'Failed to upload photo. Please try again.');
      // On error, reset preview only if there was no existing image
      if (!currentImageUrl) {
        setPreview(null);
      } else {
        // Restore previous preview if there was one
        const thumbnailUrl = getSmallThumbnailUrl(currentImageUrl);
        setPreview(thumbnailUrl || currentImageUrl);
      }
      setUploadSuccess(false);
      setShowSuccessMessage(false);
      lastUploadedUrlRef.current = null; // Clear the ref on error
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
    onUploadComplete('');
  };

  // Check if location is required but not provided
  const isLocationRequired = required && (!state || !city || !center);
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
            <img
              src={preview}
              alt="Profile preview"
              className={`w-20 h-20 rounded-full object-cover border-2 transition-all ${uploadSuccess
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-gray-300'
                }`}
              onError={(e) => {
                // If thumbnail fails, try the original URL
                const target = e.target as HTMLImageElement;
                if (currentImageUrl && target.src !== currentImageUrl) {
                  target.src = currentImageUrl;
                } else {
                  // If both fail, hide the image
                  target.style.display = 'none';
                }
              }}
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
                <span>Uploading... {uploadProgress > 0 && `${uploadProgress}%`}</span>
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
        Maximum file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP
      </p>
    </div>
  );
}
