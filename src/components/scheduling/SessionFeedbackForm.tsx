import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/atoms';
import type { StoredSessionFeedback } from '@/lib/feedback/types';
import { cn } from '@/lib/utils';
import { StarRating } from './StarRating';

export type FeedbackSubject = 'talk' | 'workshop' | 'panel';

export interface SessionFeedbackFormProps {
  subject: FeedbackSubject;
  /** A previous submission from this browser — renders the read-only state */
  submitted?: StoredSessionFeedback | null;
  onSubmit: (input: { rating: number; comment: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  /** Server-side rejection to surface inline */
  errorMessage?: string | null;
  className?: string;
}

const COMMENT_LIMIT = 2000;

/**
 * Inline rating form shown on live and past sessions in the schedule. One
 * shot: after a successful submission the browser remembers it and this
 * renders the summary instead — there is deliberately no edit path.
 */
export function SessionFeedbackForm({
  subject,
  submitted,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  className,
}: SessionFeedbackFormProps) {
  const fieldId = useId();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  if (submitted) {
    return (
      <div
        className={cn('flex flex-col gap-2 rounded-xl border border-brand-gray-light bg-brand-white/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}
        role="status"
      >
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-black">
          <CheckCircle2 className="size-4 text-brand-green" aria-hidden="true" />
          Thanks for your feedback on this {subject}!
        </p>
        <StarRating value={submitted.rating} readOnly size="sm" label="Your rating" />
      </div>
    );
  }

  const ratingMissing = touched && rating === null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (rating === null || isSubmitting) return;
    await onSubmit({ rating, comment: comment.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-3', className)} noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={`${fieldId}-rating-label`} className="text-sm font-bold text-brand-black">
          How was the {subject}?
        </p>
        <StarRating value={rating} onChange={setRating} label={`How was the ${subject}?`} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor={`${fieldId}-comment`} className="sr-only">
            Any other comments?
          </label>
          <textarea
            id={`${fieldId}-comment`}
            name="comment"
            rows={3}
            maxLength={COMMENT_LIMIT}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Any other comments?"
            className="w-full resize-none rounded-xl border border-brand-gray-medium bg-transparent px-4 py-3 text-sm text-brand-black placeholder:text-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
        <Button type="submit" variant="black" size="md" loading={isSubmitting} disabled={isSubmitting} className="shrink-0 self-end md:self-auto">
          Submit feedback
        </Button>
      </div>

      {ratingMissing ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          Pick a star rating to submit.
        </p>
      ) : errorMessage ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
