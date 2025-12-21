/**
 * Speaker Modal Component
 * View and edit speaker profile
 */

import React, { useState } from 'react';
import { X, User, Trash2 } from 'lucide-react';
import type { CfpAdminSpeaker } from '@/lib/types/cfp-admin';
import { ConfirmationModal } from '../ConfirmationModal';

interface SpeakerModalProps {
  speaker: CfpAdminSpeaker;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  isDeleting: boolean;
}

export function SpeakerModal({ speaker, onClose, onUpdated, onDeleted, isDeleting }: SpeakerModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: speaker.first_name || '',
    last_name: speaker.last_name || '',
    job_title: speaker.job_title || '',
    company: speaker.company || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
  });
  const [profileImageUrl, setProfileImageUrl] = useState(speaker.profile_image_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setProfileImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/cfp/speakers/${speaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profile_image_url: profileImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update speaker');
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update speaker');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(speaker.email);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={`${speaker.first_name} ${speaker.last_name}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-[#F1E271] rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-black" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-black">
                  {speaker.first_name || speaker.last_name ? `${speaker.first_name} ${speaker.last_name}` : 'Speaker Profile'}
                </h3>
                <p className="text-sm text-black">{speaker.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                Copy Email
              </button>
              <a
                href={`mailto:${speaker.email}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all"
              >
                Email Speaker
              </a>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                isEditing ? 'bg-gray-200 text-black' : 'bg-[#F1E271] hover:bg-[#e8d95e] text-black'
              }`}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Image Section */}
          {isEditing && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Profile Photo</h4>
              <div className="flex items-center gap-4">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? 'Uploading...' : 'Upload New Photo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP or GIF. Max 5MB.</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Basic Information</h4>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                  <p className="text-sm text-black">{speaker.first_name} {speaker.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                  <p className="text-sm text-black">{speaker.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Job Title</p>
                  <p className="text-sm text-black">{speaker.job_title || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Company</p>
                  <p className="text-sm text-black">{speaker.company || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Biography</h4>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                placeholder="Speaker biography..."
              />
            ) : (
              <p className="text-sm text-black whitespace-pre-wrap">
                {speaker.bio || 'No biography provided'}
              </p>
            )}
          </div>

          {/* Social Links */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Social Links</h4>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => handleChange('github_url', e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Twitter/X Handle</label>
                  <input
                    type="text"
                    value={formData.twitter_handle}
                    onChange={(e) => handleChange('twitter_handle', e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Bluesky Handle</label>
                  <input
                    type="text"
                    value={formData.bluesky_handle}
                    onChange={(e) => handleChange('bluesky_handle', e.target.value)}
                    placeholder="@user.bsky.social"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {speaker.linkedin_url && (
                  <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                    LinkedIn
                  </a>
                )}
                {speaker.github_url && (
                  <a href={speaker.github_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    GitHub
                  </a>
                )}
                {speaker.twitter_handle && (
                  <a href={`https://twitter.com/${speaker.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-sky-100 text-sky-800 rounded-lg text-sm font-medium hover:bg-sky-200 transition-colors">
                    {speaker.twitter_handle}
                  </a>
                )}
                {speaker.bluesky_handle && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    {speaker.bluesky_handle}
                  </span>
                )}
                {!speaker.linkedin_url && !speaker.github_url && !speaker.twitter_handle && !speaker.bluesky_handle && (
                  <p className="text-sm text-gray-500">No social links provided</p>
                )}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Account Info</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Joined</p>
                <p className="text-sm text-black">{new Date(speaker.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Last Updated</p>
                <p className="text-sm text-black">{new Date(speaker.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Danger Zone */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-4">Danger Zone</h4>
            <div className="flex flex-col">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Speaker
              </button>
              <p className="text-xs text-red-500 mt-1 max-w-[300px]">Permanently delete this speaker account. Only possible if they have no submissions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDeleted();
          setShowDeleteConfirm(false);
        }}
        title="Delete Speaker"
        message={`Are you sure you want to delete speaker "${speaker.first_name} ${speaker.last_name}" (${speaker.email})? This action cannot be undone.`}
        confirmText="Delete Speaker"
        confirmStyle="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
