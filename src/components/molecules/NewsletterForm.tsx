import React, { useState, FormEvent } from 'react';

export interface NewsletterFormProps {
  ctaLabel?: string;
  onSubscribe?: (email: string) => Promise<void> | void;
  privacyHref?: string;
  className?: string;
}

/**
 * NewsletterForm molecule component
 * Email input with validation and submission handling
 * Includes privacy policy link and success/error states
 */
export const NewsletterForm: React.FC<NewsletterFormProps> = ({
  ctaLabel = 'Sign up',
  onSubscribe,
  privacyHref,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (onSubscribe) {
        await onSubscribe(email);
      }
      setIsSuccess(true);
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative w-full max-w-md">
          <input
            type="email"
            id="newsletter-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleBlur}
            placeholder="Enter your email"
            disabled={isSubmitting || isSuccess}
            autoComplete="email"
            aria-label="Email address for newsletter"
            aria-invalid={error ? true : undefined}
            className="w-full h-10 pl-4 pr-24 text-sm bg-transparent border border-text-primary rounded-full text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-4 bg-brand-primary text-text-dark text-sm font-semibold rounded-full hover:bg-brand-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/80 focus:ring-offset-1"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              ctaLabel
            )}
          </button>
        </div>

        
        {error && (
          <p className="text-sm text-error-light mt-2" role="alert">
            {error}
          </p>
        )}
        
        {isSuccess && (
          <p className="text-sm text-success mt-2" role="status">
            ✓ Successfully subscribed! Check your inbox.
          </p>
        )}
        
        {privacyHref && (
          <p className="text-xs text-text-muted mt-2">
            By subscribing, you agree to our{' '}
            <a
              href={privacyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-primary hover:text-blue-dark underline decoration-1 underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 rounded-sm"
            >
              Privacy Policy
            </a>
          </p>
        )}
      </form>
    </div>
  );
};

