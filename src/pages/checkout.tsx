/**
 * Checkout Page
 * Complete checkout flow with customer information form and order summary
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { Button, Input, Heading } from '@/components/atoms';
import { CartSummary, VoucherInput } from '@/components/molecules';
import { calculateOrderSummary } from '@/lib/cart';
import type { CheckoutFormData } from '@/types/cart';

/**
 * Checkout page component
 */
const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { cart, applyVoucher, removeVoucher } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Switzerland',
    phone: '',
    agreeToTerms: false,
    subscribeNewsletter: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const orderSummary = calculateOrderSummary(cart);
  const isEmpty = cart.items.length === 0;

  // Redirect if cart is empty
  useEffect(() => {
    if (isEmpty) {
      router.push('/#tickets');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  // Handle form input changes
  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Address validation
    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Address is required';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.postalCode.trim()) {
      errors.postalCode = 'Postal code is required';
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }

    // Terms agreement
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart,
          customerInfo: formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (isEmpty) {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>Checkout - ZurichJS Conference 2026</title>
        <meta name="description" content="Complete your ticket purchase for ZurichJS Conference 2026" />
      </Head>

      <div className="min-h-screen bg-surface-section py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Heading level="h1" variant="light" className="text-white mb-4">
              Checkout
            </Heading>
            <p className="text-gray-400 text-lg">
              Complete your information to secure your tickets
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Error message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                    {error}
                  </div>
                )}

                {/* Contact Information */}
                <div className="bg-black rounded-2xl p-6 md:p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="john@example.com"
                        className="w-full"
                        aria-invalid={!!validationErrors.email}
                      />
                      {validationErrors.email && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-white mb-2">
                        Phone Number (Optional)
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+41 12 345 67 89"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="bg-black rounded-2xl p-6 md:p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Billing Information</h2>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-semibold text-white mb-2">
                          First Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          id="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="John"
                          className="w-full"
                          aria-invalid={!!validationErrors.firstName}
                        />
                        {validationErrors.firstName && (
                          <p className="text-red-400 text-sm mt-1">{validationErrors.firstName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-semibold text-white mb-2">
                          Last Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          id="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Doe"
                          className="w-full"
                          aria-invalid={!!validationErrors.lastName}
                        />
                        {validationErrors.lastName && (
                          <p className="text-red-400 text-sm mt-1">{validationErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-semibold text-white mb-2">
                        Company (Optional)
                      </label>
                      <Input
                        id="company"
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Acme Inc."
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label htmlFor="addressLine1" className="block text-sm font-semibold text-white mb-2">
                        Address Line 1 <span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="addressLine1"
                        type="text"
                        value={formData.addressLine1}
                        onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                        placeholder="123 Main Street"
                        className="w-full"
                        aria-invalid={!!validationErrors.addressLine1}
                      />
                      {validationErrors.addressLine1 && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.addressLine1}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="addressLine2" className="block text-sm font-semibold text-white mb-2">
                        Address Line 2 (Optional)
                      </label>
                      <Input
                        id="addressLine2"
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                        placeholder="Apartment, suite, etc."
                        className="w-full"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-white mb-2">
                          City <span className="text-red-400">*</span>
                        </label>
                        <Input
                          id="city"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Zurich"
                          className="w-full"
                          aria-invalid={!!validationErrors.city}
                        />
                        {validationErrors.city && (
                          <p className="text-red-400 text-sm mt-1">{validationErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-semibold text-white mb-2">
                          Postal Code <span className="text-red-400">*</span>
                        </label>
                        <Input
                          id="postalCode"
                          type="text"
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="8001"
                          className="w-full"
                          aria-invalid={!!validationErrors.postalCode}
                        />
                        {validationErrors.postalCode && (
                          <p className="text-red-400 text-sm mt-1">{validationErrors.postalCode}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-semibold text-white mb-2">
                        Country <span className="text-red-400">*</span>
                      </label>
                      <Input
                        id="country"
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="Switzerland"
                        className="w-full"
                        aria-invalid={!!validationErrors.country}
                      />
                      {validationErrors.country && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.country}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Newsletter */}
                <div className="bg-black rounded-2xl p-6 md:p-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <input
                      id="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                      className="mt-1 w-4 h-4 bg-gray-800 border-gray-700 rounded text-brand-primary focus:ring-brand-primary focus:ring-offset-black"
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
                      I agree to the{' '}
                      <Link href="/terms" className="text-brand-primary underline hover:text-brand-dark">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="/refund-policy" className="text-brand-primary underline hover:text-brand-dark">
                        Refund Policy
                      </Link>{' '}
                      <span className="text-red-400">*</span>
                    </label>
                  </div>
                  {validationErrors.agreeToTerms && (
                    <p className="text-red-400 text-sm">{validationErrors.agreeToTerms}</p>
                  )}

                  <div className="flex items-start gap-3">
                    <input
                      id="subscribeNewsletter"
                      type="checkbox"
                      checked={formData.subscribeNewsletter}
                      onChange={(e) => handleInputChange('subscribeNewsletter', e.target.checked)}
                      className="mt-1 w-4 h-4 bg-gray-800 border-gray-700 rounded text-brand-primary focus:ring-brand-primary focus:ring-offset-black"
                    />
                    <label htmlFor="subscribeNewsletter" className="text-sm text-gray-300">
                      Subscribe to our newsletter for updates about future events
                    </label>
                  </div>
                </div>

                {/* Submit Button - Mobile */}
                <div className="lg:hidden">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full bg-brand-primary text-black hover:bg-brand-dark font-bold"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Complete Purchase'}
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Order Summary Sidebar */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="sticky top-8 space-y-6">
                {/* Order Summary */}
                <div className="bg-black rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
                  
                  {/* Items */}
                  <div className="space-y-3 mb-6">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">
                          {item.title} × {item.quantity}
                        </span>
                        <span className="text-white font-semibold">
                          {(item.price * item.quantity).toFixed(2)} {item.currency}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Voucher Input */}
                  <div className="mb-6">
                    <VoucherInput onApply={applyVoucher} />
                  </div>

                  {/* Summary */}
                  <CartSummary
                    summary={orderSummary}
                    showTax={true}
                    showDiscount={true}
                    voucherCode={cart.voucherCode}
                    onRemoveVoucher={removeVoucher}
                  />
                </div>

                {/* Submit Button - Desktop */}
                <div className="hidden lg:block">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full bg-brand-primary text-black hover:bg-brand-dark font-bold"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? 'Processing...' : 'Complete Purchase'}
                  </Button>
                </div>

                {/* Security Badge */}
                <div className="bg-black rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure checkout powered by Stripe
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;

