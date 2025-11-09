/**
 * AttendeeForm molecule component
 * Form for collecting individual attendee information for each ticket
 */

import React from 'react';
import { attendeeInfoSchema, type AttendeeInfo } from '@/lib/validations/checkout';
import { Input, Button } from '@/components/atoms';
import type { CartItem as CartItemType } from '@/types/cart';

export interface AttendeeFormProps {
  /**
   * Cart items to collect attendees for
   */
  cartItems: CartItemType[];
  /**
   * Initial attendee data (for editing)
   */
  initialAttendees?: AttendeeInfo[];
  /**
   * Called when form is submitted with valid data
   */
  onSubmit: (attendees: AttendeeInfo[]) => void;
  /**
   * Called when user clicks back button
   */
  onBack: () => void;
}

/**
 * AttendeeForm component
 * Collects attendee information for each ticket in the cart
 */
export const AttendeeForm: React.FC<AttendeeFormProps> = ({
  cartItems,
  initialAttendees = [],
  onSubmit,
  onBack,
}) => {
  // Calculate total number of tickets
  const totalTickets = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Create array of attendee forms
  const [attendees, setAttendees] = React.useState<AttendeeInfo[]>(() => {
    // Initialize with existing data or create empty forms
    if (initialAttendees.length > 0) {
      return initialAttendees;
    }

    // Create empty attendee objects (one for each ticket)
    const emptyAttendees: AttendeeInfo[] = [];
    for (let i = 0; i < totalTickets; i++) {
      emptyAttendees.push({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        jobTitle: '',
      });
    }
    return emptyAttendees;
  });

  const [errors, setErrors] = React.useState<Record<number, Record<string, string>>>({});

  const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = {
      ...newAttendees[index],
      [field]: value,
    };
    setAttendees(newAttendees);

    // Clear error for this field
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all attendees
    const validationErrors: Record<number, Record<string, string>> = {};
    let hasErrors = false;

    attendees.forEach((attendee, index) => {
      const result = attendeeInfoSchema.safeParse(attendee);
      if (!result.success) {
        validationErrors[index] = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          validationErrors[index][field] = issue.message;
        });
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrorElement = document.querySelector('[data-error="true"]');
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onSubmit(attendees);
  };

  // Group tickets by item for display
  let ticketIndex = 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-black/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Attendee Information</h2>
            <p className="text-sm text-gray-400 mb-3">
              Please provide the name and email for each ticket. Each attendee will receive their individual ticket via email.
            </p>
            <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-brand-primary">Note:</span> The first attendee will be used for billing information and will receive an order summary along with their ticket.
              </p>
            </div>
          </div>
        </div>
      </div>

      {cartItems.map((item) => {
        const itemTickets = [];
        for (let i = 0; i < item.quantity; i++) {
          const currentIndex = ticketIndex++;
          itemTickets.push(
            <div
              key={currentIndex}
              className="bg-black rounded-2xl p-6 space-y-4"
              data-error={errors[currentIndex] ? 'true' : 'false'}
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      Ticket {currentIndex + 1}
                    </h3>
                    {currentIndex === 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-primary text-black rounded-full">
                        Primary / Billing Contact
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{item.title}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`firstName-${currentIndex}`}
                    className="block text-sm font-semibold text-white mb-2"
                  >
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id={`firstName-${currentIndex}`}
                    type="text"
                    value={attendees[currentIndex]?.firstName || ''}
                    onChange={(e) => handleAttendeeChange(currentIndex, 'firstName', e.target.value)}
                    placeholder="John"
                    className="w-full"
                    aria-invalid={!!errors[currentIndex]?.firstName}
                  />
                  {errors[currentIndex]?.firstName && (
                    <p className="text-red-400 text-sm mt-1">{errors[currentIndex].firstName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`lastName-${currentIndex}`}
                    className="block text-sm font-semibold text-white mb-2"
                  >
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id={`lastName-${currentIndex}`}
                    type="text"
                    value={attendees[currentIndex]?.lastName || ''}
                    onChange={(e) => handleAttendeeChange(currentIndex, 'lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full"
                    aria-invalid={!!errors[currentIndex]?.lastName}
                  />
                  {errors[currentIndex]?.lastName && (
                    <p className="text-red-400 text-sm mt-1">{errors[currentIndex].lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor={`email-${currentIndex}`}
                  className="block text-sm font-semibold text-white mb-2"
                >
                  Email Address <span className="text-red-400">*</span>
                </label>
                <Input
                  id={`email-${currentIndex}`}
                  type="email"
                  value={attendees[currentIndex]?.email || ''}
                  onChange={(e) => handleAttendeeChange(currentIndex, 'email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full"
                  aria-invalid={!!errors[currentIndex]?.email}
                />
                {errors[currentIndex]?.email && (
                  <p className="text-red-400 text-sm mt-1">{errors[currentIndex].email}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`company-${currentIndex}`}
                    className="block text-sm font-semibold text-white mb-2"
                  >
                    Company (Optional)
                  </label>
                  <Input
                    id={`company-${currentIndex}`}
                    type="text"
                    value={attendees[currentIndex]?.company || ''}
                    onChange={(e) => handleAttendeeChange(currentIndex, 'company', e.target.value)}
                    placeholder="Acme Inc."
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`jobTitle-${currentIndex}`}
                    className="block text-sm font-semibold text-white mb-2"
                  >
                    Job Title (Optional)
                  </label>
                  <Input
                    id={`jobTitle-${currentIndex}`}
                    type="text"
                    value={attendees[currentIndex]?.jobTitle || ''}
                    onChange={(e) => handleAttendeeChange(currentIndex, 'jobTitle', e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          );
        }
        return itemTickets;
      })}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer px-12 py-4 text-lg"
        >
          Continue to Payment
        </Button>
      </div>
    </form>
  );
};
