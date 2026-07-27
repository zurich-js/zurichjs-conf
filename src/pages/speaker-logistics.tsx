/**
 * Speaker Logistics Page
 * Speakers confirm which conference-week events they will attend and share
 * dietary needs, plus-one details, t-shirt size, and talk accommodations.
 * Access is via a unique token link from email — no login required.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2, PartyPopper, Shirt } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button, Select } from '@/components/atoms';
import {
  EventRsvpCard,
  TextField,
  TextAreaField,
  YesNoChoice,
  EMPTY_LOGISTICS_FORM_STATE,
  formStateFromResponse,
  type LogisticsFormState,
  type SpeakerLogisticsFormResponse,
} from '@/components/speaker-logistics';
import { SPEAKER_LOGISTICS_EVENTS } from '@/data/speaker-logistics-events';
import { speakerLogisticsSchema } from '@/lib/validations/speaker-logistics';
import { TSHIRT_SIZES } from '@/lib/validations/cfp';

const SIZE_OPTIONS = TSHIRT_SIZES.map((size) => ({ value: size, label: size }));

const [WARMUP_EVENT, DINNER_EVENT, AFTER_PARTY_EVENT, HANGOUT_EVENT] = SPEAKER_LOGISTICS_EVENTS;

type FetchError = Error & { status?: number };

function buildPayload(state: LogisticsFormState) {
  return {
    attending_warmup: state.attending_warmup,
    attending_speakers_dinner: state.attending_speakers_dinner,
    attending_after_party: state.attending_after_party,
    attending_speaker_hangout: state.attending_speaker_hangout,
    dietary_restrictions: state.dietary_restrictions || null,
    dinner_plus_one: state.dinner_plus_one,
    dinner_plus_one_dietary_restrictions: state.dinner_plus_one_dietary_restrictions || null,
    after_party_plus_one: state.after_party_plus_one,
    after_party_plus_one_first_name: state.after_party_plus_one_first_name || null,
    after_party_plus_one_last_name: state.after_party_plus_one_last_name || null,
    after_party_plus_one_email: state.after_party_plus_one_email || null,
    talk_special_accommodations: state.talk_special_accommodations || null,
    tshirt_size: state.tshirt_size || null,
  };
}

const SpeakerLogisticsPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = router.query;
  const logisticsToken = router.isReady && typeof token === 'string' ? token : '';

  const [formState, setFormState] = useState<LogisticsFormState>(EMPTY_LOGISTICS_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery<SpeakerLogisticsFormResponse, FetchError>({
    queryKey: ['speaker-logistics', logisticsToken],
    queryFn: async () => {
      const response = await fetch(`/api/speaker-logistics/${encodeURIComponent(logisticsToken)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const fetchError: FetchError = new Error(errorData.error || 'Failed to load your details');
        fetchError.status = response.status;
        throw fetchError;
      }
      return response.json();
    },
    enabled: !!logisticsToken,
    retry: false,
  });

  // Seed the form once from previously saved answers
  useEffect(() => {
    if (data && !isSeeded) {
      setFormState(formStateFromResponse(data));
      setIsSeeded(true);
    }
  }, [data, isSeeded]);

  const saveMutation = useMutation<SpeakerLogisticsFormResponse, Error, LogisticsFormState>({
    mutationFn: async (state) => {
      const response = await fetch(`/api/speaker-logistics/${encodeURIComponent(logisticsToken)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(state)),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save your details');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['speaker-logistics', logisticsToken], result);
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (mutationError) => {
      setErrors({ _form: mutationError.message });
    },
  });

  // Scroll to + focus the first errored field
  useEffect(() => {
    const errorKeys = Object.keys(errors).filter((key) => key !== '_form');
    if (errorKeys.length === 0) return;
    const errorElement = document.getElementById(errorKeys[0]);
    if (errorElement) {
      const y = errorElement.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setTimeout(() => errorElement.focus(), 500);
    }
  }, [errors]);

  const handleChange = <Field extends keyof LogisticsFormState>(
    field: Field,
    value: LogisticsFormState[Field]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setShowSuccess(false);
    if (errors[field] || errors._form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next._form;
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setShowSuccess(false);

    const result = speakerLogisticsSchema.safeParse(buildPayload(formState));
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    saveMutation.mutate(formState);
  };

  const hasSubmittedBefore = !!data?.logistics?.submitted_at;
  const showDietaryInDinner = formState.attending_speakers_dinner === true;
  const showDietaryInAfterParty = !showDietaryInDinner && formState.attending_after_party === true;

  const dietaryField = (
    <TextAreaField
      id="dietary_restrictions"
      label="Your dietary restrictions or allergies"
      hint="Applies to the speakers dinner and the after party — vegetarian, vegan, halal, allergies, anything we should know."
      value={formState.dietary_restrictions}
      onChange={(value) => handleChange('dietary_restrictions', value)}
      placeholder="e.g. vegetarian, severe nut allergy"
      disabled={saveMutation.isPending}
      error={errors.dietary_restrictions}
    />
  );

  return (
    <Layout
      title="Your Speaker Week Plans | ZurichJS Conference 2026"
      description="Tell us which speaker week events you'll attend so we can plan food and capacity."
    >
      <div className="min-h-screen bg-brand-primary py-16 md:py-24 px-6">
        <div className="max-w-2xl mx-auto">
          {isLoading || !router.isReady ? (
            <div className="flex justify-center py-24" role="status">
              <Loader2 className="w-8 h-8 animate-spin text-black" aria-hidden="true" />
              <span className="sr-only">Loading your details…</span>
            </div>
          ) : error || !logisticsToken || !data ? (
            <div className="bg-black rounded-2xl p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-brand-primary mx-auto mb-4" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-white mb-3">This link doesn&apos;t work</h1>
              <p className="text-gray-300">
                {!logisticsToken
                  ? 'This page needs the personal link from your email. Please open the link from the ZurichJS email we sent you.'
                  : 'Your personal link is invalid or has changed. Please use the most recent email from us, or contact us and we will send you a fresh link.'}
              </p>
              <p className="text-gray-300 mt-3">
                Need help? Reach us at{' '}
                <a href="mailto:hello@zurichjs.com" className="text-brand-primary underline">
                  hello@zurichjs.com
                </a>
              </p>
            </div>
          ) : (
            <>
              <header className="mb-8">
                <h1 className="text-base md:text-lg font-extrabold text-black">
                  Hi {data.speaker.firstName}, plan your speaker week
                </h1>
                <p className="mt-3 text-black/80 leading-relaxed">
                  We&apos;re organizing a few events around ZurichJS Conference 2026 especially for our speakers.
                  Tell us what you&apos;ll join so we can book the right amount of food, seats, and fun. You can
                  come back to this page and update your answers any time using the same link.
                </p>
              </header>

              {showSuccess && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-xl border border-green-600 bg-green-950 px-4 py-3 text-green-300"
                  role="status"
                >
                  <Check className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-sm">
                    Your plans are saved — thank you! If anything changes (especially last minute), please come
                    back and update this form so we can adjust food and capacity.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <EventRsvpCard
                  event={WARMUP_EVENT}
                  value={formState.attending_warmup}
                  onChange={(value) => handleChange('attending_warmup', value)}
                  error={errors.attending_warmup}
                  disabled={saveMutation.isPending}
                />

                <EventRsvpCard
                  event={DINNER_EVENT}
                  value={formState.attending_speakers_dinner}
                  onChange={(value) => handleChange('attending_speakers_dinner', value)}
                  error={errors.attending_speakers_dinner}
                  disabled={saveMutation.isPending}
                >
                  {showDietaryInDinner && dietaryField}
                  <div>
                    <p className="block text-sm font-semibold text-white mb-2">
                      Are you bringing a plus one to the dinner?
                    </p>
                    <YesNoChoice
                      name="dinner_plus_one"
                      legend="Are you bringing a plus one to the speakers dinner?"
                      value={formState.dinner_plus_one}
                      yesLabel="Yes, +1"
                      noLabel="No, just me"
                      onChange={(value) => handleChange('dinner_plus_one', value)}
                      disabled={saveMutation.isPending}
                    />
                  </div>
                  {formState.dinner_plus_one && (
                    <TextAreaField
                      id="dinner_plus_one_dietary_restrictions"
                      label="Your plus one's dietary restrictions or allergies"
                      value={formState.dinner_plus_one_dietary_restrictions}
                      onChange={(value) => handleChange('dinner_plus_one_dietary_restrictions', value)}
                      placeholder="e.g. vegan, gluten-free"
                      disabled={saveMutation.isPending}
                      error={errors.dinner_plus_one_dietary_restrictions}
                    />
                  )}
                </EventRsvpCard>

                <EventRsvpCard
                  event={AFTER_PARTY_EVENT}
                  value={formState.attending_after_party}
                  onChange={(value) => handleChange('attending_after_party', value)}
                  error={errors.attending_after_party}
                  disabled={saveMutation.isPending}
                >
                  {showDietaryInAfterParty && dietaryField}
                  <div>
                    <p className="block text-sm font-semibold text-white mb-2">
                      Are you bringing a plus one to the after party?
                    </p>
                    <YesNoChoice
                      name="after_party_plus_one"
                      legend="Are you bringing a plus one to the after party?"
                      value={formState.after_party_plus_one}
                      yesLabel="Yes, +1"
                      noLabel="No, just me"
                      onChange={(value) => handleChange('after_party_plus_one', value)}
                      disabled={saveMutation.isPending}
                    />
                  </div>
                  {formState.after_party_plus_one && (
                    <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/50 rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <PartyPopper className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <p className="text-gray-300 text-sm">
                          We&apos;ll issue your plus one a complimentary <strong className="text-amber-400">VIP ticket</strong>{' '}
                          for the after party — it also gets them <strong className="text-amber-400">20% off workshops</strong>.
                          That&apos;s why we need their details.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextField
                          id="after_party_plus_one_first_name"
                          label="Plus one first name"
                          required
                          value={formState.after_party_plus_one_first_name}
                          onChange={(value) => handleChange('after_party_plus_one_first_name', value)}
                          autoComplete="off"
                          disabled={saveMutation.isPending}
                          error={errors.after_party_plus_one_first_name}
                        />
                        <TextField
                          id="after_party_plus_one_last_name"
                          label="Plus one last name"
                          required
                          value={formState.after_party_plus_one_last_name}
                          onChange={(value) => handleChange('after_party_plus_one_last_name', value)}
                          autoComplete="off"
                          disabled={saveMutation.isPending}
                          error={errors.after_party_plus_one_last_name}
                        />
                      </div>
                      <TextField
                        id="after_party_plus_one_email"
                        label="Plus one email"
                        type="email"
                        required
                        hint="We'll send their VIP ticket to this address."
                        value={formState.after_party_plus_one_email}
                        onChange={(value) => handleChange('after_party_plus_one_email', value)}
                        autoComplete="off"
                        disabled={saveMutation.isPending}
                        error={errors.after_party_plus_one_email}
                      />
                    </div>
                  )}
                </EventRsvpCard>

                <EventRsvpCard
                  event={HANGOUT_EVENT}
                  value={formState.attending_speaker_hangout}
                  onChange={(value) => handleChange('attending_speaker_hangout', value)}
                  error={errors.attending_speaker_hangout}
                  disabled={saveMutation.isPending}
                />

                {/* T-shirt size */}
                <section className="bg-black rounded-2xl p-6 md:p-8" aria-labelledby="tshirt-title">
                  <div className="flex items-center gap-3 mb-2">
                    <Shirt className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                    <h2 id="tshirt-title" className="text-xl font-bold text-brand-primary">
                      Your T-Shirt Size
                    </h2>
                  </div>
                  <p className="text-gray-200 text-sm mb-4">
                    {data.speaker.tshirtSize
                      ? `We have your size on file as ${data.speaker.tshirtSize} — update it here if that's wrong.`
                      : 'We don’t have your t-shirt size yet — pick one so your speaker shirt fits.'}
                  </p>
                  <Select
                    label="T-shirt size"
                    value={formState.tshirt_size}
                    onChange={(value) => handleChange('tshirt_size', value)}
                    options={SIZE_OPTIONS}
                    placeholder="Select your t-shirt size..."
                    variant="dark"
                    disabled={saveMutation.isPending}
                  />
                </section>

                {/* Talk / workshop accommodations */}
                <section className="bg-black rounded-2xl p-6 md:p-8" aria-labelledby="accommodations-title">
                  <h2 id="accommodations-title" className="text-xl font-bold text-brand-primary mb-2">
                    Your Talk or Workshop
                  </h2>
                  <TextAreaField
                    id="talk_special_accommodations"
                    label="Special accommodations you need"
                    hint="Anything that helps you deliver your talk or workshop — accessibility needs, AV setup, adapters, seating, breaks."
                    value={formState.talk_special_accommodations}
                    onChange={(value) => handleChange('talk_special_accommodations', value)}
                    placeholder="e.g. I need a stool on stage and a USB-C HDMI adapter"
                    rows={4}
                    disabled={saveMutation.isPending}
                    error={errors.talk_special_accommodations}
                  />
                </section>

                {errors._form && (
                  <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
                    {errors._form}
                  </div>
                )}

                <div className="bg-black rounded-2xl p-6 md:p-8">
                  <Button type="submit" variant="primary" size="lg" loading={saveMutation.isPending} className="w-full">
                    {hasSubmittedBefore ? 'Update My Plans' : 'Save My Plans'}
                  </Button>
                  <p className="text-gray-400 text-sm mt-4 text-center">
                    We order food and book capacity based on your answers — if your plans change, please update
                    this form or email{' '}
                    <a href="mailto:hello@zurichjs.com" className="text-brand-primary underline">
                      hello@zurichjs.com
                    </a>
                    .
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SpeakerLogisticsPage;
