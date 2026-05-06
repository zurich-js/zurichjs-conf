/**
 * Edit Speaker Modal
 * Update speaker profile and social links
 */

import React, { useState } from 'react';
import { User } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { SpeakerWithSessions } from './types';

type SpeakerImageField = 'profile_image_url' | 'header_image_url' | 'portrait_foreground_url' | 'portrait_background_url';

interface EditSpeakerModalProps {
  speaker: SpeakerWithSessions;
  canRemoveFromList?: boolean;
  isRemovingFromList?: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onRemoveFromList?: (speaker: SpeakerWithSessions) => void;
}

export function EditSpeakerModal({
  speaker,
  canRemoveFromList = false,
  isRemovingFromList = false,
  onClose,
  onUpdated,
  onRemoveFromList,
}: EditSpeakerModalProps) {
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
    speaker_role: speaker.speaker_role || 'speaker',
  });
  const [profileImageUrl, setProfileImageUrl] = useState(speaker.profile_image_url);
  const [headerImageUrl, setHeaderImageUrl] = useState(speaker.header_image_url);
  const [portraitForegroundUrl, setPortraitForegroundUrl] = useState(speaker.portrait_foreground_url);
  const [portraitBackgroundUrl, setPortraitBackgroundUrl] = useState(speaker.portrait_background_url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<SpeakerImageField | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const headerImageInputRef = React.useRef<HTMLInputElement>(null);
  const portraitForegroundInputRef = React.useRef<HTMLInputElement>(null);
  const portraitBackgroundInputRef = React.useRef<HTMLInputElement>(null);
  const acceptedSessions = speaker.submissions?.filter((submission) => submission.status === 'accepted') ?? [];
  const missingFields = {
    first_name: !formData.first_name.trim(),
    last_name: !formData.last_name.trim(),
    job_title: !formData.job_title.trim(),
    company: !formData.company.trim(),
    bio: !formData.bio.trim(),
    profile_image_url: !profileImageUrl?.trim(),
    accepted_session: false,
    session_title: acceptedSessions.some((session) => !session.title?.trim()),
    session_abstract: acceptedSessions.some((session) => !session.abstract?.trim()),
  };

  const inputClass = (isMissing: boolean, extra = '') =>
    `w-full px-3 py-2 border rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none ${
      isMissing ? 'border-red-400 bg-red-50' : 'border-gray-300'
    } ${extra}`;

  const labelClass = (isMissing: boolean, extra = 'text-sm') =>
    `block ${extra} font-medium mb-1 ${isMissing ? 'text-red-700' : 'text-black'}`;

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    imageField: SpeakerImageField,
    onUploaded: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(imageField);
    setError('');
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      uploadFormData.append('imageField', imageField);

      const res = await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (res.ok) {
        onUploaded(data.imageUrl);
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const updates: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(formData)) {
        const originalValue = speaker[key as keyof typeof formData] ?? '';
        if (value !== originalValue) {
          updates[key] = value;
        }
      }
      if (profileImageUrl !== speaker.profile_image_url) {
        updates.profile_image_url = profileImageUrl;
      }
      if (headerImageUrl !== speaker.header_image_url) {
        updates.header_image_url = headerImageUrl;
      }
      if (portraitForegroundUrl !== speaker.portrait_foreground_url) {
        updates.portrait_foreground_url = portraitForegroundUrl;
      }
      if (portraitBackgroundUrl !== speaker.portrait_background_url) {
        updates.portrait_background_url = portraitBackgroundUrl;
      }

      const res = await fetch(`/api/admin/cfp/speakers/${speaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update speaker');
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      title="Edit Speaker"
      maxWidth="2xl"
      showHeader={false}
      onClose={onClose}
      footer={(
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canRemoveFromList ? (
            <button
              type="button"
              onClick={() => onRemoveFromList?.(speaker)}
              disabled={isRemovingFromList || isSubmitting}
              className="w-fit text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
            >
              {isRemovingFromList ? 'Reverting...' : 'Revert include'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-black cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              form="edit-speaker-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    >
        <form id="edit-speaker-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-semibold text-black mb-3">Speaker Images</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className={`text-xs font-medium ${missingFields.profile_image_url ? 'text-red-700' : 'text-gray-600'}`}>Profile photo</p>
                <div className="flex items-center gap-3">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      missingFields.profile_image_url ? 'bg-red-50 ring-2 ring-red-300' : 'bg-gray-200'
                    }`}>
                      <User className={`w-8 h-8 ${missingFields.profile_image_url ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'profile_image_url', setProfileImageUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingField !== null}
                      className="text-sm text-[#b8a820] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {uploadingField === 'profile_image_url' ? 'Uploading...' : 'Change photo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Header image</p>
                <div className="flex items-center gap-3">
                  {headerImageUrl ? (
                    <img src={headerImageUrl} alt="Header" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">None</span>
                    </div>
                  )}
                  <div>
                    <input
                      ref={headerImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'header_image_url', setHeaderImageUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => headerImageInputRef.current?.click()}
                      disabled={uploadingField !== null}
                      className="text-sm text-[#b8a820] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {uploadingField === 'header_image_url' ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Portrait foreground</p>
                <div className="flex items-center gap-3">
                  {portraitForegroundUrl ? (
                    <img src={portraitForegroundUrl} alt="Portrait foreground" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={portraitForegroundInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'portrait_foreground_url', setPortraitForegroundUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => portraitForegroundInputRef.current?.click()}
                      disabled={uploadingField !== null}
                      className="text-sm text-[#b8a820] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {uploadingField === 'portrait_foreground_url' ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Portrait background</p>
                <div className="flex items-center gap-3">
                  {portraitBackgroundUrl ? (
                    <img src={portraitBackgroundUrl} alt="Portrait background" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">None</span>
                    </div>
                  )}
                  <div>
                    <input
                      ref={portraitBackgroundInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'portrait_background_url', setPortraitBackgroundUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => portraitBackgroundInputRef.current?.click()}
                      disabled={uploadingField !== null}
                      className="text-sm text-[#b8a820] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {uploadingField === 'portrait_background_url' ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass(missingFields.first_name)}>First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className={inputClass(missingFields.first_name)}
              />
            </div>
            <div>
              <label className={labelClass(missingFields.last_name)}>Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className={inputClass(missingFields.last_name)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass(missingFields.job_title)}>Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className={inputClass(missingFields.job_title)}
              />
            </div>
            <div>
              <label className={labelClass(missingFields.company)}>Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className={inputClass(missingFields.company)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass(missingFields.bio)}>Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className={inputClass(missingFields.bio)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Public role</label>
            <select
              value={formData.speaker_role}
              onChange={(e) => setFormData({ ...formData, speaker_role: e.target.value as 'speaker' | 'mc' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
            >
              <option value="speaker">Speaker</option>
              <option value="mc">MC</option>
            </select>
          </div>

          {(missingFields.session_title || missingFields.session_abstract) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              Session details need attention before this profile is ready.
            </div>
          ) : null}

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-black mb-3">Social Links</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className={inputClass(false, 'text-sm')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  className={inputClass(false, 'text-sm')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={formData.twitter_handle}
                  onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                  className={inputClass(false, 'text-sm')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bluesky Handle</label>
                <input
                  type="text"
                  value={formData.bluesky_handle}
                  onChange={(e) => setFormData({ ...formData, bluesky_handle: e.target.value })}
                  className={inputClass(false, 'text-sm')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mastodon Handle</label>
                <input
                  type="text"
                  value={formData.mastodon_handle}
                  onChange={(e) => setFormData({ ...formData, mastodon_handle: e.target.value })}
                  className={inputClass(false, 'text-sm')}
                />
              </div>
            </div>
          </div>

        </form>
    </AdminModal>
  );
}
