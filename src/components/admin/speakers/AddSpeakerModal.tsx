/**
 * Add Speaker Modal
 * Create a new confirmed speaker
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { SpeakerWithSessions } from './types';

interface AddSpeakerModalProps {
  onClose: () => void;
  onCreated: () => void;
}

type AddMode = 'existing' | 'new';
type SpeakerRole = 'speaker' | 'mc';

export function AddSpeakerModal({ onClose, onCreated }: AddSpeakerModalProps) {
  const [mode, setMode] = useState<AddMode>('existing');
  const [speakers, setSpeakers] = useState<SpeakerWithSessions[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [selectedRole, setSelectedRole] = useState<SpeakerRole>('speaker');
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    job_title: '',
    company: '',
    bio: '',
    speaker_role: 'speaker' as SpeakerRole,
    is_visible: false,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSpeakers = async () => {
      setIsLoadingSpeakers(true);
      try {
        const res = await fetch('/api/admin/cfp/speakers', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load CFP speakers');
        }

        const data = await res.json();
        if (isMounted) {
          setSpeakers(data.speakers ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load CFP speakers');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSpeakers(false);
        }
      }
    };

    loadSpeakers();

    return () => {
      isMounted = false;
    };
  }, []);

  const speakerOptions = useMemo(() => {
    return speakers.filter((speaker) => {
      return !speaker.is_admin_managed;
    }).sort((left, right) => {
      const leftName = `${left.first_name} ${left.last_name}`.trim().toLowerCase();
      const rightName = `${right.first_name} ${right.last_name}`.trim().toLowerCase();

      return leftName.localeCompare(rightName);
    });
  }, [speakers]);

  const selectedSpeaker = speakers.find((speaker) => speaker.id === selectedSpeakerId) ?? null;
  const hasChanges = mode === 'existing'
    ? Boolean(selectedSpeakerId) || selectedRole !== 'speaker'
    : Boolean(
        formData.email ||
        formData.first_name ||
        formData.last_name ||
        formData.job_title ||
        formData.company ||
        formData.bio ||
        formData.speaker_role !== 'speaker' ||
        selectedImage
      );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !hasChanges && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSubmitting, onClose]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'existing') {
        if (!selectedSpeakerId) {
          throw new Error('Choose a CFP speaker first');
        }

        const res = await fetch(`/api/admin/cfp/speakers/${selectedSpeakerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            speaker_role: selectedRole,
            is_admin_managed: true,
            is_visible: false,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update speaker');
        }

        onCreated();
        return;
      }

      const res = await fetch('/api/admin/cfp/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, is_visible: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create speaker');
      }

      const { speaker } = await res.json();

      if (selectedImage && speaker?.id) {
        const imageFormData = new FormData();
        imageFormData.append('image', selectedImage);
        await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
          method: 'POST',
          body: imageFormData,
        });
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      title="Include Speaker"
      maxWidth="lg"
      showHeader={false}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            form="add-speaker-form"
            disabled={isSubmitting}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50"
          >
            {isSubmitting ? 'Including...' : mode === 'existing' ? 'Include Selected Speaker' : 'Create Speaker'}
          </button>
        </>
      )}
    >
        <form id="add-speaker-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">Include method</label>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              {([
                ['existing', 'Choose CFP speaker'],
                ['new', 'Create new speaker'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setError('');
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    mode === value
                      ? 'bg-brand-primary text-black'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'existing' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Choose speaker</label>
                <select
                  required
                  value={selectedSpeakerId}
                  onChange={(e) => setSelectedSpeakerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">{isLoadingSpeakers ? 'Loading speakers...' : 'Select a CFP speaker'}</option>
                  {speakerOptions.map((speaker) => (
                    <option key={speaker.id} value={speaker.id}>
                      {[speaker.first_name, speaker.last_name].filter(Boolean).join(' ')}
                      {speaker.email ? ` · ${speaker.email}` : ''}
                    </option>
                  ))}
                </select>
                {!isLoadingSpeakers && speakerOptions.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No available CFP speakers to include.</p>
                ) : null}
                {selectedSpeaker ? (
                  <p className="mt-2 text-sm text-gray-500">
                    This keeps {selectedSpeaker.first_name}&apos;s CFP account, submissions, profile, and travel data attached.
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-black">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as SpeakerRole)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="speaker">Speaker</option>
                  <option value="mc">MC</option>
                </select>
              </div>
            </>
          ) : (
            <>
          {/* Image Upload */}
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
              >
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-[#b8a820] hover:underline cursor-pointer">
                {imagePreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-xs text-gray-500">JPG, PNG. Max 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-black">Role</label>
            <select
              value={formData.speaker_role}
              onChange={(e) => setFormData({ ...formData, speaker_role: e.target.value as 'speaker' | 'mc' })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="speaker">Speaker</option>
              <option value="mc">MC</option>
            </select>
          </div>
            </>
          )}

        </form>
    </AdminModal>
  );
}
