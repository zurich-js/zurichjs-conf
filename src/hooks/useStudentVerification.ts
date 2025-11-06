/**
 * Student Verification Hook
 * Manages the state and logic for student/unemployed verification modal
 */

import { useState, useCallback } from 'react';

export interface UseStudentVerificationReturn {
  /**
   * Whether the verification modal is open
   */
  isModalOpen: boolean;
  /**
   * Open the verification modal with a specific price ID
   */
  openModal: (priceId: string) => void;
  /**
   * Close the verification modal
   */
  closeModal: () => void;
  /**
   * Handle successful verification submission
   */
  handleVerificationSubmit: (email: string, verificationId: string) => void;
  /**
   * Current price ID for verification
   */
  currentPriceId: string | null;
}

/**
 * Hook to manage student/unemployed verification modal state
 */
export const useStudentVerification = (): UseStudentVerificationReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPriceId, setCurrentPriceId] = useState<string | null>(null);

  const openModal = useCallback((priceId: string) => {
    setCurrentPriceId(priceId);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Don't clear priceId immediately to avoid flash during close animation
    setTimeout(() => setCurrentPriceId(null), 300);
  }, []);

  const handleVerificationSubmit = useCallback(
    (email: string, verificationId: string) => {
      // Close the modal
      setIsModalOpen(false);
      
      // Show success message
      alert(
        `Verification submitted successfully!\n\n` +
        `Verification ID: ${verificationId}\n\n` +
        `We'll review your request within 24 hours and send a payment link to ${email}.`
      );

      // Clear the price ID
      setTimeout(() => setCurrentPriceId(null), 300);
    },
    []
  );

  return {
    isModalOpen,
    openModal,
    closeModal,
    handleVerificationSubmit,
    currentPriceId,
  };
};

