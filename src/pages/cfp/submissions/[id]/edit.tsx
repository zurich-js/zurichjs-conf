/**
 * CFP Submission Edit Page
 * Edit a draft submission
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { WorkshopSection, TravelSection, TYPE_INFO, LEVEL_INFO, type FormData } from '@/components/cfp/edit-submission';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionWithDetails } from '@/lib/cfp/submissions';
import { getSuggestedTags } from '@/lib/cfp/tags';
import type { CfpSpeaker, CfpSubmissionWithDetails, CfpSubmissionType, CfpTalkLevel, CfpTag } from '@/lib/types/cfp';

interface EditSubmissionProps {
  speaker: CfpSpeaker;
  submission: CfpSubmissionWithDetails;
  suggestedTags: CfpTag[];
}

export default function EditSubmission({ speaker, submission, suggestedTags }: EditSubmissionProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    submission_type: submission.submission_type,
    title: submission.title,
    abstract: submission.abstract,
    talk_level: submission.talk_level,
    tags: submission.tags?.map((t) => t.name) || [],
    outline: submission.outline || '',
    additional_notes: submission.additional_notes || '',
    slides_url: submission.slides_url || '',
    previous_recording_url: submission.previous_recording_url || '',
    workshop_duration_hours: submission.workshop_duration_hours || 4,
    workshop_expected_compensation: submission.workshop_expected_compensation || '',
    workshop_special_requirements: submission.workshop_special_requirements || '',
    workshop_max_participants: submission.workshop_max_participants || 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isWorkshop = formData.submission_type === 'workshop';

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed) && formData.tags.length < 5) {
      updateField('tags', [...formData.tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags.filter((t) => t !== tag));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title || formData.title.length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (!formData.abstract || formData.abstract.length < 100) newErrors.abstract = 'Abstract must be at least 100 characters';
    if (formData.tags.length === 0) newErrors.tags = 'Select at least one tag';
    if (isWorkshop && (!formData.workshop_duration_hours || formData.workshop_duration_hours < 2 || formData.workshop_duration_hours > 8)) {
      newErrors.workshop_duration_hours = 'Duration must be between 2-8 hours';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        submission_type: formData.submission_type,
        title: formData.title,
        abstract: formData.abstract,
        talk_level: formData.talk_level,
        tags: formData.tags,
        outline: formData.outline || undefined,
        additional_notes: formData.additional_notes || undefined,
        slides_url: formData.slides_url || undefined,
        previous_recording_url: formData.previous_recording_url || undefined,
      };
      if (isWorkshop) {
        data.workshop_duration_hours = formData.workshop_duration_hours;
        data.workshop_expected_compensation = formData.workshop_expected_compensation || undefined;
        data.workshop_special_requirements = formData.workshop_special_requirements || undefined;
        data.workshop_max_participants = formData.workshop_max_participants || undefined;
      }
      const response = await fetch(`/api/cfp/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save');
      router.push(`/cfp/submissions/${submission.id}`);
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEO title={`Edit: ${submission.title} | CFP`} description="Edit your CFP submission" noindex />
      <div className="min-h-screen bg-brand-gray-darkest">
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Edit Proposal</span>
            </Link>
            <Link href={`/cfp/submissions/${submission.id}`} className="text-brand-gray-light hover:text-white text-sm transition-colors">
              Cancel
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {errors._form && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errors._form}</span>
              </div>
            </div>
          )}

          {/* Type Selection */}
          <section className="mb-8">
            <Heading level="h2" className="text-lg font-bold text-white mb-4">Session Type</Heading>
            <div className="grid sm:grid-cols-3 gap-4">
              {(['lightning', 'standard', 'workshop'] as CfpSubmissionType[]).map((type) => (
                <button key={type} type="button" onClick={() => updateField('submission_type', type)}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer ${formData.submission_type === type ? 'bg-brand-primary/20 border-2 border-brand-primary' : 'bg-brand-gray-dark border-2 border-transparent hover:border-brand-gray-medium'}`}>
                  <h3 className="font-semibold text-white">{TYPE_INFO[type].title}</h3>
                  <p className="text-brand-gray-light text-sm">{TYPE_INFO[type].duration}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Details Section */}
          <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Details</h2>
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">Title <span className="text-red-400">*</span></label>
              <Input id="title" value={formData.title} onChange={(e) => updateField('title', e.target.value)} placeholder="An engaging title for your session" fullWidth error={errors.title} />
            </div>
            <div>
              <label htmlFor="abstract" className="block text-sm font-semibold text-white mb-2">Abstract <span className="text-red-400">*</span></label>
              <textarea id="abstract" value={formData.abstract} onChange={(e) => updateField('abstract', e.target.value)} placeholder="Describe what attendees will learn..." rows={5}
                className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all" />
              <div className="flex justify-between mt-2">
                <p className={`text-xs ${errors.abstract ? 'text-red-400' : 'text-brand-gray-medium'}`}>{errors.abstract || 'Minimum 100 characters'}</p>
                <p className="text-xs text-brand-gray-medium">{formData.abstract.length} characters</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Difficulty Level <span className="text-red-400">*</span></label>
              <div className="grid sm:grid-cols-3 gap-3">
                {(['beginner', 'intermediate', 'advanced'] as CfpTalkLevel[]).map((level) => (
                  <button key={level} type="button" onClick={() => updateField('talk_level', level)}
                    className={`p-3 rounded-lg text-left transition-all cursor-pointer ${formData.talk_level === level ? 'bg-brand-primary/20 border border-brand-primary' : 'bg-brand-gray-darkest border border-transparent hover:border-brand-gray-medium'}`}>
                    <div className="font-medium text-white capitalize">{level}</div>
                    <div className="text-xs text-brand-gray-light mt-1">{LEVEL_INFO[level]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Tags <span className="text-red-400">*</span><span className="font-normal text-brand-gray-medium ml-2">({formData.tags.length}/5)</span></label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm">
                      {tag}<button type="button" onClick={() => removeTag(tag)} className="hover:text-white cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-3">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }} placeholder="Type a tag and press Enter" fullWidth disabled={formData.tags.length >= 5} />
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.filter((t) => !formData.tags.includes(t.name)).slice(0, 15).map((tag) => (
                  <button key={tag.id} type="button" onClick={() => addTag(tag.name)} disabled={formData.tags.length >= 5} className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm hover:bg-brand-gray-medium hover:text-white transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">+ {tag.name}</button>
                ))}
              </div>
              {errors.tags && <p className="text-red-400 text-sm mt-2">{errors.tags}</p>}
            </div>
            <div>
              <label htmlFor="outline" className="block text-sm font-semibold text-white mb-2">Outline <span className="text-brand-gray-medium">(optional)</span></label>
              <textarea id="outline" value={formData.outline} onChange={(e) => updateField('outline', e.target.value)} placeholder="Break down the structure of your session..." rows={4} className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all" />
            </div>
            <div>
              <label htmlFor="additional_notes" className="block text-sm font-semibold text-white mb-2">Notes for Reviewers <span className="text-brand-gray-medium">(optional)</span></label>
              <textarea id="additional_notes" value={formData.additional_notes} onChange={(e) => updateField('additional_notes', e.target.value)} placeholder="Anything else reviewers should know..." rows={3} className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label htmlFor="slides_url" className="block text-sm font-semibold text-white mb-2">Slides URL <span className="text-brand-gray-medium">(optional)</span></label><Input id="slides_url" value={formData.slides_url} onChange={(e) => updateField('slides_url', e.target.value)} placeholder="https://..." fullWidth /></div>
              <div><label htmlFor="previous_recording_url" className="block text-sm font-semibold text-white mb-2">Previous Recording <span className="text-brand-gray-medium">(optional)</span></label><Input id="previous_recording_url" value={formData.previous_recording_url} onChange={(e) => updateField('previous_recording_url', e.target.value)} placeholder="https://youtube.com/..." fullWidth /></div>
            </div>
          </section>

          {isWorkshop && <WorkshopSection formData={formData} errors={errors} onUpdate={updateField} />}
          <TravelSection speaker={speaker} />

          <div className="flex justify-between items-center">
            <Link href={`/cfp/submissions/${submission.id}`} className="text-brand-gray-light hover:text-white transition-colors">Cancel</Link>
            <Button onClick={handleSave} variant="primary" size="lg" loading={isSaving} disabled={isSaving}>Save Changes</Button>
          </div>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<EditSubmissionProps> = async (ctx) => {
  const { id } = ctx.params || {};
  if (!id || typeof id !== 'string') return { notFound: true };
  const supabase = createSupabaseServerClient(ctx);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) return { redirect: { destination: '/cfp/login', permanent: false } };
  const speaker = await getSpeakerByUserId(session.user.id);
  if (!speaker) return { redirect: { destination: '/cfp/login', permanent: false } };
  const submission = await getSubmissionWithDetails(id);
  if (!submission) return { notFound: true };
  if (submission.speaker_id !== speaker.id) return { notFound: true };
  if (submission.status !== 'draft') return { redirect: { destination: `/cfp/submissions/${id}`, permanent: false } };
  const suggestedTags = await getSuggestedTags();
  return { props: { speaker, submission, suggestedTags } };
};
