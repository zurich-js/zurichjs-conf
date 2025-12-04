import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/validations/checkout';
import { Input, Button } from '@/components/atoms';
import Link from 'next/link';
import { useFormFieldTracking } from '@/hooks/useFormFieldTracking';

export interface CheckoutFormProps {
  /**
   * Called when form is submitted with valid data
   */
  onSubmit: (data: CheckoutFormData) => void;
  /**
   * Whether the form is currently submitting
   */
  isSubmitting: boolean;
  /**
   * Total amount to display on submit button
   */
  totalAmount: string;
  /**
   * Currency code
   */
  currency: string;
  /**
   * Called when user clicks back button
   */
  onBack: () => void;
  /**
   * Default values to pre-fill the form (e.g., from primary attendee)
   */
  defaultValues?: Partial<CheckoutFormData>;
  /**
   * Cart data for analytics tracking
   */
  cartData?: {
    cart_item_count: number;
    cart_total_amount: number;
    cart_currency: string;
    cart_items: Array<{
      type: 'ticket' | 'workshop_voucher';
      category?: string;
      stage?: string;
      quantity: number;
      price: number;
    }>;
  };
  /**
   * Called when user's email is captured (for abandonment tracking)
   */
  onEmailCaptured?: (email: string) => void;
}

/**
 * CheckoutForm organism component
 * Complete checkout form with validation using React Hook Form and Zod
 * Includes comprehensive field-level analytics tracking
 */
export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  onSubmit,
  isSubmitting,
  totalAmount,
  currency,
  onBack,
  defaultValues,
  cartData,
  onEmailCaptured,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      country: 'Switzerland',
      agreeToTerms: false,
      subscribeNewsletter: false,
      ...defaultValues, // Merge in provided default values
    },
  });

  // Initialize field tracking hook
  const { trackFieldFocus, trackFieldBlur } = useFormFieldTracking({
    currentStep: 'checkout',
    cartData,
    onEmailCaptured,
  });

  // Create tracking-enabled register wrapper
  const registerWithTracking = (
    fieldName: keyof CheckoutFormData,
    fieldType: string = 'text'
  ) => {
    const registration = register(fieldName);
    
    return {
      ...registration,
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        trackFieldFocus(fieldName, fieldType);
        registration.onBlur(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        trackFieldBlur(fieldName, fieldType, e.target.value);
        registration.onBlur(e);
      },
    };
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Contact Information */}
      <div className="bg-black rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-brand-white mb-6">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-brand-white mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <Input
              id="email"
              type="email"
              {...registerWithTracking('email', 'email')}
              placeholder="john@example.com"
              className="w-full"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-brand-white mb-2">
              Phone Number (Optional)
            </label>
            <Input
              id="phone"
              type="tel"
              {...registerWithTracking('phone', 'tel')}
              placeholder="+41 12 345 67 89"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="bg-black rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-brand-white mb-6">Billing Information</h2>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-brand-white mb-2">
                First Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="firstName"
                type="text"
                {...registerWithTracking('firstName', 'text')}
                placeholder="John"
                className="w-full"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-brand-white mb-2">
                Last Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="lastName"
                type="text"
                {...registerWithTracking('lastName', 'text')}
                placeholder="Doe"
                className="w-full"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-brand-white mb-2">
                Company <span className="text-red-400">*</span>
              </label>
              <Input
                id="company"
                type="text"
                {...registerWithTracking('company', 'text')}
                placeholder="Acme Inc."
                className="w-full"
                aria-invalid={!!errors.company}
              />
              {errors.company && (
                <p className="text-red-400 text-sm mt-1">{errors.company.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-semibold text-brand-white mb-2">
                Job Title <span className="text-red-400">*</span>
              </label>
              <Input
                id="jobTitle"
                type="text"
                {...registerWithTracking('jobTitle', 'text')}
                placeholder="Software Engineer"
                className="w-full"
                aria-invalid={!!errors.jobTitle}
              />
              {errors.jobTitle && (
                <p className="text-red-400 text-sm mt-1">{errors.jobTitle.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="addressLine1" className="block text-sm font-semibold text-brand-white mb-2">
              Address Line 1 <span className="text-red-400">*</span>
            </label>
            <Input
              id="addressLine1"
              type="text"
              {...registerWithTracking('addressLine1', 'text')}
              placeholder="123 Main Street"
              className="w-full"
              aria-invalid={!!errors.addressLine1}
            />
            {errors.addressLine1 && (
              <p className="text-red-400 text-sm mt-1">{errors.addressLine1.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="addressLine2" className="block text-sm font-semibold text-brand-white mb-2">
              Address Line 2 (Optional)
            </label>
            <Input
              id="addressLine2"
              type="text"
              {...registerWithTracking('addressLine2', 'text')}
              placeholder="Apartment, suite, etc."
              className="w-full"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-brand-white mb-2">
                City <span className="text-red-400">*</span>
              </label>
              <Input
                id="city"
                type="text"
                {...registerWithTracking('city', 'text')}
                placeholder="Zurich"
                className="w-full"
                aria-invalid={!!errors.city}
              />
              {errors.city && (
                <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-brand-white mb-2">
                State/Province (Optional)
              </label>
              <Input
                id="state"
                type="text"
                {...registerWithTracking('state', 'text')}
                placeholder="ZH"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-semibold text-brand-white mb-2">
                Postal Code <span className="text-red-400">*</span>
              </label>
              <Input
                id="postalCode"
                type="text"
                {...registerWithTracking('postalCode', 'text')}
                placeholder="8001"
                className="w-full"
                aria-invalid={!!errors.postalCode}
              />
              {errors.postalCode && (
                <p className="text-red-400 text-sm mt-1">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-semibold text-brand-white mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <Input
              id="country"
              type="text"
              {...registerWithTracking('country', 'text')}
              placeholder="Switzerland"
              className="w-full"
              aria-invalid={!!errors.country}
            />
            {errors.country && (
              <p className="text-red-400 text-sm mt-1">{errors.country.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-black rounded-2xl p-6 md:p-8">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="agreeToTerms"
              type="checkbox"
              {...register('agreeToTerms')}
              className="mt-1 w-4 h-4 rounded border-gray-700 text-brand-primary focus:ring-brand-primary cursor-pointer"
              aria-invalid={!!errors.agreeToTerms}
            />
            <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
              I agree to the{' '}
              <Link href="/info/refund-policy" className="text-brand-primary underline hover:text-brand-dark">
                Refund Policy
              </Link>{' '}
              and understand that all ticket sales are subject to these terms. <span className="text-red-400">*</span>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-red-400 text-sm">{errors.agreeToTerms.message}</p>
          )}

          <div className="flex items-start gap-3">
            <input
              id="subscribeNewsletter"
              type="checkbox"
              {...register('subscribeNewsletter')}
              className="mt-1 w-4 h-4 rounded border-gray-700 text-brand-primary focus:ring-brand-primary cursor-pointer"
            />
            <label htmlFor="subscribeNewsletter" className="text-sm text-gray-300">
              Keep me updated about ZurichJS events and news
            </label>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-brand-white transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : `Pay ${totalAmount} ${currency}`}
        </Button>
      </div>
    </form>
  );
};
