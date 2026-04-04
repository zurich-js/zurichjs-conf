/**
 * Photo upload card for speaker profile images
 */

import { useId, useRef, useState } from 'react';
import { ImageIcon, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface PhotoUploadCardProps {
  title: string;
  description: string;
  initialImageUrl: string | null;
  uploadEndpoint: string;
  successToastTitle: string;
  successToastDescription: string;
  previewVariant?: 'square' | 'banner';
  variant?: 'mobile' | 'desktop';
  onUploadSuccess?: (imageUrl: string) => void;
}

export function PhotoUploadCard({
  title,
  description,
  initialImageUrl,
  uploadEndpoint,
  successToastTitle,
  successToastDescription,
  previewVariant = 'square',
  variant = 'desktop',
  onUploadSuccess,
}: PhotoUploadCardProps) {
  const toast = useToast();
  const uploadInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialImageUrl);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);

  const handleImageSelect = () => fileInputRef.current?.click();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Invalid file type. Accepted formats: JPG, PNG, WebP, GIF');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('File too large. Maximum size is 5MB');
      return;
    }

    setIsUploadingImage(true);
    setImageError(null);
    setImageSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setProfileImageUrl(data.imageUrl);
      setImageSuccess('Image updated!');
      onUploadSuccess?.(data.imageUrl);
      toast.success(successToastTitle, successToastDescription);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (variant === 'mobile') {
    return (
      <div className="lg:hidden mb-8">
        <div className="bg-brand-gray-dark rounded-2xl p-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-brand-gray-light">
                {description}
              </p>
            </div>
            <ImagePreview url={profileImageUrl} previewVariant={previewVariant} />
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
            id={uploadInputId}
          />

          <label
            htmlFor={uploadInputId}
            className={`w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 ${
              isUploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isUploadingImage ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : profileImageUrl ? 'Upload new image' : 'Upload image'}
          </label>

          <StatusMessages success={imageSuccess} error={imageError} />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block bg-brand-gray-dark rounded-2xl p-6">
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-brand-gray-light">
            {description}
          </p>
        </div>
        <ImagePreview url={profileImageUrl} previewVariant={previewVariant} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageUpload}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleImageSelect}
        disabled={isUploadingImage}
        className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {isUploadingImage ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        ) : profileImageUrl ? 'Upload new image' : 'Upload image'}
      </button>

      <StatusMessages success={imageSuccess} error={imageError} />
    </div>
  );
}

function ImagePreview({ url, previewVariant }: { url: string | null; previewVariant: 'square' | 'banner' }) {
  const previewClassName = previewVariant === 'banner'
    ? 'w-24 h-16 rounded-lg'
    : 'w-16 h-16 rounded-lg';

  if (url) {
    return (
      <img
        key={url}
        src={url}
        alt="Profile"
        className={`${previewClassName} object-cover border border-dashed border-brand-gray-medium flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${previewClassName} bg-brand-gray-darkest border border-dashed border-brand-gray-medium flex items-center justify-center flex-shrink-0`}>
      <ImageIcon className="w-6 h-6 text-brand-gray-medium" />
    </div>
  );
}

function StatusMessages({ success, error }: { success: string | null; error: string | null }) {
  return (
    <>
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm mt-3">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mt-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </>
  );
}

export const ProfilePhotoCard = PhotoUploadCard;
