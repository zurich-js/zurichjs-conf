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

export interface AttendeeFormSubmitResult {
  /** Flat list for ticket items, in cart order. */
  attendees: AttendeeInfo[];
  /** Per-workshop attendees keyed by workshopId, ordered by seat_index. */
  workshopAttendees: Record<string, AttendeeInfo[]>;
}

export interface AttendeeFormProps {
  /**
   * Cart items to collect attendees for (tickets + workshops).
   */
  cartItems: CartItemType[];
  /**
   * Initial ticket-attendee data (for editing).
   */
  initialAttendees?: AttendeeInfo[];
  /**
   * Initial workshop-attendee data keyed by workshopId (for editing).
   */
  initialWorkshopAttendees?: Record<string, AttendeeInfo[]>;
  /**
   * Called when form is submitted with valid data.
   */
  onSubmit: (result: AttendeeFormSubmitResult) => void;
  /**
   * Called when user clicks back button.
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
/**
 * Maps each attendee slot to the cart item it belongs to so we can split
 * results back into ticket vs workshop buckets on submit.
 */
interface AttendeeSlot {
  itemId: string;
  itemTitle: string;
  kind: 'ticket' | 'workshop';
  workshopId: string | null;
  /** 0-based index within this cart item (i.e. this workshop's seat_index). */
  positionInItem: number;
}

function buildSlots(cartItems: CartItemType[]): AttendeeSlot[] {
  const slots: AttendeeSlot[] = [];
  for (const item of cartItems) {
    const kind = item.kind === 'workshop' ? 'workshop' : 'ticket';
    for (let i = 0; i < item.quantity; i += 1) {
      slots.push({
        itemId: item.id,
        itemTitle: item.title,
        kind,
        workshopId: item.workshopId ?? null,
        positionInItem: i,
      });
    }
  }
  return slots;
}

function emptyAttendee(): AttendeeInfo {
  return { firstName: '', lastName: '', email: '', company: '', jobTitle: '' };
}

export const AttendeeForm: React.FC<AttendeeFormProps> = ({
  cartItems,
  initialAttendees = [],
  initialWorkshopAttendees = {},
  onSubmit,
  onBack,
}) => {
  const slots = React.useMemo(() => buildSlots(cartItems), [cartItems]);

  // Seed the flat form state from initial values, splitting by slot kind.
  const [attendees, setAttendees] = React.useState<AttendeeInfo[]>(() => {
    let ticketCursor = 0;
    return slots.map((slot) => {
      if (slot.kind === 'ticket') {
        const seed = initialAttendees[ticketCursor];
        ticketCursor += 1;
        return seed ?? emptyAttendee();
      }
      if (slot.workshopId) {
        const seed = initialWorkshopAttendees[slot.workshopId]?.[slot.positionInItem];
        if (seed) return seed;
      }
      return emptyAttendee();
    });
  });

  const [errors, setErrors] = React.useState<Record<number, Record<string, string>>>({});

  const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);

    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      const firstErrorElement = document.querySelector('[data-error="true"]');
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Bucket the flat list back into tickets vs per-workshop attendees.
    const ticketAttendees: AttendeeInfo[] = [];
    const workshopAttendees: Record<string, AttendeeInfo[]> = {};
    slots.forEach((slot, index) => {
      const attendee = attendees[index];
      if (slot.kind === 'ticket') {
        ticketAttendees.push(attendee);
      } else if (slot.workshopId) {
        if (!workshopAttendees[slot.workshopId]) {
          workshopAttendees[slot.workshopId] = [];
        }
        workshopAttendees[slot.workshopId].push(attendee);
      }
    });

    onSubmit({ attendees: ticketAttendees, workshopAttendees });
  };

  return (
    <SectionContainer>
      <Heading level="h1" className="text-xl font-bold text-brand-white mb-6">Attendee Information</Heading>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="">
          <p className="text-sm text-brand-gray-light mb-3">
            Please provide the name and email for each seat. Each attendee will receive their own confirmation.<br/>
            You&#39;ll get a chance to review and fill <b>billing details</b> at the Payment step.
          </p>
        </div>

        {slots.map((slot, index) => (
          <AttendeeTicketForm
            key={`${slot.itemId}-${slot.positionInItem}`}
            ticketIndex={index}
            itemTitle={
              slot.kind === 'workshop'
                ? `Workshop · ${slot.itemTitle} · Seat ${slot.positionInItem + 1}`
                : slot.itemTitle
            }
            attendee={attendees[index]}
            errors={errors[index]}
            onChange={(field, value) => handleAttendeeChange(index, field, value)}
          />
        ))}

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
