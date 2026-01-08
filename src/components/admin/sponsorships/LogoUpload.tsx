/**
 * Logo Upload Component
 * Allows uploading, previewing, and removing sponsor logos
 */

import React, { useState, useRef } from 'react';
import { Upload, Trash2, Building2, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface LogoUploadProps {
  sponsorId: string;
  currentLogoUrl: string | null;
  onUpdate: () => void;
}

export function LogoUpload({ sponsorId, currentLogoUrl, onUpdate }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please use JPEG, PNG, or WebP.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/sponsorships/${sponsorId}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/${sponsorId}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Company Logo</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Logo Preview */}
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
          {currentLogoUrl ? (
            <Image
              src={currentLogoUrl}
              alt="Sponsor logo"
              fill
              className="object-contain p-2"
            />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center">
              <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 w-full sm:w-auto space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isDeleting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {currentLogoUrl ? 'Replace' : 'Upload Logo'}
                </>
              )}
            </button>

            {currentLogoUrl && (
              <button
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Accepted formats: JPEG, PNG, WebP. Max size: 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}
