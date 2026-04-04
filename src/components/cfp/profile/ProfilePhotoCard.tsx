import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';

interface PhotosCardProps {
  profileImageUrl: string | null;
  headerImageUrl: string | null;
  requiresHeaderImage: boolean;
  onProfileImageChange: (imageUrl: string | null) => void;
  onHeaderImageChange: (imageUrl: string | null) => void;
  onPreview: () => void;
}

export function PhotosCard({
  profileImageUrl,
  headerImageUrl,
  requiresHeaderImage,
  onProfileImageChange,
  onHeaderImageChange,
  onPreview,
}: PhotosCardProps) {
  const toast = useToast();
  const profileInputId = useId();
  const headerInputId = useId();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);

  const handleUpload = async (
    file: File,
    endpoint: string,
    setUploading: (value: boolean) => void,
    onSuccess: (imageUrl: string | null) => void,
    successToastTitle: string,
    successToastDescription: string,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Upload failed', 'Invalid file type. Accepted formats: JPG, PNG, WebP, GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Upload failed', 'File too large. Maximum size is 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onSuccess(data.imageUrl);
      toast.success(successToastTitle, successToastDescription);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Upload failed', error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-brand-gray-dark rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Photos</h3>
        <p className="mt-2 text-sm text-brand-gray-light">
          Upload an avatar photo and a header image of your choice (5:2 ratio, bottom aligned)
        </p>
      </div>

      <div className="grid grid-cols-[2fr_5fr] gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">Profile</p>
          </div>

          <input
            ref={profileInputRef}
            id={profileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              void handleUpload(
                file,
                '/api/cfp/speaker/image',
                setIsUploadingProfile,
                onProfileImageChange,
                'Photo Updated',
                'Your profile picture has been saved.',
                profileInputRef
              );
            }}
          />

          <button
            type="button"
            onClick={() => profileInputRef.current?.click()}
            disabled={isUploadingProfile}
            className="group relative block w-full overflow-hidden rounded-xl cursor-pointer border-2 border-dashed border-brand-gray-medium bg-brand-gray-darkest text-left transition-colors hover:border-brand-gray-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="aspect-square">
              {profileImageUrl ? (
                <Image
                  src={profileImageUrl}
                  alt="Profile photo"
                  fill
                  sizes="(max-width: 1024px) 50vw, 9rem"
                  className="object-cover"
                />
              ) : (
                  <div className="flex h-full items-center justify-center">
                      <p className="text-xxs text-center text-brand-gray-light">
                          {isUploadingProfile ? 'Uploading...' : 'Upload avatar'}
                      </p>
                  </div>
              )}
            </div>

            {profileImageUrl ? (
              <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-black/70 text-white backdrop-blur-sm">
                <Pencil className="h-4 w-4" />
              </span>
            ) : null}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">
              Header{requiresHeaderImage ? ' *' : ''}
            </p>
          </div>

          <input
            ref={headerInputRef}
            id={headerInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              void handleUpload(
                file,
                '/api/cfp/speaker/header-image',
                setIsUploadingHeader,
                onHeaderImageChange,
                'Header Updated',
                'Your speaker card header image has been saved.',
                headerInputRef
              );
            }}
          />

          <button
            type="button"
            onClick={() => headerInputRef.current?.click()}
            disabled={isUploadingHeader}
            className="group relative block w-full overflow-hidden rounded-xl cursor-pointer border-2 border-dashed border-brand-gray-medium bg-brand-gray-darkest text-left transition-colors hover:border-brand-gray-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="aspect-[5/2]">
              {headerImageUrl ? (
                <Image
                  src={headerImageUrl}
                  alt="Header image"
                  fill
                  sizes="(max-width: 1024px) 50vw, 9rem"
                  className="object-cover object-bottom"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                    <p className="text-xxs text-center text-brand-gray-light">
                      {isUploadingHeader ? 'Uploading...' : 'Upload header image'}
                    </p>
                </div>
              )}
            </div>

            {headerImageUrl ? (
              <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-black/70 text-white backdrop-blur-sm">
                <Pencil className="h-4 w-4" />
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onPreview}
      >
        Preview speaker card
      </Button>
    </div>
  );
}

export const ProfilePhotoCard = PhotosCard;
