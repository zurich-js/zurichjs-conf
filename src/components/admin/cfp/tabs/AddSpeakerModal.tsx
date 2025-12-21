/**
 * Add Speaker Modal Component
 * Create a new speaker profile
 */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface AddSpeakerModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddSpeakerModal({ onClose, onCreated }: AddSpeakerModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    job_title: '',
    company: '',
    bio: '',
    linkedin_url: '',
    github_url: '',
    twitter_handle: '',
    bluesky_handle: '',
    mastodon_handle: '',
    is_visible: false,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Accepted formats: JPG, PNG, WebP, GIF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/cfp/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create speaker');
      }

      const { speaker } = await res.json();

      if (selectedImage && speaker?.id) {
        const imageFormData = new FormData();
        imageFormData.append('image', selectedImage);

        const imageRes = await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
          method: 'POST',
          body: imageFormData,
        });

        if (!imageRes.ok) {
          console.error('Failed to upload image, but speaker was created');
        }
      }

      onCreated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-black">Add New Speaker</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Profile Image Upload */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-black mb-1">Profile Photo</p>
              <p className="text-xs text-gray-500 mb-2">JPG, PNG, WebP or GIF. Max 5MB.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-[#b8a820] hover:text-[#a09020] font-medium cursor-pointer"
              >
                {imagePreview ? 'Change photo' : 'Upload photo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 self-end pb-2">
              <label className="text-sm font-medium text-black">Visible on Lineup</label>
              <button
                type="button"
                onClick={() => handleChange('is_visible', !formData.is_visible)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  formData.is_visible ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.is_visible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-black mb-3">Social Links (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => handleChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => handleChange('github_url', e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={formData.twitter_handle}
                  onChange={(e) => handleChange('twitter_handle', e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bluesky Handle</label>
                <input
                  type="text"
                  value={formData.bluesky_handle}
                  onChange={(e) => handleChange('bluesky_handle', e.target.value)}
                  placeholder="user.bsky.social"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-black hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
              )}
              Add Speaker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
