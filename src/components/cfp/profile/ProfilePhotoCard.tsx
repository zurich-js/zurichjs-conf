/**
 * Profile Photo Card - Photo upload component
 */

import { useRef, useState } from 'react';
import { ImageIcon, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ProfilePhotoCardProps {
  initialImageUrl: string | null;
  variant?: 'mobile' | 'desktop';
}

export function ProfilePhotoCard({ initialImageUrl, variant = 'desktop' }: ProfilePhotoCardProps) {
  const toast = useToast();
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

      const response = await fetch('/api/cfp/speaker/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setProfileImageUrl(data.imageUrl);
      setImageSuccess('Profile picture updated!');
      toast.success('Photo Updated', 'Your profile picture has been saved.');

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
                Profile photo<span className="text-red-400">*</span>
              </h3>
              <p className="text-sm text-brand-gray-light">
                Upload a professional photo for the conference website. Preferably at least 600x600 pixels.
              </p>
            </div>
            <ImagePreview url={profileImageUrl} />
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
            id="mobile-image-upload"
          />

          <label
            htmlFor="mobile-image-upload"
            className={`w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 ${
              isUploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isUploadingImage ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : profileImageUrl ? 'Upload new photo' : 'Upload photo'}
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
            Profile photo<span className="text-red-400">*</span>
          </h3>
          <p className="text-sm text-brand-gray-light">
            Upload a professional photo for the conference website. Preferably at least 600x600 pixels.
          </p>
        </div>
        <ImagePreview url={profileImageUrl} />
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
        ) : profileImageUrl ? 'Upload new photo' : 'Upload photo'}
      </button>

      <StatusMessages success={imageSuccess} error={imageError} />
    </div>
  );
}

function ImagePreview({ url }: { url: string | null }) {
  if (url) {
    return (
      <img
        key={url}
        src={url}
        alt="Profile"
        className="w-16 h-16 rounded-lg object-cover border border-dashed border-brand-gray-medium flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-lg bg-brand-gray-darkest border border-dashed border-brand-gray-medium flex items-center justify-center flex-shrink-0">
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
