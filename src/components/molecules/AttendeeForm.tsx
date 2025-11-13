/**
 * AttendeeForm molecule component
 * Form for collecting individual attendee information for each ticket
 */

import React from 'react';
import { attendeeInfoSchema, type AttendeeInfo } from '@/lib/validations/checkout';
import { Input, Button, Heading } from '@/components/atoms';
import type { CartItem as CartItemType } from '@/types/cart';
import {SectionContainer} from "@/components/organisms";

export interface AttendeeTicketFormProps {
  /**
   * Ticket index (0-based)
   */
  ticketIndex: number;
  /**
   * Ticket item title (e.g., "Conference Pass")
   */
  itemTitle: string;
  /**
   * Current attendee data
   */
  attendee: AttendeeInfo;
  /**
   * Validation errors for this ticket's fields
   */
  errors?: Record<string, string>;
  /**
   * Called when any field changes
   */
  onChange: (field: keyof AttendeeInfo, value: string) => void;
}

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
 * AttendeeTicketForm component
 * Displays and handles input for a single ticket's attendee information
 */
export const AttendeeTicketForm: React.FC<AttendeeTicketFormProps> = ({
  ticketIndex,
  itemTitle,
  attendee,
  errors = {},
  onChange,
}) => {
  const isPrimaryContact = ticketIndex === 0;

  return (
    <div
      className="bg-brand-gray-darkest p-5 rounded-2xl space-y-4"
      data-error={Object.keys(errors).length > 0 ? 'true' : 'false'}
    >
      {/* Ticket Header */}
      <div className="flex items-center justify-between mb-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">
              Ticket {ticketIndex + 1}
            </h3>
            {isPrimaryContact && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-gray-medium text-brand-gray-lightest rounded-full">
                Primary Contact
              </span>
            )}
          </div>
          <p className="text-sm text-brand-gray-light">{itemTitle}</p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`firstName-${ticketIndex}`}
            className="block text-sm font-semibold text-white mb-2"
          >
            First Name <span className="text-red-400">*</span>
          </label>
          <Input
            id={`firstName-${ticketIndex}`}
            type="text"
            value={attendee.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="John"
            className="w-full"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? `firstName-${ticketIndex}-error` : undefined}
          />
          {errors.firstName && (
            <p id={`firstName-${ticketIndex}-error`} className="text-red-400 text-sm mt-1">
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`lastName-${ticketIndex}`}
            className="block text-sm font-semibold text-white mb-2"
          >
            Last Name <span className="text-red-400">*</span>
          </label>
          <Input
            id={`lastName-${ticketIndex}`}
            type="text"
            value={attendee.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Doe"
            className="w-full"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? `lastName-${ticketIndex}-error` : undefined}
          />
          {errors.lastName && (
            <p id={`lastName-${ticketIndex}-error`} className="text-red-400 text-sm mt-1">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email Field */}
      <div>
        <label
          htmlFor={`email-${ticketIndex}`}
          className="block text-sm font-semibold text-white mb-2"
        >
          Email Address <span className="text-red-400">*</span>
        </label>
        <Input
          id={`email-${ticketIndex}`}
          type="email"
          value={attendee.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="john@example.com"
          className="w-full"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `email-${ticketIndex}-error` : undefined}
        />
        {errors.email && (
          <p id={`email-${ticketIndex}-error`} className="text-red-400 text-sm mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Company and Job Title Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`company-${ticketIndex}`}
            className="block text-sm font-semibold text-white mb-2"
          >
            Company (Optional)
          </label>
          <Input
            id={`company-${ticketIndex}`}
            type="text"
            value={attendee.company}
            onChange={(e) => onChange('company', e.target.value)}
            placeholder="Acme Inc."
            className="w-full"
          />
        </div>

        <div>
          <label
            htmlFor={`jobTitle-${ticketIndex}`}
            className="block text-sm font-semibold text-white mb-2"
          >
            Job Title (Optional)
          </label>
          <Input
            id={`jobTitle-${ticketIndex}`}
            type="text"
            value={attendee.jobTitle}
            onChange={(e) => onChange('jobTitle', e.target.value)}
            placeholder="Software Engineer"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

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
    <SectionContainer>
      <Heading level="h1" className="text-xl font-bold text-brand-white mb-6">Attendee Information</Heading>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="">
          <p className="text-sm text-brand-gray-light mb-3">
            Please provide the name and email for each ticket. Each attendee will receive their individual ticket via email.<br/>
            You&#39;ll get a chance to review and fill <b>billing details</b> at the Payment step.
          </p>
        </div>

      {cartItems.map((item) => {
        const itemTickets = [];
        for (let i = 0; i < item.quantity; i++) {
          const currentIndex = ticketIndex++;
          itemTickets.push(
            <AttendeeTicketForm
              key={currentIndex}
              ticketIndex={currentIndex}
              itemTitle={item.title}
              attendee={attendees[currentIndex]}
              errors={errors[currentIndex]}
              onChange={(field, value) => handleAttendeeChange(currentIndex, field, value)}
            />
          );
        }
        return itemTickets;
      })}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="text-brand-gray-light hover:text-brand-white transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <Button
            type="submit"
            variant="primary"
            className="bg-brand-primary text-black hover:bg-brand-dark font-bold cursor-pointer px-12 py-4 text-lg"
          >
            Continue to Payment
          </Button>
        </div>
      </form>
    </SectionContainer>
  );
};
